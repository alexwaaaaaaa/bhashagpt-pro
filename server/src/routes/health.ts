import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

interface HealthResponse {
  success: boolean;
  data: {
    status: string;
    timestamp: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    version: string;
    services?: {
      database: string;
      redis: string;
      openai: string;
    };
  };
}

// Basic health check
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const healthData: HealthResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    },
  };

  res.status(200).json(healthData);
}));

// Detailed health check
router.get('/detailed', asyncHandler(async (_req: Request, res: Response) => {
  // TODO: Add database and Redis health checks
  const healthData: HealthResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      services: {
        database: 'healthy', // TODO: Implement actual check
        redis: 'healthy',    // TODO: Implement actual check
        openai: 'healthy',   // TODO: Implement actual check
      },
    },
  };

  res.status(200).json(healthData);
}));

export default router;