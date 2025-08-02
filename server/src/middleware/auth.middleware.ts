import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { jwtService } from '../services/jwt.service';
import { JWTPayload } from '../types/auth';
import { logger } from '../utils/logger';

// Remove global declaration to avoid conflicts

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
  token: string;
}

/**
 * Extract token from request headers
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check for token in cookies
  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    return cookieToken;
  }
  
  return null;
};

/**
 * Authentication middleware - validates JWT token
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Access token is required',
        code: 'TOKEN_MISSING',
      });
      return;
    }

    // Validate token
    const payload = await jwtService.validateAccessToken(token);

    // Attach user info to request
    req.user = payload;
    req.token = token;

    logger.debug('User authenticated successfully', {
      userId: payload.userId,
      email: payload.email,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: (error as Error).message });

    if ((error as Error).message === 'Token expired') {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Access token has expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    if ((error as Error).message === 'Invalid token') {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid access token',
        code: 'TOKEN_INVALID',
      });
      return;
    }

    if ((error as Error).message === 'Token is blacklisted') {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Access token has been revoked',
        code: 'TOKEN_REVOKED',
      });
      return;
    }

    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED',
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = await jwtService.validateAccessToken(token);
      req.user = payload;
      req.token = token;
    }

    next();
  } catch (error) {
    // Log the error but don't fail the request
    logger.debug('Optional authentication failed', { 
      error: (error as Error).message 
    });
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles,
      });

      res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    next();
  };
};

/**
 * Admin authorization middleware
 */
export const requireAdmin = authorize('admin', 'super_admin');

// Keep the old names for backward compatibility
export const authenticate = authMiddleware;
export const optionalAuthenticate = optionalAuthMiddleware;

/**
 * Pro user authorization middleware
 */
export const requirePro = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  // Check if user has pro subscription
  // This would typically check the user's subscription status from database
  // For now, we'll check if user role includes 'pro'
  const hasProAccess = ['pro', 'admin', 'super_admin'].includes(req.user.role);

  if (!hasProAccess) {
    res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: 'Pro subscription required',
      code: 'PRO_REQUIRED',
    });
    return;
  }

  next();
};

/**
 * User ownership middleware - ensures user can only access their own resources
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    
    // Admin can access any resource
    if (['admin', 'super_admin'].includes(req.user.role)) {
      next();
      return;
    }

    // Check if user owns the resource
    if (req.user.userId !== resourceUserId) {
      logger.warn('Ownership check failed', {
        userId: req.user.userId,
        resourceUserId,
        userIdParam,
      });

      res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Access denied - resource ownership required',
        code: 'OWNERSHIP_REQUIRED',
      });
      return;
    }

    next();
  };
};

/**
 * Rate limit bypass for authenticated users
 */
export const bypassRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && ['admin', 'super_admin'].includes(req.user.role)) {
    // Set a flag to bypass rate limiting
    (req as any).bypassRateLimit = true;
  }
  next();
};