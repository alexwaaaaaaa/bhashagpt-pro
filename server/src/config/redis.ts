import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { env } from './environment';

// Create Redis client instance
export const redisClient = new Redis({
  host: env.REDIS_HOST || 'localhost',
  port: env.REDIS_PORT || 6379,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB || 0,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Health check for Redis
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}

// Redis event handlers
redisClient.on('connect', () => {
  logger.info('Redis connection established');
});

redisClient.on('ready', () => {
  logger.info('Redis is ready to receive commands');
});

redisClient.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

// Export for backward compatibility
export const redis = redisClient;