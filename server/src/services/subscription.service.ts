import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { StripeService } from './stripe.service';

const prisma = new PrismaClient();

export interface SubscriptionLimits {
  dailyMessages: number;
  monthlyTokens: number;
  voiceMinutes: number;
  translations: number;
}

export interface UsageStats {
  dailyMessages: number;
  monthlyTokens: number;
  voiceMinutes: number;
  translations: number;
  resetDate: Date;
}

export class SubscriptionService {
  // Plan limits configuration
  private static readonly PLAN_LIMITS: Record<string, SubscriptionLimits> = {
    FREE: {
      dailyMessages: 50,
      monthlyTokens: 100000,
      voiceMinutes: 10,
      translations: 100,
    },
    PRO: {
      dailyMessages: -1, // Unlimited
      monthlyTokens: -1, // Unlimited
      voiceMinutes: -1, // Unlimited
      translations: -1, // Unlimited
    },
    ENTERPRISE: {
      dailyMessages: -1, // Unlimited
      monthlyTokens: -1, // Unlimited
      voiceMinutes: -1, // Unlimited
      translations: -1, // Unlimited
    },
  };

  // Get user's current subscription
  static async getUserSubscription(userId: string) {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: { in: ['active', 'trialing', 'past_due'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to get user subscription', { error, userId });
      throw new Error('Failed to retrieve subscription');
    }
  }

  // Get subscription limits for a plan
  static getSubscriptionLimits(planType: string): SubscriptionLimits {
    return this.PLAN_LIMITS[planType] || this.PLAN_LIMITS.FREE;
  }

  // Check if user can perform an action based on usage limits
  static async canPerformAction(
    userId: string,
    action: 'message' | 'token' | 'voice' | 'translation',
    amount: number = 1
  ): Promise<{ allowed: boolean; remaining?: number; resetDate?: Date }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const limits = this.getSubscriptionLimits(user.subscriptionTier);
      
      // If unlimited plan, allow action
      if (limits.dailyMessages === -1) {
        return { allowed: true };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usage = await this.getUserUsage(userId, today);

      let currentUsage = 0;
      let limit = 0;

      switch (action) {
        case 'message':
          currentUsage = usage.dailyMessages;
          limit = limits.dailyMessages;
          break;
        case 'token':
          currentUsage = usage.monthlyTokens;
          limit = limits.monthlyTokens;
          break;
        case 'voice':
          currentUsage = usage.voiceMinutes;
          limit = limits.voiceMinutes;
          break;
        case 'translation':
          currentUsage = usage.translations;
          limit = limits.translations;
          break;
      }

      const allowed = currentUsage + amount <= limit;
      const remaining = Math.max(0, limit - currentUsage);

      return {
        allowed,
        remaining,
        resetDate: usage.resetDate,
      };
    } catch (error) {
      logger.error('Failed to check action limits', { error, userId, action, amount });
      throw new Error('Failed to check usage limits');
    }
  }

