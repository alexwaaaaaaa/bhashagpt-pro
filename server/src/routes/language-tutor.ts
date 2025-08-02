import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { trackMessageUsage } from '../middleware/usage-tracking.middleware';
import { LanguageTutorController } from '../controllers/language-tutor.controller';

const router = Router();

// Chat with the language tutor
router.post(
  '/chat',
  authMiddleware,
  [
    body('message').notEmpty().withMessage('Message is required'),
    body('targetLanguage').notEmpty().withMessage('Target language is required'),
    body('nativeLanguage').optional().isString(),
    body('proficiencyLevel').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'NATIVE']),
    body('learningGoals').optional().isArray(),
    body('culturalContext').optional().isBoolean(),
    body('conversationHistory').optional().isArray(),
  ],
  validateRequest,
  trackMessageUsage(1),
  LanguageTutorController.chat
);

// Stream chat response
router.post(
  '/chat/stream',
  authMiddleware,
  [
    body('message').notEmpty().withMessage('Message is required'),
    body('targetLanguage').notEmpty().withMessage('Target language is required'),
    body('nativeLanguage').optional().isString(),
    body('proficiencyLevel').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'NATIVE']),
    body('learningGoals').optional().isArray(),
    body('culturalContext').optional().isBoolean(),
    body('conversationHistory').optional().isArray(),
  ],
  validateRequest,
  trackMessageUsage(1),
  LanguageTutorController.streamChat
);

// Generate vocabulary exercise
router.post(
  '/vocabulary/exercise',
  authMiddleware,
  [
    body('language').notEmpty().withMessage('Language is required'),
    body('topic').optional().isString(),
  ],
  validateRequest,
  trackMessageUsage(1),
  LanguageTutorController.generateVocabularyExercise
);

// Analyze grammar
router.post(
  '/grammar/analyze',
  authMiddleware,
  [
    body('text').notEmpty().withMessage('Text to analyze is required'),
    body('language').notEmpty().withMessage('Language is required'),
    body('userLevel').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'NATIVE']),
  ],
  validateRequest,
  trackMessageUsage(1),
  LanguageTutorController.analyzeGrammar
);

// Get cultural insight
router.post(
  '/culture/insight',
  authMiddleware,
  [
    body('language').notEmpty().withMessage('Language is required'),
    body('topic').notEmpty().withMessage('Topic is required'),
    body('userLevel').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'NATIVE']),
  ],
  validateRequest,
  trackMessageUsage(1),
  LanguageTutorController.getCulturalInsight
);

// Get learning progress
router.get(
  '/progress/:language',
  authMiddleware,
  [
    param('language').notEmpty().withMessage('Language parameter is required'),
  ],
  validateRequest,
  LanguageTutorController.getLearningProgress
);

// Get conversation suggestions
router.get(
  '/suggestions',
  authMiddleware,
  [
    query('language').notEmpty().withMessage('Language is required'),
    query('proficiencyLevel').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'NATIVE']),
    query('interests').optional().isString(),
  ],
  validateRequest,
  LanguageTutorController.getConversationSuggestions
);

export default router;