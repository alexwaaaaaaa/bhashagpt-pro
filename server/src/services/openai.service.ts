import OpenAI from 'openai';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionParams {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  userId?: string;
  language?: string;
  learningLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  prompt?: string;
  temperature?: number;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

export interface ChatChunk {
  content: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class OpenAIService {
  private client: OpenAI;
  private redis = redisClient;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate system prompt based on language and learning level
   */
  private generateSystemPrompt(language: string, learningLevel: string): string {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'hi': 'Hindi',
      'bn': 'Bengali',
      'te': 'Telugu',
      'ta': 'Tamil',
      'gu': 'Gujarati',
      'mr': 'Marathi',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'pa': 'Punjabi',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean'
    };

    const targetLanguage = languageNames[language] || 'English';

    const basePrompt = `You are BhashaGPT, a friendly and encouraging AI language tutor specializing in ${targetLanguage}. Your personality is warm, patient, and culturally aware.

CORE PRINCIPLES:
- Always be encouraging and positive
- Provide gentle corrections without being harsh
- Use culturally appropriate examples and references
- Adapt your teaching style to the user's learning level
- Include pronunciation tips when helpful
- Celebrate progress and milestones

LEARNING LEVEL: ${learningLevel}`;

    const levelSpecificPrompts = {
      beginner: `
- Use simple vocabulary and short sentences
- Explain grammar concepts clearly with examples
- Provide literal translations when helpful
- Focus on practical, everyday conversations
- Repeat key phrases for reinforcement`,
      intermediate: `
- Use moderate vocabulary with occasional new words
- Explain nuanced grammar and usage
- Provide cultural context for expressions
- Encourage longer conversations
- Correct mistakes while maintaining flow`,
      advanced: `
- Use sophisticated vocabulary and complex structures
- Discuss cultural nuances and idiomatic expressions
- Engage in debates and abstract topics
- Provide subtle corrections and alternatives
- Challenge the user with advanced concepts`
    };

    return basePrompt + (levelSpecificPrompts[learningLevel as keyof typeof levelSpecificPrompts] || levelSpecificPrompts.intermediate);
  }

  /**
   * Create streaming chat completion
   */
  async *createChatCompletion(params: ChatCompletionParams): AsyncIterable<ChatChunk> {
    try {
      const {
        messages,
        model = 'gpt-4',
        temperature = 0.7,
        maxTokens = 2000,
        stream = true,
        userId,
        language = 'en',
        learningLevel = 'intermediate'
      } = params;

      // Add system prompt if not present
      const systemPrompt = this.generateSystemPrompt(language, learningLevel);
      const messagesWithSystem = messages[0]?.role === 'system' 
        ? messages 
        : [{ role: 'system' as const, content: systemPrompt }, ...messages];

      // Log request for monitoring
      logger.info('OpenAI chat completion request', {
        userId,
        model,
        messageCount: messagesWithSystem.length,
        language,
        learningLevel,
      });

      // Track usage
      if (userId) {
        await this.trackUsage(userId, 'chat', messagesWithSystem.length);
      }

      const completion = await this.client.chat.completions.create({
        model,
        messages: messagesWithSystem,
        temperature,
        max_tokens: maxTokens,
        stream,
      });

      if (!stream) {
        // Non-streaming response
        const response = completion as OpenAI.Chat.Completions.ChatCompletion;
        yield {
          content: response.choices[0]?.message?.content || '',
          done: true,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
        };
        return;
      }

      // Streaming response
      const completionStream = completion as any;
      let totalContent = '';

      for await (const chunk of completionStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        totalContent += content;

        if (content) {
          yield {
            content,
            done: false,
          };
        }

        // Check if stream is finished
        if (chunk.choices[0]?.finish_reason) {
          yield {
            content: '',
            done: true,
            usage: {
              promptTokens: 0, // Not available in streaming
              completionTokens: 0,
              totalTokens: totalContent.length, // Approximate
            },
          };
          break;
        }
      }

      logger.info('OpenAI chat completion completed', {
        userId,
        responseLength: totalContent.length,
      });

    } catch (error) {
      logger.error('OpenAI chat completion error', { error, userId: params.userId });
      
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          throw new Error('OpenAI rate limit exceeded. Please try again later.');
        }
        if (error.status === 401) {
          throw new Error('OpenAI API key is invalid.');
        }
        if (error.status === 402) {
          throw new Error('OpenAI quota exceeded. Please check your billing.');
        }
      }

      throw new Error('Failed to generate AI response. Please try again.');
    }
  }

  /**
   * Transcribe audio using Whisper API
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      const {
        language,
        model = 'whisper-1',
        prompt,
        temperature = 0
      } = options;

      logger.info('OpenAI transcription request', {
        audioSize: audioBuffer.length,
        language,
        model,
      });

      // Create a File-like object from buffer
      const audioFile = new File([new Uint8Array(audioBuffer)], 'audio.mp3', { type: 'audio/mpeg' });

      const transcription = await this.client.audio.transcriptions.create({
        file: audioFile,
        model,
        language,
        prompt,
        temperature,
        response_format: 'verbose_json',
      });

      logger.info('OpenAI transcription completed', {
        textLength: transcription.text.length,
        language: transcription.language,
        duration: transcription.duration,
      });

      return {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
      };

    } catch (error) {
      logger.error('OpenAI transcription error', { error });
      
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          throw new Error('OpenAI rate limit exceeded. Please try again later.');
        }
        if (error.status === 413) {
          throw new Error('Audio file is too large. Please use a smaller file.');
        }
      }

      throw new Error('Failed to transcribe audio. Please try again.');
    }
  }

  /**
   * Generate speech from text (Text-to-Speech)
   */
  async generateSpeech(
    text: string,
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy',
    model: 'tts-1' | 'tts-1-hd' = 'tts-1'
  ): Promise<Buffer> {
    try {
      logger.info('OpenAI TTS request', {
        textLength: text.length,
        voice,
        model,
      });

      const response = await this.client.audio.speech.create({
        model,
        voice,
        input: text,
        response_format: 'mp3',
      });

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      logger.info('OpenAI TTS completed', {
        audioSize: audioBuffer.length,
      });

      return audioBuffer;

    } catch (error) {
      logger.error('OpenAI TTS error', { error });
      
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          throw new Error('OpenAI rate limit exceeded. Please try again later.');
        }
      }

      throw new Error('Failed to generate speech. Please try again.');
    }
  }

  /**
   * Track API usage for billing and analytics
   */
  private async trackUsage(
    userId: string,
    type: 'chat' | 'transcription' | 'tts',
    count: number = 1
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `usage:${userId}:${type}:${today}`;
      
      await this.redis.incrby(key, count);
      await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days TTL

    } catch (error) {
      logger.error('Error tracking usage', { error, userId, type });
      // Don't throw error for usage tracking failures
    }
  }

  /**
   * Get user's API usage for current month
   */
  async getUserUsage(userId: string): Promise<{
    chat: number;
    transcription: number;
    tts: number;
  }> {
    try {
      const today = new Date();
      const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
      
      const keys = [
        `usage:${userId}:chat:${currentMonth}*`,
        `usage:${userId}:transcription:${currentMonth}*`,
        `usage:${userId}:tts:${currentMonth}*`,
      ];

      const [chatKeys, transcriptionKeys, ttsKeys] = await Promise.all(
        keys.map(pattern => this.redis.keys(pattern))
      );

      const [chatUsage, transcriptionUsage, ttsUsage] = await Promise.all([
        this.sumUsageKeys(chatKeys),
        this.sumUsageKeys(transcriptionKeys),
        this.sumUsageKeys(ttsKeys),
      ]);

      return {
        chat: chatUsage,
        transcription: transcriptionUsage,
        tts: ttsUsage,
      };

    } catch (error) {
      logger.error('Error getting user usage', { error, userId });
      return { chat: 0, transcription: 0, tts: 0 };
    }
  }

  /**
   * Sum usage values from Redis keys
   */
  private async sumUsageKeys(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;

    const values = await this.redis.mget(...keys);
    return values.reduce((sum, val) => sum + (parseInt(val || '0') || 0), 0);
  }

  /**
   * Check OpenAI API health
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple API call to check if OpenAI is accessible
      await this.client.models.list();
      return true;
    } catch (error) {
      logger.error('OpenAI health check failed', { error });
      return false;
    }
  }
}

export const openaiService = new OpenAIService();