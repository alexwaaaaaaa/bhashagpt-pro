import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      errors: errors.array(),
      path: req.path,
      method: req.method,
      userId: req.user?.id
    });

    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: 'param' in error ? error.param : 'unknown',
        message: error.msg,
        value: 'value' in error ? error.value : undefined
      }))
    });
    return;
  }

  next();
};

// Export alias for backward compatibility
export const validateRequest = validate;