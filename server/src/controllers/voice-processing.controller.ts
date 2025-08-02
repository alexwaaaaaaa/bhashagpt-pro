import { Request, Response } from 'express';
import { VoiceProcessingService } from '../services/voice-processing.service';
import { logger } from '../utils/logger';
import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/webm',
      'audio/ogg'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file format'));
    }
  }
});

export class VoiceProcessingController {
  // Speech-to-Text transcription
  static transcribeAudio = [
    upload.single('audio'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Audio file is required'
          });
        }

        const options = {
          language: req.body.language,
          model: req.body.model || 'whisper-1',
          temperature: req.body.temperature ? parseFloat(req.body.temperature) : undefined,
          prompt: req.body.prompt,
          response_format: req.body.response_format || 'verbose_json'
        };

        const result = await VoiceProcessingService.transcribeAudio(
          req.file.buffer,
          options
        );

        logger.info('Audio transcription completed', {
          userId: req.user?.id,
          language: result.language,
          textLength: result.text.length
        });

        res.json({
          success: true,
          data: result
        });

      } catch (error) {
        logger.error('Audio transcription failed', { error, userId: req.user?.id });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to transcribe audio'
        });
      }
    }
  ];

  // Language detection
  static detectLanguage = async (req: Request, res: Response) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Text is required'
        });
      }

      const result = await VoiceProcessingService.detectLanguage(text);

      logger.info('Language detection completed', {
        userId: req.user?.id,
        detectedLanguage: result.language,
        confidence: result.confidence
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Language detection failed', { error, userId: req.user?.id });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to detect language'
      });
    }
  };

  // Audio preprocessing
  static preprocessAudio = [
    upload.single('audio'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Audio file is required'
          });
        }

        const result = await VoiceProcessingService.preprocessAudio(req.file.buffer);

        logger.info('Audio preprocessing completed', {
          userId: req.user?.id,
          originalSize: req.file.size,
          qualityScore: result.quality_score
        });

        res.json({
          success: true,
          data: result
        });

      } catch (error) {
        logger.error('Audio preprocessing failed', { error, userId: req.user?.id });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to preprocess audio'
        });
      }
    }
  ];

  // Text-to-Speech synthesis
  static synthesizeSpeech = async (req: Request, res: Response) => {
    try {
      const { text, voice, model, speed, response_format } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Text is required'
        });
      }

      if (text.length > 4096) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Text must be 4096 characters or less'
        });
      }

      const options = {
        voice: voice || 'alloy',
        model: model || 'tts-1',
        speed: speed ? parseFloat(speed) : 1.0,
        response_format: response_format || 'mp3'
      };

      const audioBuffer = await VoiceProcessingService.synthesizeSpeech(text, options);

      logger.info('Text-to-speech synthesis completed', {
        userId: req.user?.id,
        textLength: text.length,
        voice: options.voice,
        audioSize: audioBuffer.length
      });

      // Set appropriate headers for audio response
      res.set({
        'Content-Type': `audio/${options.response_format}`,
        'Content-Length': audioBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="speech.${options.response_format}"`
      });

      res.send(audioBuffer);

    } catch (error) {
      logger.error('Text-to-speech synthesis failed', { error, userId: req.user?.id });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to synthesize speech'
      });
    }
  };

  // Pronunciation analysis
  static analyzePronunciation = [
    upload.single('audio'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Audio file is required'
          });
        }

        const { reference_text, language } = req.body;

        if (!reference_text || typeof reference_text !== 'string') {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Reference text is required'
          });
        }

        const result = await VoiceProcessingService.analyzePronunciation(
          req.file.buffer,
          reference_text,
          language || 'en'
        );

        logger.info('Pronunciation analysis completed', {
          userId: req.user?.id,
          language: language || 'en',
          overallScore: result.overall_score
        });

        res.json({
          success: true,
          data: result
        });

      } catch (error) {
        logger.error('Pronunciation analysis failed', { error, userId: req.user?.id });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to analyze pronunciation'
        });
      }
    }
  ];

  // Voice command recognition
  static recognizeVoiceCommand = async (req: Request, res: Response) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Text is required'
        });
      }

      const result = await VoiceProcessingService.recognizeVoiceCommand(text);

      logger.info('Voice command recognition completed', {
        userId: req.user?.id,
        commandDetected: !!result,
        command: result?.command
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Voice command recognition failed', { error, userId: req.user?.id });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to recognize voice command'
      });
    }
  };

  // Real-time audio streaming
  static processAudioStream = [
    upload.single('audio_chunk'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Audio chunk is required'
          });
        }

        const { stream_id, language } = req.body;
        const streamId = stream_id || uuidv4();

        const options = {
          language: language,
          response_format: 'json' as const
        };

        const result = await VoiceProcessingService.processAudioStream(
          req.file.buffer,
          streamId,
          options
        );

        logger.debug('Audio stream chunk processed', {
          userId: req.user?.id,
          streamId,
          chunkSize: req.file.size,
          partialTextLength: result.partial_text.length
        });

        res.json({
          success: true,
          data: result
        });

      } catch (error) {
        logger.error('Audio stream processing failed', { error, userId: req.user?.id });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to process audio stream'
        });
      }
    }
  ];

  // Finalize audio stream
  static finalizeAudioStream = async (req: Request, res: Response) => {
    try {
      const { stream_id } = req.params;

      if (!stream_id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Stream ID is required'
        });
      }

      const result = await VoiceProcessingService.finalizeAudioStream(stream_id);

      logger.info('Audio stream finalized', {
        userId: req.user?.id,
        streamId: stream_id,
        finalTextLength: result.text.length,
        language: result.language
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Audio stream finalization failed', { error, userId: req.user?.id });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to finalize audio stream'
      });
    }
  };

  // Get Web Speech API configuration
  static getWebSpeechConfig = async (req: Request, res: Response) => {
    try {
      const { language } = req.query;
      
      const config = VoiceProcessingService.getWebSpeechAPIConfig(
        language as string || 'en-US'
      );

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      logger.error('Failed to get Web Speech API config', { error, userId: req.user?.id });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get Web Speech API configuration'
      });
    }
  };

  // Get supported languages
  static getSupportedLanguages = async (req: Request, res: Response) => {
    try {
      const languages = [
        { code: 'en', name: 'English', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { code: 'es', name: 'Spanish', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { code: 'fr', name: 'French', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { code: 'de', name: 'German', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { code: 'it', name: 'Italian', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { code: 'pt', name: 'Portuguese', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { code: 'ru', name: 'Russian', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { code: 'ja', name: 'Japanese', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { code: 'ko', name: 'Korean', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { code: 'zh', name: 'Chinese', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { code: 'ar', name: 'Arabic', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { code: 'hi', name: 'Hindi', voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] }
      ];

      res.json({
        success: true,
        data: {
          languages,
          voice_commands: [
            'translate',
            'repeat',
            'slower',
            'faster',
            'pause',
            'continue',
            'help'
          ]
        }
      });

    } catch (error) {
      logger.error('Failed to get supported languages', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get supported languages'
      });
    }
  };

  // Batch voice processing
  static batchProcess = [
    upload.array('audio_files', 10), // Max 10 files
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];
        
        if (!files || files.length === 0) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'At least one audio file is required'
          });
        }

        const { operation, options } = req.body;
        const parsedOptions = options ? JSON.parse(options) : {};

        const results = [];

        for (const file of files) {
          try {
            let result;
            
            switch (operation) {
              case 'transcribe':
                result = await VoiceProcessingService.transcribeAudio(file.buffer, parsedOptions);
                break;
              case 'preprocess':
                result = await VoiceProcessingService.preprocessAudio(file.buffer);
                break;
              default:
                throw new Error(`Unsupported operation: ${operation}`);
            }

            results.push({
              filename: file.originalname,
              success: true,
              data: result
            });

          } catch (error) {
            results.push({
              filename: file.originalname,
              success: false,
              error: error instanceof Error ? error.message : 'Processing failed'
            });
          }
        }

        logger.info('Batch voice processing completed', {
          userId: req.user?.id,
          operation,
          totalFiles: files.length,
          successCount: results.filter(r => r.success).length
        });

        res.json({
          success: true,
          data: {
            results,
            summary: {
              total: files.length,
              successful: results.filter(r => r.success).length,
              failed: results.filter(r => !r.success).length
            }
          }
        });

      } catch (error) {
        logger.error('Batch voice processing failed', { error, userId: req.user?.id });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to process audio files'
        });
      }
    }
  ];
}