import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types/auth';
import { LanguageTutorService, TutorContext } from '../services/language-tutor.service';
import { SubscriptionService } from '../services/subscription.service';

export class LanguageTutorController {
  // Start or continue a tutoring conversation
  static async chat(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        message,
        targetLanguage,
        nativeLanguage = 'English',
        proficiencyLevel = 'INTERMEDIATE',
        learningGoals,
        culturalContext = true,
        conversationHistory = []
      } = req.body;

      // Check usage limits
      const canChat = await SubscriptionService.canPerformAction(userId, 'message', 1);
      if (!canChat.allowed) {
        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Daily message limit reached. Upgrade to Pro for unlimited conversations.',
          remaining: canChat.remaining,
          resetDate: canChat.resetDate,
        });
        return;
      }

      const context: TutorContext = {
        userId,
        targetLanguage,
        nativeLanguage,
        proficiencyLevel,
        conversationHistory,
        learningGoals,
        culturalContext,
      };

      const response = await LanguageTutorService.generateTutorResponse(context, message);

      // Record usage
      await SubscriptionService.recordUsage(userId, { messages: 1 });

      res.status(StatusCodes.OK).json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Failed to process chat request', { error, userId: req.user?.userId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to process your message. Please try again.',
      });
    }
  }

  // Stream chat response for real-time feel
  static async streamChat(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        message,
        targetLanguage,
        nativeLanguage = 'English',
        proficiencyLevel = 'INTERMEDIATE',
        learningGoals,
        culturalContext = true,
        conversationHistory = []
      } = req.body;

      // Check usage limits
      const canChat = await SubscriptionService.canPerformAction(userId, 'message', 1);
      if (!canChat.allowed) {
        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Daily message limit reached. Upgrade to Pro for unlimited conversations.',
          remaining: canChat.remaining,
          resetDate: canChat.resetDate,
        });
        return;
      }

      const context: TutorContext = {
        userId,
        targetLanguage,
        nativeLanguage,
        proficiencyLevel,
        conversationHistory,
        learningGoals,
        culturalContext,
      };

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      const stream = await LanguageTutorService.generateStreamResponse(context, message);

      try {
        for await (const chunk of stream) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }

        // Record usage after successful stream
        await SubscriptionService.recordUsage(userId, { messages: 1 });

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      } catch (streamError) {
        logger.error('Error during streaming', { error: streamError, userId });
        res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      } finally {
        res.end();
      }
    } catch (error) {
      logger.error('Failed to start stream chat', { error, userId: req.user?.userId });
      
      if (!res.headersSent) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to start conversation stream.',
        });
      }
    }
  }

  // Generate vocabulary building exercise
  static async generateVocabularyExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { language, topic } = req.body;

      // Check usage limits
      const canUse = await SubscriptionService.canPerformAction(userId, 'message', 1);
      if (!canUse.allowed) {
        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Daily limit reached. Upgrade to Pro for unlimited exercises.',
          remaining: canUse.remaining,
          resetDate: canUse.resetDate,
        });
        return;
      }

      const exercise = await LanguageTutorService.generateVocabularyExercise(
        userId,
        language,
        topic
      );

      // Record usage
      await SubscriptionService.recordUsage(userId, { messages: 1 });

      res.status(StatusCodes.OK).json({
        success: true,
        data: exercise,
      });
    } catch (error) {
      logger.error('Failed to generate vocabulary exercise', { error, userId: req.user?.userId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate vocabulary exercise.',
      });
    }
  }

  // Analyze grammar and provide corrections
  static async analyzeGrammar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { text, language, userLevel = 'INTERMEDIATE' } = req.body;

      // Check usage limits
      const canUse = await SubscriptionService.canPerformAction(userId, 'message', 1);
      if (!canUse.allowed) {
        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Daily limit reached. Upgrade to Pro for unlimited grammar analysis.',
          remaining: canUse.remaining,
          resetDate: canUse.resetDate,
        });
        return;
      }

      const corrections = await LanguageTutorService.analyzeGrammar(text, language, userLevel);

      // Record usage
      await SubscriptionService.recordUsage(userId, { messages: 1 });

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          originalText: text,
          corrections,
          correctionCount: corrections.length,
        },
      });
    } catch (error) {
      logger.error('Failed to analyze grammar', { error, userId: req.user?.userId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to analyze grammar.',
      });
    }
  }

  // Get cultural insight
  static async getCulturalInsight(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { language, topic, userLevel = 'INTERMEDIATE' } = req.body;

      // Check usage limits
      const canUse = await SubscriptionService.canPerformAction(userId, 'message', 1);
      if (!canUse.allowed) {
        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Daily limit reached. Upgrade to Pro for unlimited cultural insights.',
          remaining: canUse.remaining,
          resetDate: canUse.resetDate,
        });
        return;
      }

      const insight = await LanguageTutorService.getCulturalInsight(language, topic, userLevel);

      // Record usage
      await SubscriptionService.recordUsage(userId, { messages: 1 });

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          topic,
          language,
          insight,
        },
      });
    } catch (error) {
      logger.error('Failed to get cultural insight', { error, userId: req.user?.userId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get cultural insight.',
      });
    }
  }

  // Get user's learning progress
  static async getLearningProgress(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { language } = req.params;

      const analytics = await SubscriptionService.getSubscriptionAnalytics(userId);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          language,
          progress: analytics.usageHistory,
          currentStreak: analytics.usage.dailyMessages,
          totalSessions: analytics.usageHistory.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get learning progress', { error, userId: req.user?.userId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve learning progress.',
      });
    }
  }

  // Get conversation suggestions based on user level
  static async getConversationSuggestions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { language, proficiencyLevel = 'INTERMEDIATE', interests } = req.query;

      const suggestions = await this.generateConversationSuggestions(
        language as string,
        proficiencyLevel as string,
        interests as string
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      logger.error('Failed to get conversation suggestions', { error, userId: req.user?.userId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get conversation suggestions.',
      });
    }
  }

  private static async generateConversationSuggestions(
    language: string,
    level: string,
    interests?: string
  ): Promise<string[]> {
    const levelSuggestions = {
      BEGINNER: [
        'Introduce yourself and ask about someone\'s hobbies',
        'Order food at a restaurant',
        'Ask for directions to a nearby landmark',
        'Talk about your family members',
        'Describe your daily routine',
        'Discuss the weather and seasons',
        'Shop for clothes and ask about sizes',
        'Make plans for the weekend'
      ],
      INTERMEDIATE: [
        'Discuss your travel experiences and dream destinations',
        'Talk about cultural differences you\'ve noticed',
        'Explain a recipe from your country',
        'Discuss current events and your opinions',
        'Talk about your career goals and aspirations',
        'Describe a memorable childhood experience',
        'Discuss environmental issues and solutions',
        'Talk about technology\'s impact on society'
      ],
      ADVANCED: [
        'Debate the pros and cons of social media',
        'Discuss philosophical concepts like happiness and success',
        'Analyze a piece of literature or film',
        'Talk about economic policies and their effects',
        'Discuss the future of artificial intelligence',
        'Explore cultural identity and globalization',
        'Debate ethical dilemmas in modern society',
        'Discuss the role of art in social change'
      ],
      NATIVE: [
        'Engage in wordplay and linguistic humor',
        'Discuss nuanced political or social issues',
        'Explore regional dialects and expressions',
        'Analyze poetry or complex literary works',
        'Debate abstract philosophical concepts',
        'Discuss specialized professional topics',
        'Explore historical linguistic evolution',
        'Engage in sophisticated cultural criticism'
      ]
    };

    let suggestions = levelSuggestions[level as keyof typeof levelSuggestions] || levelSuggestions.INTERMEDIATE;

    // Filter by interests if provided
    if (interests) {
      const interestKeywords = interests.toLowerCase().split(',').map(i => i.trim());
      suggestions = suggestions.filter(suggestion => 
        interestKeywords.some(keyword => 
          suggestion.toLowerCase().includes(keyword)
        )
      );
    }

    return suggestions.slice(0, 6); // Return top 6 suggestions
  }
}