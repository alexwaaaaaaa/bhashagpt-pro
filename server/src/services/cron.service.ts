import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { EmailService } from './email.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class CronService {
  // Handle expired subscriptions (run daily)
  static async handleExpiredSubscriptions(): Promise<void> {
    try {
      logger.info('Starting expired subscriptions cleanup');
      await SubscriptionService.handleExpiredSubscriptions();
      logger.info('Completed expired subscriptions cleanup');
    } catch (error) {
      logger.error('Failed to handle expired subscriptions', { error });
    }
  }

  // Send subscription expiry warnings (run daily)
  static async sendExpiryWarnings(): Promise<void> {
    try {
      logger.info('Starting subscription expiry warnings');

      const warningDays = [7, 3, 1]; // Send warnings 7, 3, and 1 days before expiry
      
      for (const days of warningDays) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        expiryDate.setHours(23, 59, 59, 999);

        const expiringSubscriptions = await prisma.subscription.findMany({
          where: {
            status: { in: ['active', 'trialing'] },
            currentPeriodEnd: {
              gte: new Date(expiryDate.getTime() - 24 * 60 * 60 * 1000), // Start of target day
              lte: expiryDate, // End of target day
            },
            cancelAtPeriodEnd: false,
          },
          include: {
            user: {
              select: { email: true, name: true },
            },
          },
        });

        for (const subscription of expiringSubscriptions) {
          if (subscription.user) {
            await EmailService.sendSubscriptionExpiryWarningEmail(
              subscription.user.email,
              subscription.user.name || 'User',
              days
            );
          }
        }

        logger.info(`Sent ${expiringSubscriptions.length} expiry warnings for ${days} days`, {
          count: expiringSubscriptions.length,
          days,
        });
      }

      logger.info('Completed subscription expiry warnings');
    } catch (error) {
      logger.error('Failed to send expiry warnings', { error });
    }
  }

  // Clean up old usage records (run weekly)
  static async cleanupOldUsageRecords(): Promise<void> {
    try {
      logger.info('Starting usage records cleanup');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days of records

      // Clean up old usage limits
      const deletedUsageLimits = await prisma.usageLimit.deleteMany({
        where: {
          resetDate: { lt: cutoffDate },
        },
      });

      // Clean up old API usage records
      const deletedApiUsage = await prisma.apiUsage.deleteMany({
        where: {
          date: { lt: cutoffDate },
        },
      });

      logger.info('Completed usage records cleanup', {
        deletedUsageLimits: deletedUsageLimits.count,
        deletedApiUsage: deletedApiUsage.count,
      });
    } catch (error) {
      logger.error('Failed to cleanup old usage records', { error });
    }
  }

  // Generate usage reports (run monthly)
  static async generateUsageReports(): Promise<void> {
    try {
      logger.info('Starting usage reports generation');

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      // Get usage statistics for last month
      const usageStats = await prisma.apiUsage.groupBy({
        by: ['userId'],
        where: {
          date: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
        _sum: {
          chatMessages: true,
          tokensUsed: true,
          voiceMinutes: true,
          translations: true,
          cost: true,
        },
        _count: {
          userId: true,
        },
      });

      // Log aggregated statistics
      const totalStats = usageStats.reduce(
        (acc, stat) => ({
          users: acc.users + 1,
          messages: acc.messages + (stat._sum.chatMessages || 0),
          tokens: acc.tokens + (stat._sum.tokensUsed || 0),
          voiceMinutes: acc.voiceMinutes + (stat._sum.voiceMinutes || 0),
          translations: acc.translations + (stat._sum.translations || 0),
          cost: acc.cost + (stat._sum.cost || 0),
        }),
        { users: 0, messages: 0, tokens: 0, voiceMinutes: 0, translations: 0, cost: 0 }
      );

      logger.info('Monthly usage report generated', {
        period: `${lastMonth.toISOString().slice(0, 7)}`,
        stats: totalStats,
      });

      logger.info('Completed usage reports generation');
    } catch (error) {
      logger.error('Failed to generate usage reports', { error });
    }
  }

  // Check for failed payments and retry (run daily)
  static async retryFailedPayments(): Promise<void> {
    try {
      logger.info('Starting failed payments retry');

      // Find subscriptions with failed payments in the last 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const failedPayments = await prisma.payment.findMany({
        where: {
          status: 'failed',
          createdAt: { gte: threeDaysAgo },
        },
        include: {
          subscription: {
            include: {
              user: {
                select: { email: true, name: true },
              },
            },
          },
        },
      });

      for (const payment of failedPayments) {
        if (payment.subscription.user) {
          // Send payment retry reminder
          await EmailService.sendPaymentFailedEmail(
            payment.subscription.user.email,
            payment.subscription.user.name || 'User',
            {
              amount: payment.amount / 100,
              currency: payment.currency.toUpperCase(),
              invoiceNumber: payment.stripeInvoiceId || 'N/A',
              retryUrl: 'https://bhashagpt.com/subscription/payment',
            }
          );
        }
      }

      logger.info(`Sent retry reminders for ${failedPayments.length} failed payments`);
      logger.info('Completed failed payments retry');
    } catch (error) {
      logger.error('Failed to retry failed payments', { error });
    }
  }

  // Run all scheduled tasks
  static async runScheduledTasks(): Promise<void> {
    const tasks = [
      { name: 'handleExpiredSubscriptions', fn: this.handleExpiredSubscriptions },
      { name: 'sendExpiryWarnings', fn: this.sendExpiryWarnings },
      { name: 'retryFailedPayments', fn: this.retryFailedPayments },
    ];

    for (const task of tasks) {
      try {
        logger.info(`Running scheduled task: ${task.name}`);
        await task.fn();
        logger.info(`Completed scheduled task: ${task.name}`);
      } catch (error) {
        logger.error(`Failed to run scheduled task: ${task.name}`, { error });
      }
    }
  }

  // Run weekly tasks
  static async runWeeklyTasks(): Promise<void> {
    const tasks = [
      { name: 'cleanupOldUsageRecords', fn: this.cleanupOldUsageRecords },
    ];

    for (const task of tasks) {
      try {
        logger.info(`Running weekly task: ${task.name}`);
        await task.fn();
        logger.info(`Completed weekly task: ${task.name}`);
      } catch (error) {
        logger.error(`Failed to run weekly task: ${task.name}`, { error });
      }
    }
  }

  // Run monthly tasks
  static async runMonthlyTasks(): Promise<void> {
    const tasks = [
      { name: 'generateUsageReports', fn: this.generateUsageReports },
    ];

    for (const task of tasks) {
      try {
        logger.info(`Running monthly task: ${task.name}`);
        await task.fn();
        logger.info(`Completed monthly task: ${task.name}`);
      } catch (error) {
        logger.error(`Failed to run monthly task: ${task.name}`, { error });
      }
    }
  }
}