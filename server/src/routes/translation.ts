import { Router } from 'express';
import { translationController } from '../controllers/translation.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { translationRateLimit } from '../middleware/rate-limit.middleware';
import { trackTranslationUsage } from '../middleware/usage-tracking.middleware';

const router = Router();

// Translation endpoints (support both authenticated and anonymous users)
router.post('/', 
  optionalAuthenticate, 
  translationRateLimit,
  trackTranslationUsage(1),
  translationController.translateText.bind(translationController)
);

router.post('/batch', 
  optionalAuthenticate, 
  translationRateLimit,
  trackTranslationUsage(5), // Batch operations count as 5 translations
  translationController.translateBatch.bind(translationController)
);

router.post('/detect', 
  optionalAuthenticate, 
  translationRateLimit,
  trackTranslationUsage(1),
  translationController.detectLanguage.bind(translationController)
);

// Public endpoint for supported languages
router.get('/languages', 
  translationController.getSupportedLanguages.bind(translationController)
);

// Admin endpoints (require authentication)
router.delete('/cache', 
  authenticate, 
  translationController.clearCache.bind(translationController)
);

router.get('/cache/stats', 
  authenticate, 
  translationController.getCacheStats.bind(translationController)
);

export { router as translationRoutes };