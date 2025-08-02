import * as dotenv from 'dotenv';
import * as Joi from 'joi';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  API_VERSION: Joi.string().default('v1'),
  
  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_POOL_SIZE: Joi.number().default(10),
  
  // Redis
  REDIS_URL: Joi.string().required(),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),
  
  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  
  // AI Configuration
  AI_PROVIDER: Joi.string().valid('openai', 'gemini', 'free', 'mock').default('gemini'),
  USE_MOCK_OPENAI: Joi.boolean().default(false),
  
  // OpenAI
  OPENAI_API_KEY: Joi.string().allow('').default(''),
  OPENAI_MODEL: Joi.string().default('gpt-4'),
  OPENAI_MAX_TOKENS: Joi.number().default(2000),
  OPENAI_TEMPERATURE: Joi.number().min(0).max(2).default(0.7),
  
  // Free AI Providers
  HUGGING_FACE_TOKEN: Joi.string().allow('').default(''),
  GEMINI_API_KEY: Joi.string().allow('').default(''),
  
  // Google Translate
  GOOGLE_TRANSLATE_API_KEY: Joi.string().allow('').default(''),
  
  // Stripe
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  
  // D-ID
  DID_API_KEY: Joi.string().allow('').default(''),
  DID_BASE_URL: Joi.string().default('https://api.d-id.com'),
  
  // CDN
  CDN_BASE_URL: Joi.string().allow('').default(''),
  CDN_ACCESS_KEY: Joi.string().allow('').default(''),
  CDN_SECRET_KEY: Joi.string().allow('').default(''),
  
  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  COOKIE_SECRET: Joi.string().required(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  RATE_LIMIT_FREE_MAX: Joi.number().default(50),
  RATE_LIMIT_PRO_MAX: Joi.number().default(1000),
  
  // File Upload
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  UPLOAD_PATH: Joi.string().default('./uploads'),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE_PATH: Joi.string().default('./logs'),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  nodeEnv: envVars.NODE_ENV as 'development' | 'production' | 'test',
  port: envVars.PORT as number,
  apiVersion: envVars.API_VERSION as string,
  
  // Database
  database: {
    url: envVars.DATABASE_URL as string,
    poolSize: envVars.DATABASE_POOL_SIZE as number,
  },
  
  // Redis
  redis: {
    url: envVars.REDIS_URL as string,
    password: envVars.REDIS_PASSWORD as string,
    db: envVars.REDIS_DB as number,
  },
  
  // JWT
  jwt: {
    secret: envVars.JWT_SECRET as string,
    refreshSecret: envVars.JWT_REFRESH_SECRET as string,
    expiresIn: envVars.JWT_EXPIRES_IN as string,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN as string,
  },
  
  // OpenAI
  openai: {
    apiKey: envVars.OPENAI_API_KEY as string,
    model: envVars.OPENAI_MODEL as string,
    maxTokens: envVars.OPENAI_MAX_TOKENS as number,
    temperature: envVars.OPENAI_TEMPERATURE as number,
  },
  
  // Google Translate
  googleTranslate: {
    apiKey: envVars.GOOGLE_TRANSLATE_API_KEY as string,
  },
  
  // Stripe
  stripe: {
    secretKey: envVars.STRIPE_SECRET_KEY as string,
    publishableKey: envVars.STRIPE_PUBLISHABLE_KEY as string,
    webhookSecret: envVars.STRIPE_WEBHOOK_SECRET as string,
  },
  
  // D-ID
  did: {
    apiKey: envVars.DID_API_KEY as string,
    baseUrl: envVars.DID_BASE_URL as string,
  },
  
  // CDN
  cdn: {
    baseUrl: envVars.CDN_BASE_URL as string,
    accessKey: envVars.CDN_ACCESS_KEY as string,
    secretKey: envVars.CDN_SECRET_KEY as string,
  },
  
  // Security
  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS as number,
    cookieSecret: envVars.COOKIE_SECRET as string,
  },
  
  // CORS
  corsOrigins: (envVars.CORS_ORIGIN as string).split(',').map(origin => origin.trim()),
  
  // Rate Limiting
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS as number,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS as number,
    freeMax: envVars.RATE_LIMIT_FREE_MAX as number,
    proMax: envVars.RATE_LIMIT_PRO_MAX as number,
  },
  
  // File Upload
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE as number,
    path: envVars.UPLOAD_PATH as string,
  },
  
  // Logging
  logging: {
    level: envVars.LOG_LEVEL as string,
    filePath: envVars.LOG_FILE_PATH as string,
  },
};// A
// Also export raw env vars for direct access
export const env = envVars;