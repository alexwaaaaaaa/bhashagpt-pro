import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { trackMessageUsage, trackTokenUsage } from '../middleware/usage-tracking.middleware';
import { AIService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { body, validationResult } from 'express-validator';

const router = Router();

// Validation middleware
const chatValidation = [
  body('messages').isArray().withMessage('Messages must be an array'),
  body('messages.*.role').isIn(['system', 'user', 'assistant']).withMessage('Invalid message role'),
  body('messages.*.content').isString().notEmpty().withMessage('Message content is required'),
  body('language').optional().isString().isLength({ min: 2, max: 5 }).withMessage('Invalid language code'),
  body('stream').optional().isBoolean().withMessage('Stream must be boolean'),
];

// Chat completion with usage tracking
router.post('/completions',
  authMiddleware,
  chatValidation,
  trackMessageUsage(1), // Track 1 message
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { messages, language = 'en', stream = false, temperature, maxTokens } = req.body;
      const userId = req.user?.id;

      logger.info('Chat completion request', {
        userId,
        messageCount: messages.length,
        language,
        stream
      });

      // Handle streaming response
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        let tokenCount = 0;

        try {
          for await (const chunk of AIService.createChatCompletion({
            messages,
            language,
            temperature,
            maxTokens,
            stream: true,
            userId
          })) {
            if (!chunk.done) {
              tokenCount++;
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            } else {
              // Final chunk with usage info
              res.write(`data: ${JSON.stringify({
                ...chunk,
                usage: {
                  promptTokens: messages.reduce((acc, msg) => acc + msg.content.length / 4, 0),
                  completionTokens: tokenCount,
                  totalTokens: tokenCount + messages.reduce((acc, msg) => acc + msg.content.length / 4, 0)
                }
              })}\n\n`);
              res.write('data: [DONE]\n\n');
              break;
            }
          }
        } catch (error) {
          logger.error('Streaming chat error', { error, userId });
          res.write(`data: ${JSON.stringify({
            error: 'Chat completion failed',
            done: true
          })}\n\n`);
        }

        res.end();
      } else {
        // Non-streaming response
        const chunks: string[] = [];
        let tokenCount = 0;

        for await (const chunk of AIService.createChatCompletion({
          messages,
          language,
          temperature,
          maxTokens,
          stream: false,
          userId
        })) {
          if (!chunk.done) {
            chunks.push(chunk.content);
            tokenCount++;
          }
        }

        const response = chunks.join('');

        res.json({
          success: true,
          response,
          usage: {
            promptTokens: messages.reduce((acc, msg) => acc + msg.content.length / 4, 0),
            completionTokens: tokenCount,
            totalTokens: tokenCount + messages.reduce((acc, msg) => acc + msg.content.length / 4, 0)
          },
          language,
          provider: AIService.getServiceInfo().provider
        });
      }

    } catch (error) {
      logger.error('Chat completion error', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Chat completion failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// AI Service health check
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await AIService.healthCheck();
    const serviceInfo = AIService.getServiceInfo();

    res.json({
      success: true,
      healthy: isHealthy,
      service: serviceInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('AI service health check failed', { error });
    res.status(500).json({
      success: false,
      healthy: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

// Get AI service information
router.get('/info', (req, res) => {
  try {
    const serviceInfo = AIService.getServiceInfo();
    res.json({
      success: true,
      ...serviceInfo
    });
  } catch (error) {
    logger.error('Get AI service info failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get service information'
    });
  }
});

// Get chat sessions (placeholder for future implementation)
router.get('/sessions',
  authMiddleware,
  (req, res) => {
    res.json({
      success: true,
      sessions: [],
      message: 'Chat sessions feature coming soon'
    });
  }
);

// Create chat session (placeholder for future implementation)
router.post('/sessions',
  authMiddleware,
  (req, res) => {
    res.json({
      success: true,
      sessionId: `session_${Date.now()}`,
      message: 'Chat sessions feature coming soon'
    });
  }
);

// Test endpoint without authentication (for development only)
router.post('/test',
  chatValidation,
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { messages, language = 'en', stream = false } = req.body;

      logger.info('Test chat completion request', {
        messageCount: messages.length,
        language,
        stream
      });

      // Non-streaming response for simplicity
      const chunks: string[] = [];
      let tokenCount = 0;

      for await (const chunk of AIService.createChatCompletion({
        messages,
        language,
        stream: false,
        userId: 'test-user'
      })) {
        if (!chunk.done) {
          chunks.push(chunk.content);
          tokenCount++;
        }
      }

      const response = chunks.join('');

      res.json({
        success: true,
        response,
        usage: {
          promptTokens: messages.reduce((acc: number, msg: any) => acc + msg.content.length / 4, 0),
          completionTokens: tokenCount,
          totalTokens: tokenCount + messages.reduce((acc: number, msg: any) => acc + msg.content.length / 4, 0)
        },
        language,
        provider: AIService.getServiceInfo().provider
      });

    } catch (error) {
      logger.error('Test chat completion error', { error });
      res.status(500).json({
        success: false,
        error: 'Chat completion failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;