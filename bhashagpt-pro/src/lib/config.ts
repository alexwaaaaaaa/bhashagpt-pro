import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
    // Supabase Configuration
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL').optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required').optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required').optional(),

    // OpenAI Configuration
    OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required').optional(),
    OPENAI_MODEL: z.string().default('gpt-4'),
    OPENAI_MAX_TOKENS: z.string().default('2000').transform(Number),

    // D-ID Avatar API
    DID_API_KEY: z.string().optional(),
    DID_BASE_URL: z.string().url().default('https://api.d-id.com'),

    // Google Translate API
    GOOGLE_TRANSLATE_API_KEY: z.string().optional(),

    // Stripe Payment Gateway
    STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // Razorpay (Alternative Payment for India)
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),

    // Twilio (SMS/Video)
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),

    // Email Service
    SENDGRID_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),

    // Redis Cache
    REDIS_URL: z.string().optional(),

    // App Configuration
    NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
    NEXTAUTH_SECRET: z.string().min(1, 'NextAuth secret is required').optional(),
    NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    
    // Backend API
    BACKEND_URL: z.string().url().default('http://localhost:5001'),

    // Feature Flags
    ENABLE_AVATAR_FEATURE: z.string().default('true').transform((val: string) => val === 'true'),
    ENABLE_VOICE_FEATURE: z.string().default('true').transform((val: string) => val === 'true'),
    ENABLE_TRANSLATION_FEATURE: z.string().default('true').transform((val: string) => val === 'true'),
});

// Validate environment variables
function validateEnv() {
    try {
        return envSchema.parse(process.env);
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            const missingVars = error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
            console.warn(`Environment validation warnings:\n${missingVars.join('\n')}`);
        }
        // Return process.env as fallback for development
        return process.env as Record<string, string | undefined>;
    }
}

// Export validated environment variables
export const env = validateEnv();

// App Configuration Constants
export const APP_CONFIG = {
    name: 'BhashaGPT Pro',
    description: 'AI-powered multilingual language learning platform',
    version: '1.0.0',
    author: 'BhashaGPT Team',

    // URLs
    baseUrl: env.NEXTAUTH_URL || 'http://localhost:3000',
    apiUrl: `${env.NEXTAUTH_URL || 'http://localhost:3000'}/api`,
    backendUrl: env.BACKEND_URL || 'http://localhost:5001',

    // Supported Languages
    supportedLanguages: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
        { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
        { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
        { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
        { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
        { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
        { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
        { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
    ],

    // Feature Flags
    features: {
        avatar: env.ENABLE_AVATAR_FEATURE ?? true,
        voice: env.ENABLE_VOICE_FEATURE ?? true,
        translation: env.ENABLE_TRANSLATION_FEATURE ?? true,
    },

    // API Limits
    limits: {
        free: {
            chatMessages: 50,
            voiceMinutes: 10,
            avatarVideos: 0,
            translationsPerDay: 100,
        },
        pro: {
            chatMessages: -1, // unlimited
            voiceMinutes: -1, // unlimited
            avatarVideos: -1, // unlimited
            translationsPerDay: -1, // unlimited
        },
    },

    // OpenAI Configuration
    openai: {
        model: env.OPENAI_MODEL || 'gpt-4',
        maxTokens: env.OPENAI_MAX_TOKENS || 2000,
        temperature: 0.7,
        systemPrompts: {
            default: 'You are BhashaGPT, a helpful AI language tutor. Help users learn languages through conversation.',
            beginner: 'You are BhashaGPT, a patient AI language tutor for beginners. Use simple language and provide explanations.',
            intermediate: 'You are BhashaGPT, an AI language tutor for intermediate learners. Provide detailed explanations and corrections.',
            advanced: 'You are BhashaGPT, an AI language tutor for advanced learners. Engage in complex conversations and provide nuanced feedback.',
        },
    },

    // Subscription Plans
    subscriptionPlans: {
        free: {
            id: 'free',
            name: 'Free',
            price: 0,
            currency: 'USD',
            interval: 'month',
            features: [
                '50 chat messages per month',
                '10 minutes of voice interaction',
                'Basic translation support',
                'Community support',
            ],
        },
        pro: {
            id: 'pro',
            name: 'Pro',
            price: 9.99,
            currency: 'USD',
            interval: 'month',
            features: [
                'Unlimited chat messages',
                'Unlimited voice interaction',
                'AI avatar responses',
                'Advanced translation',
                'Priority support',
                'Learning analytics',
            ],
        },
    },
} as const;

// API Endpoints
export const API_ENDPOINTS = {
    // Authentication
    auth: {
        login: '/api/auth/login',
        register: '/api/auth/register',
        logout: '/api/auth/logout',
        profile: '/api/auth/profile',
    },

    // Chat
    chat: {
        completion: '/api/chat/completion',
        sessions: '/api/chat/sessions',
        messages: '/api/chat/messages',
        translate: '/api/chat/translate',
    },

    // Voice
    voice: {
        transcribe: '/api/voice/transcribe',
        synthesize: '/api/voice/synthesize',
        languages: '/api/voice/languages',
    },

    // Avatar
    avatar: {
        generate: '/api/avatar/generate',
        video: '/api/avatar/video',
        customize: '/api/avatar/customize',
    },

    // Profile
    profile: {
        update: '/api/profile/update',
        avatar: '/api/profile/avatar',
        preferences: '/api/profile/preferences',
    },

    // Subscriptions
    subscriptions: {
        plans: '/api/subscriptions/plans',
        create: '/api/subscriptions/create',
        update: '/api/subscriptions/update',
        cancel: '/api/subscriptions/cancel',
        status: '/api/subscriptions/status',
    },

    // Payments
    payments: {
        createIntent: '/api/payments/create-intent',
        webhook: '/api/payments/webhook',
    },
} as const;

// Database Table Names
export const DB_TABLES = {
    users: 'users',
    profiles: 'profiles',
    chatSessions: 'chat_sessions',
    messages: 'messages',
    subscriptions: 'user_subscriptions',
    subscriptionPlans: 'subscription_plans',
    usageTracking: 'usage_tracking',
    notifications: 'notifications',
} as const;

// Error Codes
export const ERROR_CODES = {
    // Authentication Errors
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',

    // API Errors
    OPENAI_API_ERROR: 'OPENAI_API_ERROR',
    TRANSLATION_API_ERROR: 'TRANSLATION_API_ERROR',
    AVATAR_API_ERROR: 'AVATAR_API_ERROR',

    // Subscription Errors
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',

    // General Errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

// Export types for TypeScript
export type SupportedLanguage = typeof APP_CONFIG.supportedLanguages[number];
export type SubscriptionPlan = keyof typeof APP_CONFIG.subscriptionPlans;
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];