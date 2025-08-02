import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types/auth';
import { DIDService, VideoGenerationRequest } from '../services/did-avatar.service';
import { SubscriptionService } from '../services/subscription.service';

export class AvatarController {
  // Get available avatars
  static async getAvailableAvatars(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { gender, age, ethnicity, language } = req.query;

      let avatars = DIDService.getAvailableAvatars();

      // Filter by criteria if provided
      if (gender || age || ethnicity || language) {
        avatars = DIDService.getAvatarsByCriteria({
          gender: gender as 'male' | 'female',
          age: age as 'young' | 'middle' | 'senior',
          ethnicity: ethnicity as string,
          language: language as string,
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: avatars,
      });
    } catch (error) {
      logger.error('Failed to get available avatars', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve avatars',
      });
    }
  }

  // Generate avatar video
  static async generateVideo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        text,
        avatarId,
        voice,
        config,
        emotion,
        mobile = false
      } = req.body;

      // Check usage limits (video generation counts as multiple messages)
      const videoCredits = mobile ? 3 : 5; // Mobile videos cost less
      const canGenerate = await SubscriptionService.canPerformAction(userId, 'message', videoCredits);
      
      if (!canGenerate.allowed) {
        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Insufficient credits for video generation. Upgrade to Pro for unlimited videos.',
          remaining: canGenerate.remaining,
          resetDate: canGenerate.resetDate,
          creditsRequired: videoCredits,
        });
        return;
      }

      // Validate avatar exists
      const avatar = DIDService.getAvatarById(avatarId);
      if (!avatar) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid avatar ID',
        });
        return;
      }

      const request: VideoGenerationRequest = {
        text,
        avatarId,
        voice,
        config,
        emotion,
        userId,
      };

      // Generate video (mobile optimized if requested)
      const result = mobile 
        ? await DIDService.generateMobileOptimizedVideo(request)
        : await DIDService.generateVideo(request);

      // Record usage
      await SubscriptionService.recordUsage(userId, { messages: videoCredits });

      res.status(StatusCodes.ACCEPTED).json({
        success: true,
        data: {
          videoId: result.id,
          status: result.status,
          estimatedDuration: '30-60 seconds',
          avatar: avatar.name,
          creditsUsed: videoCredits,
        },
        message: 'Video generation started. Check status using the video ID.',
      });
    } catch (error) {
      logger.error('Failed to generate video', { error, userId: req.user?.userId });
      
      // Check if it's a D-ID API error
      if (error instanceof Error && error.message.includes('D-ID API error')) {
        res.status(StatusCodes.BAD_GATEWAY).json({
          success: false,
          message: 'Video generation service temporarily unavailable. Please try again later.',
          fallback: 'text-to-speech',
        });
        return;
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate avatar video',
        fallback: 'text-to-speech',
      });
    }
  }

  // Check video generation status
  static async checkVideoStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { videoId } = req.params;
      const userId = req.user!.userId;

      const status = await DIDService.checkVideoStatus(videoId);

      // If video is ready, optionally upload to CDN
      if (status.status === 'done' && status.result_url) {
        try {
          const cdnUrl = await DIDService.uploadToCDN(
            status.result_url,
            `${userId}-${videoId}.mp4`
          );
          status.result_url = cdnUrl;
        } catch (cdnError) {
          logger.warn('Failed to upload to CDN, using original URL', { cdnError, videoId });
        }
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Failed to check video status', { error, videoId: req.params.videoId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to check video status',
      });
    }
  }

  // Generate text-to-speech fallback
  static async generateTextToSpeech(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { text, voice = 'en-US-AriaNeural' } = req.body;

      // Check usage limits (TTS costs less than video)
      const canGenerate = await SubscriptionService.canPerformAction(userId, 'message', 1);
      
      if (!canGenerate.allowed) {
        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Daily limit reached. Upgrade to Pro for unlimited text-to-speech.',
          remaining: canGenerate.remaining,
          resetDate: canGenerate.resetDate,
        });
        return;
      }

      const audioUrl = await DIDService.generateTextToSpeech(text, voice);

      // Record usage
      await SubscriptionService.recordUsage(userId, { messages: 1 });

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          audioUrl,
          text,
          voice,
          type: 'text-to-speech',
        },
      });
    } catch (error) {
      logger.error('Failed to generate text-to-speech', { error, userId: req.user?.userId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate text-to-speech',
      });
    }
  }

  // Get avatar by ID
  static async getAvatarById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { avatarId } = req.params;
      const avatar = DIDService.getAvatarById(avatarId);

      if (!avatar) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Avatar not found',
        });
        return;
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: avatar,
      });
    } catch (error) {
      logger.error('Failed to get avatar', { error, avatarId: req.params.avatarId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve avatar',
      });
    }
  }

  // Analyze emotion from text
  static async analyzeEmotion(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { text } = req.body;
      const emotion = await DIDService.analyzeEmotion(text);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          text,
          detectedEmotion: emotion,
          confidence: 0.8, // Mock confidence score
          suggestions: [
            'Consider using a more expressive tone',
            'This emotion works well with most avatars',
            'Try different emotions for variety'
          ],
        },
      });
    } catch (error) {
      logger.error('Failed to analyze emotion', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to analyze emotion',
      });
    }
  }

  // Get video analytics
  static async getVideoAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { days = 30 } = req.query;

      const analytics = await DIDService.getVideoAnalytics(userId, Number(days));

      res.status(StatusCodes.OK).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Failed to get video analytics', { error, userId: req.user?.userId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve video analytics',
      });
    }
  }

  // Batch generate videos
  static async batchGenerateVideos(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { requests } = req.body;

      if (!Array.isArray(requests) || requests.length === 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Requests array is required and cannot be empty',
        });
        return;
      }

      if (requests.length > 10) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Maximum 10 videos can be generated in a batch',
        });
        return;
      }

      // Check usage limits for batch
      const totalCredits = requests.length * 5;
      const canGenerate = await SubscriptionService.canPerformAction(userId, 'message', totalCredits);
      
      if (!canGenerate.allowed) {
        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Insufficient credits for batch video generation.',
          remaining: canGenerate.remaining,
          resetDate: canGenerate.resetDate,
          creditsRequired: totalCredits,
        });
        return;
      }

      // Add userId to all requests
      const videoRequests = requests.map((req: any) => ({ ...req, userId }));

      // Generate videos in batch
      const results = await DIDService.generateMultipleVideos(videoRequests);

      // Record usage
      await SubscriptionService.recordUsage(userId, { messages: totalCredits });

      res.status(StatusCodes.ACCEPTED).json({
        success: true,
        data: {
          batchId: `batch_${Date.now()}`,
          videos: results,
          totalVideos: results.length,
          creditsUsed: totalCredits,
        },
        message: 'Batch video generation started. Check individual video statuses.',
      });
    } catch (error) {
      logger.error('Failed to batch generate videos', { error, userId: req.user?.userId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate batch videos',
      });
    }
  }

  // Stream video generation progress
  static async streamVideoProgress(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { videoId } = req.params;
      const userId = req.user!.userId;

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Send initial status
      res.write(`data: ${JSON.stringify({ status: 'connecting', message: 'Checking video status...' })}\n\n`);

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const status = await DIDService.checkVideoStatus(videoId);
          
          res.write(`data: ${JSON.stringify({
            status: status.status,
            progress: status.status === 'processing' ? Math.random() * 100 : 100,
            message: this.getStatusMessage(status.status),
            result_url: status.result_url,
            error: status.error
          })}\n\n`);

          // Stop polling when done or error
          if (status.status === 'done' || status.status === 'error') {
            clearInterval(pollInterval);
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
          }
        } catch (error) {
          logger.error('Error polling video status', { error, videoId });
          res.write(`data: ${JSON.stringify({ error: 'Failed to check status' })}\n\n`);
          clearInterval(pollInterval);
          res.end();
        }
      }, 3000); // Poll every 3 seconds

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(pollInterval);
      });

    } catch (error) {
      logger.error('Failed to stream video progress', { error, videoId: req.params.videoId });
      
      if (!res.headersSent) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to stream video progress',
        });
      }
    }
  }

  private static getStatusMessage(status: string): string {
    const messages = {
      created: 'Video generation request created',
      processing: 'Generating avatar video...',
      done: 'Video generation completed',
      error: 'Video generation failed'
    };
    return messages[status as keyof typeof messages] || 'Unknown status';
  }
}