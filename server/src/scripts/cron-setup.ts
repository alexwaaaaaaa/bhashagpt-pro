#!/usr/bin/env node

/**
 * Cron Job Setup Script
 * 
 * This script sets up cron jobs for subscription management tasks.
 * Run this script to schedule automated tasks for:
 * - Handling expired subscriptions
 * - Sending expiry warnings
 * - Cleaning up old usage records
 * - Generating usage reports
 * 
 * Usage: npm run cron:setup
 */

import { CronService } from '../services/cron.service';
import { logger } from '../utils/logger';

// Simple cron job scheduler (in production, use a proper cron service)
class SimpleCron {
  private static intervals: NodeJS.Timeout[] = [];

  static schedule(cronExpression: string, task: () => Promise<void>, name: string) {
    // Parse cron expression (simplified - only supports basic patterns)
    const interval = this.parseCronExpression(cronExpression);
    
    if (interval) {
      logger.info(`Scheduling task: ${name} with interval: ${interval}ms`);
      
      const intervalId = setInterval(async () => {
        try {
          logger.info(`Running scheduled task: ${name}`);
          await task();
          logger.info(`Completed scheduled task: ${name}`);
        } catch (error) {
          logger.error(`Failed to run scheduled task: ${name}`, { error });
        }
      }, interval);

      this.intervals.push(intervalId);
    }
  }

  private static parseCronExpression(expression: string): number | null {
    // Simplified cron parser - in production use a proper cron library
    switch (expression) {
      case '0 0 * * *': // Daily at midnight
        return 24 * 60 * 60 * 1000;
      case '0 0 * * 0': // Weekly on Sunday at midnight
        return 7 * 24 * 60 * 60 * 1000;
      case '0 0 1 * *': // Monthly on 1st at midnight
        return 30 * 24 * 60 * 60 * 1000;
      case '*/15 * * * *': // Every 15 minutes (for testing)
        return 15 * 60 * 1000;
      default:
        logger.warn(`Unsupported cron expression: ${expression}`);
        return null;
    }
  }

  static stop() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    logger.info('All scheduled tasks stopped');
  }
}

async function setupCronJobs() {
  try {
    logger.info('Setting up cron jobs for subscription management');

    // Daily tasks
    SimpleCron.schedule('0 0 * * *', CronService.runScheduledTasks, 'Daily Tasks');

    // Weekly tasks
    SimpleCron.schedule('0 0 * * 0', CronService.runWeeklyTasks, 'Weekly Tasks');

    // Monthly tasks
    SimpleCron.schedule('0 0 1 * *', CronService.runMonthlyTasks, 'Monthly Tasks');

    // For development/testing - run every 15 minutes
    if (process.env.NODE_ENV === 'development') {
      SimpleCron.schedule('*/15 * * * *', CronService.runScheduledTasks, 'Development Tasks');
    }

    logger.info('Cron jobs setup completed');

    // Keep the process running
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, stopping cron jobs');
      SimpleCron.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, stopping cron jobs');
      SimpleCron.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to setup cron jobs', { error });
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  setupCronJobs();
}

export { setupCronJobs, SimpleCron };