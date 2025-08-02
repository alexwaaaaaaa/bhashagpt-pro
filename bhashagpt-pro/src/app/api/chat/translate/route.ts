import { NextRequest, NextResponse } from 'next/server';
import { env, APP_CONFIG, ERROR_CODES } from '@/lib/config';

// Translation cache with TTL (in production, use Redis)
interface CacheEntry {
    translatedText: string;
    timestamp: number;
    sourceLanguage: string;
}

const translationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting for translations
const translationRateLimit = new Map<string, { count: number; resetTime: number }>();

function checkTranslationRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const key = `translate_${userId}_${new Date().toDateString()}`;
    const limit = APP_CONFIG.limits.free.translationsPerDay;

    const userLimit = translationRateLimit.get(key);

    if (!userLimit) {
        translationRateLimit.set(key, { count: 1, resetTime: now + 24 * 60 * 60 * 1000 });
        return { allowed: true };
    }

    if (now > userLimit.resetTime) {
        translationRateLimit.set(key, { count: 1, resetTime: now + 24 * 60 * 60 * 1000 });
        return { allowed: true };
    }

    if (userLimit.count >= limit) {
        return { allowed: false, resetTime: userLimit.resetTime };
    }

    userLimit.count++;
    return { allowed: true };
}

function getCachedTranslation(cacheKey: string): CacheEntry | null {
    const cached = translationCache.get(cacheKey);
    if (!cached) return null;

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        translationCache.delete(cacheKey);
        return null;
    }

    return cached;
}

function setCachedTranslation(cacheKey: string, translatedText: string, sourceLanguage: string): void {
    // Limit cache size (keep last 1000 entries)
    if (translationCache.size >= 1000) {
        const firstKey = translationCache.keys().next().value;
        if (firstKey) {
            translationCache.delete(firstKey);
        }
    }

    translationCache.set(cacheKey, {
        translatedText,
        timestamp: Date.now(),
        sourceLanguage
    });
}

function validateLanguageCode(code: string): boolean {
    const supportedCodes = APP_CONFIG.supportedLanguages.map(lang => lang.code) as string[];
    const additionalCodes = ['es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'auto'];
    return supportedCodes.includes(code) || additionalCodes.includes(code);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            text,
            targetLanguage,
            sourceLanguage = 'auto',
            userId = 'anonymous'
        } = body;

        // Input validation
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json(
                {
                    error: 'Text is required and cannot be empty',
                    code: ERROR_CODES.VALIDATION_ERROR
                },
                { status: 400 }
            );
        }

        if (!targetLanguage || typeof targetLanguage !== 'string') {
            return NextResponse.json(
                {
                    error: 'Target language is required',
                    code: ERROR_CODES.VALIDATION_ERROR
                },
                { status: 400 }
            );
        }

        // Validate language codes
        if (!validateLanguageCode(targetLanguage)) {
            return NextResponse.json(
                {
                    error: 'Invalid target language code',
                    code: ERROR_CODES.VALIDATION_ERROR
                },
                { status: 400 }
            );
        }

        if (sourceLanguage !== 'auto' && !validateLanguageCode(sourceLanguage)) {
            return NextResponse.json(
                {
                    error: 'Invalid source language code',
                    code: ERROR_CODES.VALIDATION_ERROR
                },
                { status: 400 }
            );
        }

        // Check if source and target are the same
        if (sourceLanguage === targetLanguage) {
            return NextResponse.json({
                translatedText: text,
                sourceLanguage,
                targetLanguage,
                cached: false,
                skipped: true
            });
        }

        // Rate limiting check
        const rateCheck = checkTranslationRateLimit(userId);
        if (!rateCheck.allowed) {
            return NextResponse.json(
                {
                    error: 'Daily translation limit exceeded. Please upgrade to Pro for unlimited translations.',
                    code: ERROR_CODES.QUOTA_EXCEEDED,
                    resetTime: rateCheck.resetTime,
                    translatedText: text // Fallback to original
                },
                { status: 429 }
            );
        }

        // Create cache key (normalize text for better cache hits)
        const normalizedText = text.trim().toLowerCase();
        const cacheKey = `${sourceLanguage}-${targetLanguage}-${normalizedText}`;

        // Check cache first
        const cached = getCachedTranslation(cacheKey);
        if (cached) {
            return NextResponse.json({
                translatedText: cached.translatedText,
                sourceLanguage: cached.sourceLanguage,
                targetLanguage,
                cached: true
            });
        }

        // Check if Google Translate API is configured
        if (!env.GOOGLE_TRANSLATE_API_KEY) {
            console.warn('Google Translate API key not configured');
            return NextResponse.json({
                translatedText: text,
                sourceLanguage: sourceLanguage === 'auto' ? 'unknown' : sourceLanguage,
                targetLanguage,
                cached: false,
                error: 'Translation service temporarily unavailable'
            });
        }

        // Call Google Translate API with retry logic
        let lastError: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await fetch(
                    `https://translation.googleapis.com/language/translate/v2?key=${env.GOOGLE_TRANSLATE_API_KEY}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            q: text,
                            target: targetLanguage,
                            source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
                            format: 'text'
                        }),
                        signal: AbortSignal.timeout(10000) // 10 second timeout
                    }
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Translation API error: ${response.status} - ${errorText}`);
                }

                const data = await response.json();

                if (!data.data || !data.data.translations || !data.data.translations[0]) {
                    throw new Error('Invalid response format from translation API');
                }

                const translation = data.data.translations[0];
                const translatedText = translation.translatedText;
                const detectedSourceLanguage = translation.detectedSourceLanguage || sourceLanguage;

                // Cache the successful result
                setCachedTranslation(cacheKey, translatedText, detectedSourceLanguage);

                return NextResponse.json({
                    translatedText,
                    sourceLanguage: detectedSourceLanguage,
                    targetLanguage,
                    cached: false,
                    originalText: text
                });

            } catch (error) {
                lastError = error as Error;
                console.error(`Translation attempt ${attempt + 1} failed:`, error);

                // Wait before retry (exponential backoff)
                if (attempt < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        // All attempts failed
        console.error('All translation attempts failed:', lastError);

        return NextResponse.json(
            {
                error: 'Translation service temporarily unavailable. Please try again.',
                code: ERROR_CODES.TRANSLATION_API_ERROR,
                translatedText: text, // Fallback to original text
                sourceLanguage: sourceLanguage === 'auto' ? 'unknown' : sourceLanguage,
                targetLanguage
            },
            { status: 503 }
        );

    } catch (error) {
        console.error('Translation endpoint error:', error);

        // Try to extract text from request for fallback
        let fallbackText = 'Error processing request';
        try {
            const body = await request.json();
            fallbackText = body.text || fallbackText;
        } catch {
            // Ignore JSON parsing errors
        }

        return NextResponse.json(
            {
                error: 'Internal server error during translation',
                code: ERROR_CODES.INTERNAL_SERVER_ERROR,
                translatedText: fallbackText
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
    );
}