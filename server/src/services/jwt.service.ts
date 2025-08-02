import * as jwt from 'jsonwebtoken';
import { redisClient } from '../config/redis';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { JWTPayload } from '../types/auth';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = env.JWT_SECRET;
    this.refreshTokenSecret = env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): Promise<TokenPair> {
    try {
      const accessToken = jwt.sign(
        payload,
        this.accessTokenSecret,
        {
          expiresIn: this.accessTokenExpiry,
          issuer: 'bhashagpt-pro',
          audience: 'bhashagpt-pro-users',
        } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: payload.userId, type: 'refresh' },
        this.refreshTokenSecret,
        {
          expiresIn: this.refreshTokenExpiry,
          issuer: 'bhashagpt-pro',
          audience: 'bhashagpt-pro-users',
        } as jwt.SignOptions
      );

      // Store refresh token in Redis
      const refreshTokenKey = `refresh_token:${payload.userId}:${refreshToken}`;
      await redisClient.setex(refreshTokenKey, 7 * 24 * 60 * 60, 'valid'); // 7 days

      // Get expiry time for access token
      const decoded = jwt.decode(accessToken) as JWTPayload;
      const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900; // 15 minutes default

      return {
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      logger.error('Token generation failed', { error, userId: payload.userId });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<JWTPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token is blacklisted');
      }

      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'bhashagpt-pro',
        audience: 'bhashagpt-pro-users',
      }) as JWTPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string): Promise<{ userId: string }> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'bhashagpt-pro',
        audience: 'bhashagpt-pro-users',
      }) as { userId: string; type: string };

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in Redis
      const refreshTokenKey = `refresh_token:${payload.userId}:${token}`;
      const exists = await redisClient.exists(refreshTokenKey);
      
      if (!exists) {
        throw new Error('Refresh token not found');
      }

      return { userId: payload.userId };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Validate refresh token
      const { userId } = await this.validateRefreshToken(refreshToken);

      // Here you would typically fetch user data from database
      // For now, we'll create a basic payload
      const payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'> = {
        id: userId,
        userId,
        email: '', // Would be fetched from database
        role: 'user', // Would be fetched from database
      };

      // Generate new tokens
      const tokens = await this.generateTokens(payload);

      // Invalidate old refresh token
      const oldRefreshTokenKey = `refresh_token:${userId}:${refreshToken}`;
      await redisClient.del(oldRefreshTokenKey);

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw error;
    }
  }

  /**
   * Blacklist access token
   */
  async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        return;
      }

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        const blacklistKey = `blacklist:${token}`;
        await redisClient.setex(blacklistKey, ttl, 'blacklisted');
      }
    } catch (error) {
      logger.error('Token blacklisting failed', { error });
      // Don't throw error for blacklisting failures
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklistKey = `blacklist:${token}`;
      const exists = await redisClient.exists(blacklistKey);
      return exists === 1;
    } catch (error) {
      logger.error('Blacklist check failed', { error });
      return false; // Fail open
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      const pattern = `refresh_token:${userId}:*`;
      const keys = await redisClient.keys(pattern);
      
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }

      logger.info('All user tokens revoked', { userId, tokensRevoked: keys.length });
    } catch (error) {
      logger.error('Token revocation failed', { error, userId });
      throw error;
    }
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(token: string): number | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded?.exp || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Invalidate all user tokens (alias for revokeAllUserTokens)
   */
  async invalidateUserTokens(userId: string): Promise<void> {
    return this.revokeAllUserTokens(userId);
  }
}

export const jwtService = new JWTService();