  // Record usage for a user
  static async recordUsage(
    userId: string,
    usage: {
      messages?: number;
      tokens?: number;
      voiceMinutes?: number;
      translations?: number;
    }
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.usageLimit.upsert({
        where: {
          userId_resetDate: {
            userId,
            resetDate: today,
          },
        },
        update: {
          dailyMessages: { increment: usage.messages || 0 },
          monthlyTokens: { increment: usage.tokens || 0 },
          updatedAt: new Date(),
        },
        create: {
          userId,
          planType: (await prisma.user.findUnique({ where: { id: userId } }))?.subscriptionTier || 'FREE',
          dailyMessages: usage.messages || 0,
          monthlyTokens: usage.tokens || 0,
          resetDate: today,
        },
      });

      // Also record in API usage table
      await prisma.apiUsage.upsert({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        update: {
          chatMessages: { increment: usage.messages || 0 },
          tokensUsed: { increment: usage.tokens || 0 },
          voiceMinutes: { increment: usage.voiceMinutes || 0 },
          translations: { increment: usage.translations || 0 },
          updatedAt: new Date(),
        },
        create: {
          userId,
          date: today,
          chatMessages: usage.messages || 0,
          tokensUsed: usage.tokens || 0,
          voiceMinutes: usage.voiceMinutes || 0,
          translations: usage.translations || 0,
        },
      });
    } catch (error) {
      logger.error('Failed to record usage', { error, userId, usage });
      throw new Error('Failed to record usage');
    }
  }

  // Get user's current usage
  static async getUserUsage(userId: string, date?: Date): Promise<UsageStats> {
    try {
      const targetDate = date || new Date();
      targetDate.setHours(0, 0, 0, 0);

      const usage = await prisma.usageLimit.findUnique({
        where: {
          userId_resetDate: {
            userId,
            resetDate: targetDate,
          },
        },
      });

      if (!usage) {
        return {
          dailyMessages: 0,
          monthlyTokens: 0,
          voiceMinutes: 0,
          translations: 0,
          resetDate: targetDate,
        };
      }

      return {
        dailyMessages: usage.dailyMessages,
        monthlyTokens: usage.monthlyTokens,
        voiceMinutes: 0, // Will be calculated from API usage
        translations: 0, // Will be calculated from API usage
        resetDate: usage.resetDate,
      };
    } catch (error) {
      logger.error('Failed to get user usage', { error, userId, date });
      throw new Error('Failed to retrieve usage stats');
    }
  }

  // Create subscription for user
  static async createSubscription(userId: string, priceId: string, paymentMethodId?: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has a Stripe customer
      let subscription = await prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      let customerId = subscription?.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await StripeService.createCustomer({
          email: user.email,
          name: user.name || undefined,
          userId,
        });
        customerId = customer.id;
      }

      // Attach payment method if provided
      if (paymentMethodId) {
        await StripeService.attachPaymentMethod(paymentMethodId, customerId);
        await StripeService.setDefaultPaymentMethod(customerId, paymentMethodId);
      }

      // Create subscription
      const stripeSubscription = await StripeService.createSubscription({
        customerId,
        priceId,
        userId,
        trialDays: 7, // 7-day trial for new subscriptions
      });

      return stripeSubscription;
    } catch (error) {
      logger.error('Failed to create subscription', { error, userId, priceId });
      throw new Error('Failed to create subscription');
    }
  }

  // Upgrade/downgrade subscription
  static async changeSubscription(userId: string, newPriceId: string) {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      const updatedSubscription = await StripeService.updateSubscription({
        subscriptionId: subscription.stripeSubscriptionId,
        priceId: newPriceId,
      });

      return updatedSubscription;
    } catch (error) {
      logger.error('Failed to change subscription', { error, userId, newPriceId });
      throw new Error('Failed to change subscription');
    }
  }

  // Cancel subscription
  static async cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true) {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      const canceledSubscription = await StripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        cancelAtPeriodEnd
      );

      return canceledSubscription;
    } catch (error) {
      logger.error('Failed to cancel subscription', { error, userId });
      throw new Error('Failed to cancel subscription');
    }
  }

  // Reactivate subscription
  static async reactivateSubscription(userId: string) {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          cancelAtPeriodEnd: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new Error('No canceled subscription found');
      }

      const reactivatedSubscription = await StripeService.reactivateSubscription(
        subscription.stripeSubscriptionId
      );

      return reactivatedSubscription;
    } catch (error) {
      logger.error('Failed to reactivate subscription', { error, userId });
      throw new Error('Failed to reactivate subscription');
    }
  }

  // Handle expired subscriptions (called by cron job)
  static async handleExpiredSubscriptions(): Promise<void> {
    try {
      const expiredSubscriptions = await prisma.subscription.findMany({
        where: {
          status: { in: ['active', 'trialing'] },
          currentPeriodEnd: { lt: new Date() },
        },
        include: { user: true },
      });

      for (const subscription of expiredSubscriptions) {
        // Downgrade to free tier
        await prisma.user.update({
          where: { id: subscription.userId },
          data: { subscriptionTier: 'FREE' },
        });

        // Update subscription status
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'expired',
            expiresAt: new Date(),
            updatedAt: new Date(),
          },
        });

        logger.info('Subscription expired and user downgraded', {
          userId: subscription.userId,
          subscriptionId: subscription.id,
        });
      }
    } catch (error) {
      logger.error('Failed to handle expired subscriptions', { error });
      throw new Error('Failed to handle expired subscriptions');
    }
  }

  // Get subscription analytics
  static async getSubscriptionAnalytics(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          apiUsage: {
            where: {
              date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
            },
            orderBy: { date: 'desc' },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const currentSubscription = user.subscriptions[0];
      const limits = this.getSubscriptionLimits(user.subscriptionTier);
      const usage = await this.getUserUsage(userId);

      return {
        currentPlan: user.subscriptionTier,
        subscription: currentSubscription,
        limits,
        usage,
        usageHistory: user.apiUsage,
      };
    } catch (error) {
      logger.error('Failed to get subscription analytics', { error, userId });
      throw new Error('Failed to retrieve subscription analytics');
    }
  }
}