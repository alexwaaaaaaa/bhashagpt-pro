import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { AvatarController } from '../controllers/avatar.controller';

const router = Router();

// Get available avatars
router.get(
  '/avatars',
  authMiddleware,
  [
    query('gender').optional().isIn(['male', 'female']),
    query('age').optional().isIn(['young', 'middle', 'senior']),
    query('ethnicity').optional().isString(),
    query('language').optional().isString(),
  ],
  validateRequest,
  AvatarController.getAvailableAvatars
);

// Get specific avatar by ID
router.get(
  '/avatars/:avatarId',
  authMiddleware,
  [
    param('avatarId').notEmpty().withMessage('Avatar ID is required'),
  ],
  validateRequest,
  AvatarController.getAvatarById
);

// Generate avatar video
router.post(
  '/generate',
  authMiddleware,
  [
    body('text').notEmpty().withMessage('Text is required').isLength({ max: 500 }).withMessage('Text must be less than 500 characters'),
    body('avatarId').notEmpty().withMessage('Avatar ID is required'),
    body('voice').optional().isObject(),
    body('voice.type').optional().isIn(['text', 'audio']),
    body('voice.voice_id').optional().isString(),
    body('voice.language').optional().isString(),
    body('voice.style').optional().isString(),
    body('config').optional().isObject(),
    body('config.fluent').optional().isBoolean(),
    body('config.pad_audio').optional().isNumeric(),
    body('config.stitch').optional().isBoolean(),
    body('config.result_format').optional().isIn(['mp4', 'gif', 'mov']),
    body('emotion').optional().isString(),
    body('mobile').optional().isBoolean(),
  ],
  validateRequest,
  AvatarController.generateVideo
);

// Check video generation status
router.get(
  '/status/:videoId',
  authMiddleware,
  [
    param('videoId').notEmpty().withMessage('Video ID is required'),
  ],
  validateRequest,
  AvatarController.checkVideoStatus
);

// Stream video generation progress
router.get(
  '/progress/:videoId',
  authMiddleware,
  [
    param('videoId').notEmpty().withMessage('Video ID is required'),
  ],
  validateRequest,
  AvatarController.streamVideoProgress
);

// Generate text-to-speech fallback
router.post(
  '/tts',
  authMiddleware,
  [
    body('text').notEmpty().withMessage('Text is required').isLength({ max: 1000 }).withMessage('Text must be less than 1000 characters'),
    body('voice').optional().isString(),
  ],
  validateRequest,
  AvatarController.generateTextToSpeech
);

// Analyze emotion from text
router.post(
  '/emotion/analyze',
  authMiddleware,
  [
    body('text').notEmpty().withMessage('Text is required').isLength({ max: 500 }).withMessage('Text must be less than 500 characters'),
  ],
  validateRequest,
  AvatarController.analyzeEmotion
);

// Get video analytics
router.get(
  '/analytics',
  authMiddleware,
  [
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  ],
  validateRequest,
  AvatarController.getVideoAnalytics
);

// Batch generate videos
router.post(
  '/batch',
  authMiddleware,
  [
    body('requests').isArray({ min: 1, max: 10 }).withMessage('Requests must be an array with 1-10 items'),
    body('requests.*.text').notEmpty().withMessage('Text is required for each request'),
    body('requests.*.avatarId').notEmpty().withMessage('Avatar ID is required for each request'),
    body('requests.*.voice').optional().isObject(),
    body('requests.*.config').optional().isObject(),
    body('requests.*.emotion').optional().isString(),
  ],
  validateRequest,
  AvatarController.batchGenerateVideos
);

export default router;