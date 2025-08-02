import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { SubscriptionService } from '../services/subscription.service';
import { EmailService } from '../services/email.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types/auth';

export interface UsageTrackingOptions {
  action: 'message' | 'token' | 'voice' | 'translation';
  amount?: number;
  recordUsage?: boolean;
}

export const usageTrackingMiddleware = (options: UsageTrackingOptions) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      
      const { action, amount = 1, recordUsage = true } = options;

      // If user is not authenticated, skip usage tracking for optional auth routes
      if (!userId) {
        // For routes that require authentication, return error
        if (req.route?.path?.includes('/subscription/') || req.route?.path?.includes('/chat/')) {
          res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: 'Authentication required',
          });
          return;
        }
        // For optional auth routes (like translation), continue without tracking
        next();
        return;
      }

      // Check if user can perform the action
      const limitCheck = await SubscriptionService.canPerformAction(userId, action, amount);

      if (!limitCheck.allowed) {
        // Send usage warning email if user is close to limit
        if (req.user && limitCheck.remaining !== undefined && limitCheck.remaining <= 5) {
          const usagePercentage = Math.round(((50 - limitCheck.remaining) / 50) * 100);
          await EmailService.sendUsageLimitWarningEmail(
            req.user.email,
            'User',
            usagePercentage
          );
        }

        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Usage limit exceeded',
          data: {
            action,
            remaining: limitCheck.remaining,
            resetDate: limitCheck.resetDate,
            upgradeUrl: '/subscription/plans',
          },
        });
        return;
      }

      // Record usage if requested and user is authenticated
      if (recordUsage && userId) {
        const usageData: Record<string, number> = {};
        
        switch (action) {
          case 'message':
            usageData.messages = amount;
            break;
          case 'token':
            usageData.tokens = amount;
            break;
          case 'voice':
            usageData.voiceMinutes = amount;
            break;
          case 'translation':
            usageData.translations = amount;
            break;
        }

        await SubscriptionService.recordUsage(userId, usageData);
      }

      // Add usage info to request for use in route handlers
      req.usageInfo = {
        action,
        amount,
        remaining: limitCheck.remaining,
        resetDate: limitCheck.resetDate,
      };

      next();
    } catch (error) {
      logger.error('Usage tracking middleware error', { error, userId: req.user?.userId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to check usage limits',
      });
    }
  };
};

// Convenience middleware functions
export const trackMessageUsage = (amount: number = 1) => 
  usageTrackingMiddleware({ action: 'message', amount });

export const trackTokenUsage = (amount: number = 1) => 
  usageTrackingMiddleware({ action: 'token', amount });

export const trackVoiceUsage = (amount: number = 1) => 
  usageTrackingMiddleware({ action: 'voice', amount });

export const trackTranslationUsage = (amount: number = 1) => 
  usageTrackingMiddleware({ action: 'translation', amount });