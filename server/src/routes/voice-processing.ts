import { Router } from 'express';
import { VoiceProcessingController } from '../controllers/voice-processing.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { usageTrackingMiddleware } from '../middleware/usage-tracking.middleware';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Speech-to-Text transcription
router.post(
  '/transcribe',
  usageTrackingMiddleware({ action: 'voice', amount: 2 }), // 2 credits per transcription
  [
    body('language').optional().isString().isLength({ min: 2, max: 5 }),
    body('model').optional().isIn(['whisper-1']),
    body('temperature').optional().isFloat({ min: 0, max: 1 }),
    body('prompt').optional().isString().isLength({ max: 244 }),
    body('response_format').optional().isIn(['json', 'text', 'srt', 'verbose_json', 'vtt']),
    validate
  ],
  VoiceProcessingController.transcribeAudio
);

// Language detection
router.post(
  '/detect-language',
  usageTrackingMiddleware({ action: 'voice', amount: 1 }), // 1 credit per detection
  [
    body('text').notEmpty().isString().isLength({ min: 1, max: 1000 }),
    validate
  ],
  VoiceProcessingController.detectLanguage
);

// Audio preprocessing
router.post(
  '/preprocess',
  usageTrackingMiddleware({ action: 'voice', amount: 1 }), // 1 credit per preprocessing
  VoiceProcessingController.preprocessAudio
);

// Text-to-Speech synthesis
router.post(
  '/synthesize',
  usageTrackingMiddleware({ action: 'voice', amount: 2 }), // 2 credits per synthesis
  [
    body('text').notEmpty().isString().isLength({ min: 1, max: 4096 }),
    body('voice').optional().isIn(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']),
    body('model').optional().isIn(['tts-1', 'tts-1-hd']),
    body('speed').optional().isFloat({ min: 0.25, max: 4.0 }),
    body('response_format').optional().isIn(['mp3', 'opus', 'aac', 'flac']),
    validate
  ],
  VoiceProcessingController.synthesizeSpeech
);

// Pronunciation analysis
router.post(
  '/analyze-pronunciation',
  usageTrackingMiddleware({ action: 'voice', amount: 3 }), // 3 credits per analysis
  [
    body('reference_text').notEmpty().isString().isLength({ min: 1, max: 500 }),
    body('language').optional().isString().isLength({ min: 2, max: 5 }),
    validate
  ],
  VoiceProcessingController.analyzePronunciation
);

// Voice command recognition
router.post(
  '/recognize-command',
  usageTrackingMiddleware({ action: 'voice', amount: 1 }), // 1 credit per command recognition
  [
    body('text').notEmpty().isString().isLength({ min: 1, max: 200 }),
    validate
  ],
  VoiceProcessingController.recognizeVoiceCommand
);

// Real-time audio streaming
router.post(
  '/stream/process',
  usageTrackingMiddleware({ action: 'voice', amount: 1 }), // 1 credit per stream chunk
  [
    body('stream_id').optional().isUUID(),
    body('language').optional().isString().isLength({ min: 2, max: 5 }),
    validate
  ],
  VoiceProcessingController.processAudioStream
);

// Finalize audio stream
router.post(
  '/stream/:stream_id/finalize',
  usageTrackingMiddleware({ action: 'voice', amount: 2 }), // 2 credits per finalization
  [
    param('stream_id').isUUID(),
    validate
  ],
  VoiceProcessingController.finalizeAudioStream
);

// Get Web Speech API configuration
router.get(
  '/web-speech-config',
  [
    query('language').optional().isString().isLength({ min: 2, max: 10 }),
    validate
  ],
  VoiceProcessingController.getWebSpeechConfig
);

// Get supported languages and voices
router.get(
  '/supported-languages',
  VoiceProcessingController.getSupportedLanguages
);

// Batch processing
router.post(
  '/batch',
  usageTrackingMiddleware({ action: 'voice', amount: 5 }), // 5 credits per batch
  [
    body('operation').notEmpty().isIn(['transcribe', 'preprocess']),
    body('options').optional().isJSON(),
    validate
  ],
  VoiceProcessingController.batchProcess
);

export default router;