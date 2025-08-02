import { env } from '../config/environment';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  cached: boolean;
  confidence?: number;
}

export interface BatchTranslationRequest {
  texts: string[];
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface LanguageDetection {
  language: string;
  confidence: number;
}

export class TranslationService {
  private redis = redisClient;
  private apiKey: string;
  private baseUrl = 'https://translation.googleapis.com/language/translate/v2';
  private cachePrefix = 'translation:';
  private cacheTTL = 24 * 60 * 60; // 24 hours

  constructor() {
    this.apiKey = env.GOOGLE_TRANSLATE_API_KEY || '';
  }

  /**
   * Generate cache key for translation
   */
  private generateCacheKey(text: string, sourceLang: string, targetLang: string): string {
    const normalizedText = text.trim().toLowerCase().substring(0, 100);
    const hash = Buffer.from(`${sourceLang}-${targetLang}-${normalizedText}`).toString('base64');
    return `${this.cachePrefix}${hash}`;
  }

  /**
   * Get cached translation
   */
  async getCachedTranslation(cacheKey: string): Promise<string | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      return cached;
    } catch (error) {
      logger.error('Error getting cached translation', { error, cacheKey });
      return null;
    }
  }

  /**
   * Set cached translation
   */
  async setCachedTranslation(cacheKey: string, translation: string): Promise<void> {
    try {
      await this.redis.setex(cacheKey, this.cacheTTL, translation);
    } catch (error) {
      logger.error('Error setting cached translation', { error, cacheKey });
      // Don't throw error for cache failures
    }
  }

  /**
   * Validate language code
   */
  private isValidLanguageCode(code: string): boolean {
    const supportedLanguages = [
      'en', 'hi', 'bn', 'te', 'ta', 'gu', 'mr', 'kn', 'ml', 'pa',
      'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'ru',
      'auto' // for source language detection
    ];
    return supportedLanguages.includes(code);
  }

  /**
   * Translate text using Google Translate API
   */
  async translateText(request: TranslationRequest): Promise<TranslationResult> {
    const { text, targetLanguage, sourceLanguage = 'auto' } = request;

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required and cannot be empty');
    }

    if (!this.isValidLanguageCode(targetLanguage)) {
      throw new Error('Invalid target language code');
    }

    if (sourceLanguage !== 'auto' && !this.isValidLanguageCode(sourceLanguage)) {
      throw new Error('Invalid source language code');
    }

    // Check if source and target are the same
    if (sourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        cached: false,
      };
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(text, sourceLanguage, targetLanguage);
    const cachedTranslation = await this.getCachedTranslation(cacheKey);
    
    if (cachedTranslation) {
      try {
        const parsed = JSON.parse(cachedTranslation);
        return {
          ...parsed,
          cached: true,
        };
      } catch (error) {
        logger.error('Error parsing cached translation', { error, cacheKey });
        // Continue with API call if cache is corrupted
      }
    }

    // Check if API key is configured
    if (!this.apiKey) {
      logger.warn('Google Translate API key not configured');
      return {
        translatedText: text,
        sourceLanguage: sourceLanguage === 'auto' ? 'unknown' : sourceLanguage,
        targetLanguage,
        cached: false,
      };
    }

    try {
      // Call Google Translate API with retry logic
      const result = await this.callTranslateAPI(text, targetLanguage, sourceLanguage);
      
      // Cache the result
      await this.setCachedTranslation(cacheKey, JSON.stringify(result));
      
      return {
        ...result,
        cached: false,
      };

    } catch (error) {
      logger.error('Translation API error', { error, text: text.substring(0, 50) });
      
      // Return original text as fallback
      return {
        translatedText: text,
        sourceLanguage: sourceLanguage === 'auto' ? 'unknown' : sourceLanguage,
        targetLanguage,
        cached: false,
      };
    }
  }

  /**
   * Call Google Translate API with retry logic
   */
  private async callTranslateAPI(
    text: string, 
    targetLanguage: string, 
    sourceLanguage: string
  ): Promise<Omit<TranslationResult, 'cached'>> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: text,
            target: targetLanguage,
            source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
            format: 'text',
          }),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Translation API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json() as any;
        
        if (!data.data || !data.data.translations || !data.data.translations[0]) {
          throw new Error('Invalid response format from translation API');
        }

        const translation = data.data.translations[0];
        
        return {
          translatedText: translation.translatedText,
          sourceLanguage: translation.detectedSourceLanguage || sourceLanguage,
          targetLanguage,
        };

      } catch (error) {
        lastError = error as Error;
        logger.warn(`Translation attempt ${attempt} failed`, { error, attempt });
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw lastError || new Error('Translation failed after all retries');
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(request: BatchTranslationRequest): Promise<TranslationResult[]> {
    const { texts, targetLanguage, sourceLanguage = 'auto' } = request;

    if (!texts || texts.length === 0) {
      throw new Error('Texts array is required and cannot be empty');
    }

    if (texts.length > 100) {
      throw new Error('Maximum 100 texts allowed per batch request');
    }

    // Process translations in parallel with concurrency limit
    const concurrencyLimit = 5;
    const results: TranslationResult[] = [];
    
    for (let i = 0; i < texts.length; i += concurrencyLimit) {
      const batch = texts.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(text => 
        this.translateText({ text, targetLanguage, sourceLanguage })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<LanguageDetection> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for language detection');
    }

    if (!this.apiKey) {
      throw new Error('Google Translate API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/detect?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
        }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Language detection API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      
      if (!data.data || !data.data.detections || !data.data.detections[0] || !data.data.detections[0][0]) {
        throw new Error('Invalid response format from language detection API');
      }

      const detection = data.data.detections[0][0];
      
      return {
        language: detection.language,
        confidence: detection.confidence || 0,
      };

    } catch (error) {
      logger.error('Language detection error', { error, text: text.substring(0, 50) });
      throw error;
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<Array<{ code: string; name: string }>> {
    if (!this.apiKey) {
      // Return basic supported languages if API key not configured
      return [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
      ];
    }

    try {
      const response = await fetch(`${this.baseUrl}/languages?key=${this.apiKey}&target=en`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Languages API error: ${response.status}`);
      }

      const data = await response.json() as any;
      
      if (!data.data || !data.data.languages) {
        throw new Error('Invalid response format from languages API');
      }

      return data.data.languages.map((lang: any) => ({
        code: lang.language,
        name: lang.name,
      }));

    } catch (error) {
      logger.error('Get supported languages error', { error });
      throw error;
    }
  }

  /**
   * Clear translation cache
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.cachePrefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      logger.info('Translation cache cleared', { keysDeleted: keys.length });
    } catch (error) {
      logger.error('Error clearing translation cache', { error });
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ totalKeys: number; memoryUsage: string }> {
    try {
      const keys = await this.redis.keys(`${this.cachePrefix}*`);
      const info = await this.redis.memory('USAGE', keys[0] || 'nonexistent');
      
      return {
        totalKeys: keys.length,
        memoryUsage: `${Math.round((info || 0) / 1024)} KB`,
      };
    } catch (error) {
      logger.error('Error getting cache stats', { error });
      return { totalKeys: 0, memoryUsage: '0 KB' };
    }
  }
}

export const translationService = new TranslationService();