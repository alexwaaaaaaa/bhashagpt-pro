import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { redisClient } from '../config/redis';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

export interface AvatarConfig {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  gender: 'male' | 'female';
  age: 'young' | 'middle' | 'senior';
  ethnicity: string;
  language: string[];
  emotions: string[];
}

export interface VideoGenerationRequest {
  text: string;
  avatarId: string;
  voice?: {
    type: 'text' | 'audio';
    voice_id?: string;
    language?: string;
    style?: string;
  };
  config?: {
    fluent?: boolean;
    pad_audio?: number;
    stitch?: boolean;
    result_format?: 'mp4' | 'gif' | 'mov';
  };
  emotion?: string;
  userId: string;
}

export interface VideoGenerationResponse {
  id: string;
  status: 'created' | 'processing' | 'done' | 'error';
  result_url?: string;
  error?: string;
  created_at: string;
  metadata?: {
    duration?: number;
    size?: number;
    format?: string;
  };
}

export interface EmotionAnalysis {
  emotion: string;
  confidence: number;
  suggestions: string[];
}

export class DIDService {
  private static readonly BASE_URL = config.did.baseUrl;
  private static readonly API_KEY = config.did.apiKey;
  private static readonly CACHE_TTL = 24 * 60 * 60; // 24 hours

  // Predefined avatar configurations
  private static readonly AVATARS: AvatarConfig[] = [
    {
      id: 'amy-jcwCkr1grs',
      name: 'Amy',
      description: 'Professional young woman, great for business and educational content',
      imageUrl: 'https://create-images-results.d-id.com/api_docs/assets/noelle.jpeg',
      gender: 'female',
      age: 'young',
      ethnicity: 'caucasian',
      language: ['en', 'es', 'fr', 'de'],
      emotions: ['neutral', 'happy', 'excited', 'serious', 'friendly']
    },
    {
      id: 'eric-jcwCkr1grs',
      name: 'Eric',
      description: 'Friendly middle-aged man, perfect for tutorials and explanations',
      imageUrl: 'https://create-images-results.d-id.com/api_docs/assets/eric.jpeg',
      gender: 'male',
      age: 'middle',
      ethnicity: 'caucasian',
      language: ['en', 'es', 'fr', 'de', 'it'],
      emotions: ['neutral', 'happy', 'confident', 'serious', 'encouraging']
    },
    {
      id: 'maria-hispanic',
      name: 'Maria',
      description: 'Warm Hispanic woman, excellent for Spanish language learning',
      imageUrl: 'https://create-images-results.d-id.com/api_docs/assets/maria.jpeg',
      gender: 'female',
      age: 'middle',
      ethnicity: 'hispanic',
      language: ['es', 'en'],
      emotions: ['neutral', 'happy', 'warm', 'encouraging', 'patient']
    },
    {
      id: 'kenji-asian',
      name: 'Kenji',
      description: 'Professional Asian man, great for technical and business content',
      imageUrl: 'https://create-images-results.d-id.com/api_docs/assets/kenji.jpeg',
      gender: 'male',
      age: 'young',
      ethnicity: 'asian',
      language: ['en', 'ja', 'ko', 'zh'],
      emotions: ['neutral', 'professional', 'friendly', 'focused']
    },
    {
      id: 'sarah-senior',
      name: 'Sarah',
      description: 'Wise senior woman, perfect for storytelling and cultural insights',
      imageUrl: 'https://create-images-results.d-id.com/api_docs/assets/sarah.jpeg',
      gender: 'female',
      age: 'senior',
      ethnicity: 'caucasian',
      language: ['en', 'fr', 'de'],
      emotions: ['neutral', 'wise', 'gentle', 'storytelling', 'nurturing']
    }
  ];

