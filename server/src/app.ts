import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/environment';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { generalRateLimit } from './middleware/rate-limit.middleware';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import { translationRoutes } from './routes/translation';
import healthRoutes from './routes/health';
import subscriptionRoutes from './routes/subscription';
import webhookRoutes from './routes/webhook';
import languageTutorRoutes from './routes/language-tutor';
import avatarRoutes from './routes/avatar';
// import voiceProcessingRoutes from './routes/voice-processing';
import aiInfoRoutes from './routes/ai-info';

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
app.use(compression());

// Request logging
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) },
}));

// Webhook routes (before body parsing for raw body access)
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.JWT_SECRET));

// Rate limiting
app.use(generalRateLimit);

// API Routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/translate', translationRoutes);
apiRouter.use('/subscription', subscriptionRoutes);
apiRouter.use('/tutor', languageTutorRoutes);
apiRouter.use('/avatar', avatarRoutes);
// apiRouter.use('/voice', voiceProcessingRoutes);
apiRouter.use('/ai', aiInfoRoutes);
apiRouter.use('/health', healthRoutes);

app.use('/api/v1', apiRouter);

// Health check endpoint
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

// Global error handler
app.use(errorHandler);

export { app };