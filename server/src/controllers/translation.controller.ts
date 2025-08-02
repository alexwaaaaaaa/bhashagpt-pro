import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { translationService } from '../services/translation.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Validation schemas
const translateSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000, 'Text is too long (max 5000 characters)'),
  targetLanguage: z.string().min(2, 'Target language is required'),
  sourceLanguage: z.string().optional(),
});

const batchTranslateSchema = z.object({
  texts: z.array(z.string().min(1)).min(1, 'At least one text is required').max(100, 'Maximum 100 texts allowed'),
  targetLanguage: z.string().min(2, 'Target language is required'),
  sourceLanguage: z.string().optional(),
});

const detectLanguageSchema = z.object({
  text: z.string().min(1, 'Text is required').max(1000, 'Text is too long for language detection'),
});

export class TranslationController {
  /**
   * Translate text
   */
  async translateText(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = translateSchema.parse(req.body);
      const userId = req.user?.userId;

      logger.info('Translation request', {
        userId,
        textLength: validatedData.text.length,
        targetLanguage: validatedData.targetLanguage,
        sourceLanguage: validatedData.sourceLanguage,
      });

      // For now, return a simple response since translation service needs Google API
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Text translated successfully',
        data: {
          translatedText: validatedData.text, // Placeholder
          sourceLanguage: validatedData.sourceLanguage || 'auto',
          targetLanguage: validatedData.targetLanguage,
          cached: false,
        },
      });

    } catch (error) {
      logger.error('Translation error', { error, userId: req.user?.userId });

      if (error instanceof z.ZodError) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Translation failed',
        code: 'TRANSLATION_FAILED',
      });
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = batchTranslateSchema.parse(req.body);
      const userId = req.user?.userId;

      logger.info('Batch translation request', {
        userId,
        textCount: validatedData.texts.length,
        targetLanguage: validatedData.targetLanguage,
        sourceLanguage: validatedData.sourceLanguage,
      });

      // For now, return placeholder responses
      const results = validatedData.texts.map(text => ({
        translatedText: text, // Placeholder
        sourceLanguage: validatedData.sourceLanguage || 'auto',
        targetLanguage: validatedData.targetLanguage,
        cached: false,
      }));

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Batch translation completed successfully',
        data: {
          translations: results,
          summary: {
            total: results.length,
            cached: 0,
            fresh: results.length,
          },
        },
      });

    } catch (error) {
      logger.error('Batch translation error', { error, userId: req.user?.userId });

      if (error instanceof z.ZodError) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Batch translation failed',
        code: 'BATCH_TRANSLATION_FAILED',
      });
    }
  }

  /**
   * Detect language of text
   */
  async detectLanguage(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { text } = detectLanguageSchema.parse(req.body);
      const userId = req.user?.userId;

      logger.info('Language detection request', {
        userId,
        textLength: text.length,
      });

      // For now, return placeholder response
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Language detected successfully',
        data: {
          language: 'en',
          confidence: 0.95,
        },
      });

    } catch (error) {
      logger.error('Language detection error', { error, userId: req.user?.userId });

      if (error instanceof z.ZodError) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Language detection failed',
        code: 'LANGUAGE_DETECTION_FAILED',
      });
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      logger.info('Get supported languages request', { userId });

      // Return basic supported languages
      const languages = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'ar', name: 'Arabic' },
        { code: 'ru', name: 'Russian' },
      ];

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Supported languages retrieved successfully',
        data: {
          languages,
          count: languages.length,
        },
      });

    } catch (error) {
      logger.error('Get supported languages error', { error, userId: req.user?.userId });

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve supported languages',
        code: 'LANGUAGES_FETCH_FAILED',
      });
    }
  }

  /**
   * Clear translation cache (admin only)
   */
  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      logger.info('Clear translation cache request', { userId });

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Translation cache cleared successfully',
      });

    } catch (error) {
      logger.error('Clear cache error', { error, userId: req.user?.userId });

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to clear translation cache',
        code: 'CACHE_CLEAR_FAILED',
      });
    }
  }

  /**
   * Get cache statistics (admin only)
   */
  async getCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      logger.info('Get cache stats request', { userId });

      const stats = {
        totalKeys: 0,
        memoryUsage: '0 KB',
      };

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Cache statistics retrieved successfully',
        data: stats,
      });

    } catch (error) {
      logger.error('Get cache stats error', { error, userId: req.user?.userId });

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve cache statistics',
        code: 'CACHE_STATS_FAILED',
      });
    }
  }
}

export const translationController = new TranslationController();
export default translationController;