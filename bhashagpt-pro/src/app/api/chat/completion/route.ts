import { NextRequest, NextResponse } from 'next/server';
import { env, APP_CONFIG, ERROR_CODES } from '@/lib/config';

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const key = `${userId}_${new Date().toDateString()}`;
    const limit = APP_CONFIG.limits.free.chatMessages;
    
    const userLimit = rateLimitStore.get(key);
    
    if (!userLimit) {
        rateLimitStore.set(key, { count: 1, resetTime: now + 24 * 60 * 60 * 1000 });
        return { allowed: true };
    }
    
    if (now > userLimit.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + 24 * 60 * 60 * 1000 });
        return { allowed: true };
    }
    
    if (userLimit.count >= limit) {
        return { allowed: false, resetTime: userLimit.resetTime };
    }
    
    userLimit.count++;
    return { allowed: true };
}

function generateSystemPrompt(language: string, learningLevel: string): string {
    const languageNames: Record<string, string> = {
        'en': 'English',
        'hi': 'Hindi',
        'bn': 'Bengali',
        'te': 'Telugu',
        'ta': 'Tamil',
        'gu': 'Gujarati',
        'mr': 'Marathi',
        'kn': 'Kannada',
        'ml': 'Malayalam',
        'pa': 'Punjabi',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean'
    };
    
    const targetLanguage = languageNames[language] || 'English';
    
    // Special handling for Indian learners learning English
    const isEnglishForIndians = language === 'en';
    
    const basePrompt = `You are BhashaGPT, a friendly and encouraging AI language tutor specializing in ${targetLanguage}. Your personality is warm, patient, and culturally aware.

CORE PRINCIPLES:
- Always be encouraging and positive
- Provide gentle corrections without being harsh
- Use culturally appropriate examples and references for Indian learners
- Adapt your teaching style to the user's learning level
- Include pronunciation tips when helpful
- Celebrate progress and milestones
${isEnglishForIndians ? `
- You can understand Hindi/Hinglish and respond in English with Hindi explanations when needed
- Use Indian context examples (like Indian festivals, food, places)
- Help with common Indian English pronunciation challenges
- Explain differences between British and American English when relevant` : ''}

LEARNING LEVEL: ${learningLevel}`;

    const levelSpecificPrompts = {
        beginner: `
- Use simple vocabulary and short sentences
- Explain grammar concepts clearly with examples
- Provide Hindi translations when helpful for Indian learners
- Focus on practical, everyday conversations relevant to Indian context
- Repeat key phrases for reinforcement
- Use familiar Indian examples (like "I am going to the market" instead of "mall")`,
        intermediate: `
- Use moderate vocabulary with occasional new words
- Explain nuanced grammar and usage
- Provide cultural context for expressions
- Encourage longer conversations about Indian topics
- Correct mistakes while maintaining flow
- Introduce idioms and phrases commonly used in Indian English`,
        advanced: `
- Use sophisticated vocabulary and complex structures
- Discuss cultural nuances and idiomatic expressions
- Engage in debates and abstract topics relevant to Indian context
- Provide subtle corrections and alternatives
- Challenge the user with advanced concepts
- Help with formal English for professional/academic contexts`
    };

    return basePrompt + (levelSpecificPrompts[learningLevel as keyof typeof levelSpecificPrompts] || levelSpecificPrompts.intermediate);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { 
            messages, 
            language = 'en', 
            learningLevel = 'intermediate', 
            userId = 'anonymous' 
        } = body;

        // Input validation
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: 'Messages array is required and cannot be empty', code: ERROR_CODES.VALIDATION_ERROR },
                { status: 400 }
            );
        }

        // Validate message format
        for (const message of messages) {
            if (!message.role || !message.content || typeof message.content !== 'string') {
                return NextResponse.json(
                    { error: 'Invalid message format. Each message must have role and content.', code: ERROR_CODES.VALIDATION_ERROR },
                    { status: 400 }
                );
            }
        }

        // Rate limiting check
        const rateCheck = checkRateLimit(userId);
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { 
                    error: 'Daily message limit exceeded. Please upgrade to Pro for unlimited messages.',
                    code: ERROR_CODES.QUOTA_EXCEEDED,
                    resetTime: rateCheck.resetTime
                },
                { status: 429 }
            );
        }

        // Generate system prompt
        const systemPrompt = generateSystemPrompt(language, learningLevel);
        const systemMessage = {
            role: 'system' as const,
            content: systemPrompt
        };

        // Prepare messages for OpenAI (limit context to last 10 messages)
        const contextMessages = messages.slice(-10);
        const openaiMessages = [systemMessage, ...contextMessages];

        // Call backend API
        const backendUrl = APP_CONFIG.backendUrl;
        const backendResponse = await fetch(`${backendUrl}/api/v1/chat/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: contextMessages,
                language,
                stream: false // We'll handle streaming on frontend
            })
        });

        if (!backendResponse.ok) {
            const errorData = await backendResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Backend API error: ${backendResponse.status}`);
        }

        const backendData = await backendResponse.json();

        // Create a readable stream for the response
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    const response = backendData.response || '';
                    const words = response.split(' ');
                    
                    // Simulate streaming by sending words one by one
                    for (let i = 0; i < words.length; i++) {
                        const word = words[i];
                        const isLast = i === words.length - 1;
                        
                        const data = `data: ${JSON.stringify({ 
                            content: word + (isLast ? '' : ' '), 
                            done: false 
                        })}\n\n`;
                        controller.enqueue(encoder.encode(data));
                        
                        // Small delay to simulate streaming
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    
                    // Send completion signal with metadata
                    const endData = `data: ${JSON.stringify({ 
                        content: '', 
                        done: true, 
                        metadata: { 
                            totalTokens: backendData.usage?.totalTokens || response.length,
                            language,
                            learningLevel,
                            provider: backendData.provider || 'free'
                        }
                    })}\n\n`;
                    controller.enqueue(encoder.encode(endData));
                    controller.close();
                } catch (streamError) {
                    console.error('Streaming error:', streamError);
                    const errorData = `data: ${JSON.stringify({ 
                        error: 'Stream interrupted. Please try again.',
                        code: ERROR_CODES.INTERNAL_SERVER_ERROR
                    })}\n\n`;
                    controller.enqueue(encoder.encode(errorData));
                    controller.close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });

    } catch (error) {
        console.error('Chat completion error:', error);
        
        if (error instanceof Error) {
            // Handle backend API errors
            if (error.message.includes('rate_limit') || error.message.includes('Rate limit')) {
                return NextResponse.json(
                    { 
                        error: 'Rate limit exceeded. Please try again in a few minutes.',
                        code: ERROR_CODES.RATE_LIMIT_EXCEEDED
                    },
                    { status: 429 }
                );
            }
            
            if (error.message.includes('Backend API error')) {
                return NextResponse.json(
                    { 
                        error: 'AI service temporarily unavailable. Please try again.',
                        code: ERROR_CODES.INTERNAL_SERVER_ERROR
                    },
                    { status: 503 }
                );
            }
        }

        return NextResponse.json(
            { 
                error: 'Failed to generate response. Please try again.',
                code: ERROR_CODES.INTERNAL_SERVER_ERROR
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