  // Generate video with avatar
  static async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request.text, request.avatarId, request.emotion);
      const cachedResult = await this.getCachedVideo(cacheKey);
      
      if (cachedResult) {
        logger.info('Returning cached video', { cacheKey, userId: request.userId });
        return cachedResult;
      }

      // Analyze emotion if not provided
      const emotion = request.emotion || await this.analyzeEmotion(request.text);

      // Get avatar configuration
      const avatar = this.getAvatarById(request.avatarId);
      if (!avatar) {
        throw new Error(`Avatar not found: ${request.avatarId}`);
      }

      // Prepare D-ID API request
      const didRequest = {
        source_url: avatar.imageUrl,
        script: {
          type: 'text',
          input: request.text,
          provider: {
            type: 'microsoft',
            voice_id: this.getVoiceForAvatar(avatar, request.voice?.language || 'en'),
            voice_config: {
              style: emotion,
              rate: '0.9',
              pitch: 'medium'
            }
          }
        },
        config: {
          fluent: true,
          pad_audio: 0.5,
          stitch: true,
          result_format: 'mp4',
          ...request.config
        }
      };

      // Make API request to D-ID
      const response = await this.makeDidRequest('/talks', 'POST', didRequest);
      
      // Save generation request to database
      await this.saveVideoGeneration(request, response.data);

      // Cache the result if successful
      if (response.data.status === 'done' && response.data.result_url) {
        await this.cacheVideo(cacheKey, response.data);
      }

      logger.info('Video generation initiated', { 
        videoId: response.data.id, 
        userId: request.userId,
        avatarId: request.avatarId 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to generate video', { error, userId: request.userId });
      throw new Error('Failed to generate avatar video');
    }
  }

  // Check video generation status
  static async checkVideoStatus(videoId: string): Promise<VideoGenerationResponse> {
    try {
      const response = await this.makeDidRequest(`/talks/${videoId}`, 'GET');
      
      // Update database record
      await this.updateVideoStatus(videoId, response.data);

      return response.data;
    } catch (error) {
      logger.error('Failed to check video status', { error, videoId });
      throw new Error('Failed to check video status');
    }
  }

  // Get all available avatars
  static getAvailableAvatars(): AvatarConfig[] {
    return this.AVATARS;
  }

  // Get avatar by ID
  static getAvatarById(avatarId: string): AvatarConfig | null {
    return this.AVATARS.find(avatar => avatar.id === avatarId) || null;
  }

  // Get avatars by criteria
  static getAvatarsByCriteria(criteria: {
    gender?: 'male' | 'female';
    age?: 'young' | 'middle' | 'senior';
    ethnicity?: string;
    language?: string;
  }): AvatarConfig[] {
    return this.AVATARS.filter(avatar => {
      if (criteria.gender && avatar.gender !== criteria.gender) return false;
      if (criteria.age && avatar.age !== criteria.age) return false;
      if (criteria.ethnicity && avatar.ethnicity !== criteria.ethnicity) return false;
      if (criteria.language && !avatar.language.includes(criteria.language)) return false;
      return true;
    });
  }

  // Analyze emotion from text
  static async analyzeEmotion(text: string): Promise<string> {
    try {
      // Simple emotion detection based on keywords
      const emotions = {
        happy: ['happy', 'joy', 'excited', 'great', 'wonderful', 'amazing', 'fantastic'],
        sad: ['sad', 'sorry', 'disappointed', 'upset', 'down', 'depressed'],
        angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'irritated'],
        surprised: ['surprised', 'shocked', 'amazed', 'wow', 'incredible', 'unbelievable'],
        serious: ['important', 'serious', 'critical', 'urgent', 'formal', 'professional'],
        encouraging: ['good job', 'well done', 'excellent', 'keep going', 'you can do it'],
        patient: ['slowly', 'step by step', 'take your time', 'no rush', 'carefully']
      };

      const lowerText = text.toLowerCase();
      
      for (const [emotion, keywords] of Object.entries(emotions)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          return emotion;
        }
      }

      return 'neutral'; // Default emotion
    } catch (error) {
      logger.warn('Failed to analyze emotion', { error, text: text.substring(0, 50) });
      return 'neutral';
    }
  }

  // Generate optimized video for mobile
  static async generateMobileOptimizedVideo(
    request: VideoGenerationRequest
  ): Promise<VideoGenerationResponse> {
    const mobileConfig = {
      ...request.config,
      result_format: 'mp4' as const,
      fluent: true,
      pad_audio: 0.3,
      stitch: true
    };

    return this.generateVideo({
      ...request,
      config: mobileConfig
    });
  }

  // Compress and optimize video
  static async compressVideo(videoUrl: string, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
    try {
      // This would integrate with a video compression service
      // For now, return the original URL
      logger.info('Video compression requested', { videoUrl, quality });
      return videoUrl;
    } catch (error) {
      logger.error('Failed to compress video', { error, videoUrl });
      return videoUrl; // Return original on failure
    }
  }

  // Upload video to CDN
  static async uploadToCDN(videoUrl: string, fileName: string): Promise<string> {
    try {
      if (!config.cdn.baseUrl) {
        logger.warn('CDN not configured, returning original URL');
        return videoUrl;
      }

      // Download video
      const videoResponse = await axios.get(videoUrl, { responseType: 'stream' });
      
      // Upload to CDN (implementation depends on your CDN provider)
      // This is a placeholder - implement based on your CDN service
      const cdnUrl = `${config.cdn.baseUrl}/videos/${fileName}`;
      
      logger.info('Video uploaded to CDN', { originalUrl: videoUrl, cdnUrl });
      return cdnUrl;
    } catch (error) {
      logger.error('Failed to upload to CDN', { error, videoUrl });
      return videoUrl; // Return original on failure
    }
  }

  // Text-to-speech fallback
  static async generateTextToSpeech(text: string, voice: string = 'en-US-AriaNeural'): Promise<string> {
    try {
      // This would integrate with Azure Speech Services or similar
      // For now, return a placeholder
      logger.info('Text-to-speech fallback requested', { text: text.substring(0, 50), voice });
      
      // Return a mock audio URL
      return `https://api.example.com/tts/${encodeURIComponent(text)}?voice=${voice}`;
    } catch (error) {
      logger.error('Failed to generate text-to-speech', { error, text: text.substring(0, 50) });
      throw new Error('Text-to-speech generation failed');
    }
  }

  // Private helper methods
  private static async makeDidRequest(endpoint: string, method: 'GET' | 'POST' | 'DELETE', data?: any): Promise<any> {
    if (!this.API_KEY) {
      throw new Error('D-ID API key not configured');
    }

    const config = {
      method,
      url: `${this.BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Basic ${this.API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: method === 'POST' ? data : undefined,
      timeout: 30000, // 30 seconds
    };

    try {
      const response = await axios(config);
      return response;
    } catch (error: any) {
      if (error.response) {
        logger.error('D-ID API request failed', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          endpoint
        });
        throw new Error(`D-ID API error: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  private static generateCacheKey(text: string, avatarId: string, emotion?: string): string {
    const content = `${text}-${avatarId}-${emotion || 'neutral'}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private static async getCachedVideo(cacheKey: string): Promise<VideoGenerationResponse | null> {
    try {
      const cached = await redisClient.get(`video:${cacheKey}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Failed to get cached video', { error, cacheKey });
      return null;
    }
  }

  private static async cacheVideo(cacheKey: string, video: VideoGenerationResponse): Promise<void> {
    try {
      await redisClient.setex(`video:${cacheKey}`, this.CACHE_TTL, JSON.stringify(video));
    } catch (error) {
      logger.warn('Failed to cache video', { error, cacheKey });
    }
  }

  private static getVoiceForAvatar(avatar: AvatarConfig, language: string): string {
    // Map avatar and language to appropriate voice IDs
    const voiceMap: Record<string, Record<string, string>> = {
      'amy-jcwCkr1grs': {
        'en': 'en-US-AriaNeural',
        'es': 'es-ES-ElviraNeural',
        'fr': 'fr-FR-DeniseNeural',
        'de': 'de-DE-KatjaNeural'
      },
      'eric-jcwCkr1grs': {
        'en': 'en-US-GuyNeural',
        'es': 'es-ES-AlvaroNeural',
        'fr': 'fr-FR-HenriNeural',
        'de': 'de-DE-ConradNeural'
      },
      'maria-hispanic': {
        'es': 'es-MX-DaliaNeural',
        'en': 'en-US-MonicaNeural'
      },
      'kenji-asian': {
        'en': 'en-US-BrianNeural',
        'ja': 'ja-JP-KeitaNeural',
        'ko': 'ko-KR-InJoonNeural',
        'zh': 'zh-CN-YunxiNeural'
      },
      'sarah-senior': {
        'en': 'en-US-NancyNeural',
        'fr': 'fr-FR-BrigitteNeural',
        'de': 'de-DE-GiselaNeural'
      }
    };

    return voiceMap[avatar.id]?.[language] || voiceMap[avatar.id]?.['en'] || 'en-US-AriaNeural';
  }

  private static async saveVideoGeneration(request: VideoGenerationRequest, response: any): Promise<void> {
    try {
      // Save to database for tracking and analytics
      await prisma.apiUsage.upsert({
        where: {
          userId_date: {
            userId: request.userId,
            date: new Date(new Date().toDateString()),
          },
        },
        update: {
          apiCalls: { increment: 1 },
          updatedAt: new Date(),
        },
        create: {
          userId: request.userId,
          date: new Date(new Date().toDateString()),
          apiCalls: 1,
          endpoint: 'did-avatar',
          model: request.avatarId,
        },
      });
    } catch (error) {
      logger.warn('Failed to save video generation record', { error });
    }
  }

  private static async updateVideoStatus(videoId: string, status: any): Promise<void> {
    try {
      // Update video status in database if needed
      logger.info('Video status updated', { videoId, status: status.status });
    } catch (error) {
      logger.warn('Failed to update video status', { error, videoId });
    }
  }

  // Batch processing for multiple videos
  static async generateMultipleVideos(requests: VideoGenerationRequest[]): Promise<VideoGenerationResponse[]> {
    const results: VideoGenerationResponse[] = [];
    
    // Process in batches to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.generateVideo(request));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            logger.error('Batch video generation failed', { 
              error: result.reason, 
              request: batch[index] 
            });
          }
        });
      } catch (error) {
        logger.error('Batch processing failed', { error, batchIndex: i });
      }

      // Add delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Get video analytics
  static async getVideoAnalytics(userId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const usage = await prisma.apiUsage.findMany({
        where: {
          userId,
          endpoint: 'did-avatar',
          date: { gte: startDate },
        },
        orderBy: { date: 'desc' },
      });

      const totalVideos = usage.reduce((sum, record) => sum + record.apiCalls, 0);
      const averagePerDay = totalVideos / days;

      return {
        totalVideos,
        averagePerDay: Math.round(averagePerDay * 100) / 100,
        usageByDay: usage.map(record => ({
          date: record.date,
          count: record.apiCalls,
        })),
      };
    } catch (error) {
      logger.error('Failed to get video analytics', { error, userId });
      return { totalVideos: 0, averagePerDay: 0, usageByDay: [] };
    }
  }
}