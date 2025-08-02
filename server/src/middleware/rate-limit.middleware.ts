import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { StatusCodes } from 'http-status-codes';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  totalHits: number;
}

export class RateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = redisClient;
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests in window
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline failed');
      }

      const currentCount = (results[1][1] as number) || 0;
      const allowed = currentCount < maxRequests;
      const remaining = Math.max(0, maxRequests - currentCount - 1);
      const resetTime = new Date(now + windowMs);

      return {
        allowed,
        remaining,
        resetTime,
        totalHits: currentCount + 1,
      };
    } catch (error) {
      logger.error('Rate limit check failed', { error, key });
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: new Date(Date.now() + windowMs),
        totalHits: 1,
      };
    }
  }

  /**
   * Get user-specific rate limits based on subscription
   */
  getUserLimits(req: Request): { chat: number; translation: number; voice: number } {
    const user = req.user;
    
    if (!user) {
      // Anonymous user limits
      return {
        chat: 10, // 10 messages per hour
        translation: 50, // 50 translations per hour
        voice: 5, // 5 voice requests per hour
      };
    }

    // Check user role/subscription
    if (['pro', 'admin', 'super_admin'].includes(user.role)) {
      return {
        chat: 1000, // 1000 messages per hour
        translation: 5000, // 5000 translations per hour
        voice: 500, // 500 voice requests per hour
      };
    }

    // Free user limits
    return {
      chat: 50, // 50 messages per hour
      translation: 200, // 200 translations per hour
      voice: 20, // 20 voice requests per hour
    };
  }

  /**
   * Generate rate limit key
   */
  generateKey(req: Request, type: string): string {
    const user = req.user;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (user) {
      return `rate_limit:${type}:user:${user.userId}`;
    }
    
    return `rate_limit:${type}:ip:${ip}`;
  }
}

const rateLimiter = new RateLimiter();

/**
 * Create rate limiting middleware
 */
export const createRateLimit = (config: RateLimitConfig) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if rate limiting should be bypassed
      if ((req as any).bypassRateLimit) {
        next();
        return;
      }

      const key = config.keyGenerator ? config.keyGenerator(req) : `rate_limit:${req.ip}`;
      
      const result = await rateLimiter.checkLimit(
        key,
        config.maxRequests,
        config.windowMs
      );

      // Set rate limit headers
      if (config.standardHeaders !== false) {
        res.set({
          'RateLimit-Limit': config.maxRequests.toString(),
          'RateLimit-Remaining': result.remaining.toString(),
          'RateLimit-Reset': result.resetTime.toISOString(),
        });
      }

      if (config.legacyHeaders !== false) {
        res.set({
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString(),
        });
      }

      if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
          key,
          totalHits: result.totalHits,
          limit: config.maxRequests,
          ip: req.ip,
          userId: req.user?.userId,
        });

        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: config.message || 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(config.windowMs / 1000),
          limit: config.maxRequests,
          remaining: result.remaining,
          resetTime: result.resetTime,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiting middleware error', { error });
      // Fail open - allow request if there's an error
      next();
    }
  };
};

/**
 * Chat rate limiting middleware
 */
export const chatRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const limits = rateLimiter.getUserLimits(req);
  const key = rateLimiter.generateKey(req, 'chat');
  
  const middleware = createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: limits.chat,
    keyGenerator: () => key,
    message: 'Too many chat requests. Please upgrade to Pro for unlimited access.',
  });

  await middleware(req, res, next);
};

/**
 * Translation rate limiting middleware
 */
export const translationRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const limits = rateLimiter.getUserLimits(req);
  const key = rateLimiter.generateKey(req, 'translation');
  
  const middleware = createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: limits.translation,
    keyGenerator: () => key,
    message: 'Too many translation requests. Please upgrade to Pro for unlimited access.',
  });

  await middleware(req, res, next);
};

/**
 * Voice rate limiting middleware
 */
export const voiceRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const limits = rateLimiter.getUserLimits(req);
  const key = rateLimiter.generateKey(req, 'voice');
  
  const middleware = createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: limits.voice,
    keyGenerator: () => key,
    message: 'Too many voice requests. Please upgrade to Pro for unlimited access.',
  });

  await middleware(req, res, next);
};

/**
 * General API rate limiting
 */
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
  keyGenerator: (req) => `rate_limit:general:${req.ip}`,
  message: 'Too many requests from this IP, please try again later.',
});

/**
 * Auth rate limiting (stricter for login/register)
 */
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 auth attempts per 15 minutes
  keyGenerator: (req) => `rate_limit:auth:${req.ip}`,
  message: 'Too many authentication attempts, please try again later.',
});

/**
 * Password reset rate limiting
 */
export const passwordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 password reset attempts per hour
  keyGenerator: (req) => `rate_limit:password_reset:${req.ip}`,
  message: 'Too many password reset attempts, please try again later.',
});

export { rateLimiter };