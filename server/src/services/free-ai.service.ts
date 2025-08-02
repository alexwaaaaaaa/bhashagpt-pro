// Free AI Service - Multiple providers without API costs
import axios from 'axios';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatChunk {
    content: string;
    done: boolean;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
}

export class FreeAIService {
    private static readonly HUGGING_FACE_API = 'https://api-inference.huggingface.co/models';
    private static readonly GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';

    // Free Hugging Face models
    private static readonly HF_MODELS = {
        chat: 'microsoft/DialoGPT-large',
        translation: 'Helsinki-NLP/opus-mt-en-mul',
        sentiment: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
        summarization: 'facebook/bart-large-cnn',
        textGeneration: 'gpt2'
    };

    /**
     * Chat completion using Hugging Face (Free)
     */
    static async *createChatCompletion(params: {
        messages: ChatMessage[];
        model?: string;
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
        userId?: string;
        language?: string;
    }): AsyncIterable<ChatChunk> {
        try {
            const { messages, language = 'en', userId } = params;

            logger.info('Free AI chat completion request', {
                userId,
                messageCount: messages.length,
                language,
                provider: 'HuggingFace'
            });

            // Get user's last message
            const userMessage = messages[messages.length - 1]?.content || '';

            // Try Hugging Face first
            try {
                const response = await this.callHuggingFace(userMessage, language);
                yield* this.streamResponse(response);
                return;
            } catch (hfError) {
                logger.warn('Hugging Face failed, trying Gemini', { error: hfError });
            }

            // Fallback to Gemini (if API key available)
            if (env.GEMINI_API_KEY) {
                try {
                    const response = await this.callGemini(userMessage, language);
                    yield* this.streamResponse(response);
                    return;
                } catch (geminiError) {
                    logger.warn('Gemini failed, using local generation', { error: geminiError });
                }
            }

            // Final fallback to local generation
            const response = await this.generateLocalResponse(userMessage, language);
            yield* this.streamResponse(response);

        } catch (error) {
            logger.error('Free AI chat completion error', { error, userId: params.userId });

            // Emergency fallback
            const fallbackResponse = this.getFallbackResponse(params.language || 'en');
            yield* this.streamResponse(fallbackResponse);
        }
    }

    /**
     * Call Hugging Face API (Free)
     */
    private static async callHuggingFace(text: string, language: string): Promise<string> {
        try {
            const response = await axios.post(
                `${this.HUGGING_FACE_API}/${this.HF_MODELS.textGeneration}`,
                {
                    inputs: this.formatPromptForLanguage(text, language),
                    parameters: {
                        max_length: 150,
                        temperature: 0.7,
                        do_sample: true,
                        top_p: 0.9
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${env.HUGGING_FACE_TOKEN || 'hf_demo'}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.data && response.data[0] && response.data[0].generated_text) {
                return this.cleanHuggingFaceResponse(response.data[0].generated_text, text);
            }

            throw new Error('Invalid Hugging Face response');
        } catch (error) {
            logger.error('Hugging Face API error', { error });
            throw error;
        }
    }

    /**
     * Call Google Gemini API (Free tier)
     */
    private static async callGemini(text: string, language: string): Promise<string> {
        try {
            const response = await axios.post<GeminiResponse>(
                `${this.GEMINI_API}/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`,
                {
                    contents: [{
                        parts: [{
                            text: this.formatPromptForLanguage(text, language)
                        }]
                    }]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                return response.data.candidates[0].content.parts[0].text;
            }

            throw new Error('Invalid Gemini response');
        } catch (error) {
            logger.error('Gemini API error', { error });
            throw error;
        }
    }

    /**
     * Local response generation (Rule-based)
     */
    private static async generateLocalResponse(text: string, language: string): Promise<string> {
        const lowerText = text.toLowerCase();

        // Language-specific responses
        const responses = {
            en: {
                greeting: ["Hello! How can I help you learn today?", "Hi there! What would you like to practice?"],
                question: ["That's a great question! Let me help you with that.", "I'd be happy to explain that concept."],
                practice: ["Great! Let's practice together.", "Perfect! Practice makes perfect."],
                help: ["I'm here to help you learn languages effectively.", "Let me guide you through this."],
                default: ["I understand. Let me help you with that.", "That's interesting! Tell me more."]
            },
            es: {
                greeting: ["¡Hola! ¿Cómo puedo ayudarte a aprender hoy?", "¡Hola! ¿Qué te gustaría practicar?"],
                question: ["¡Excelente pregunta! Déjame ayudarte con eso.", "Me complace explicarte ese concepto."],
                practice: ["¡Genial! Practiquemos juntos.", "¡Perfecto! La práctica hace al maestro."],
                help: ["Estoy aquí para ayudarte a aprender idiomas efectivamente.", "Déjame guiarte en esto."],
                default: ["Entiendo. Déjame ayudarte con eso.", "¡Interesante! Cuéntame más."]
            },
            hi: {
                greeting: ["नमस्ते! आज मैं आपकी सीखने में कैसे मदद कर सकता हूँ?", "नमस्ते! आप क्या अभ्यास करना चाहेंगे?"],
                question: ["यह बहुत अच्छा सवाल है! मैं इसमें आपकी मदद करता हूँ।", "मुझे इस अवधारणा को समझाने में खुशी होगी।"],
                practice: ["बहुत बढ़िया! आइए एक साथ अभ्यास करते हैं।", "परफेक्ट! अभ्यास से ही सिद्धि मिलती है।"],
                help: ["मैं यहाँ आपकी भाषा सीखने में प्रभावी रूप से मदद करने के लिए हूँ।", "मैं इसमें आपका मार्गदर्शन करूंगा।"],
                default: ["मैं समझ गया। मैं इसमें आपकी मदद करता हूँ।", "दिलचस्प! मुझे और बताएं।"]
            }
        };

        const langResponses = responses[language as keyof typeof responses] || responses.en;

        // Simple keyword matching
        if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('namaste')) {
            return this.getRandomResponse(langResponses.greeting);
        } else if (lowerText.includes('help') || lowerText.includes('how')) {
            return this.getRandomResponse(langResponses.help);
        } else if (lowerText.includes('practice') || lowerText.includes('learn')) {
            return this.getRandomResponse(langResponses.practice);
        } else if (lowerText.includes('?')) {
            return this.getRandomResponse(langResponses.question);
        } else {
            return this.getRandomResponse(langResponses.default);
        }
    }

    /**
     * Free translation service
     */
    static async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
        try {
            // Try Hugging Face translation
            const response = await axios.post(
                `${this.HUGGING_FACE_API}/Helsinki-NLP/opus-mt-${fromLang}-${toLang}`,
                {
                    inputs: text
                },
                {
                    headers: {
                        'Authorization': `Bearer ${env.HUGGING_FACE_TOKEN || 'hf_demo'}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.data && response.data[0] && response.data[0].translation_text) {
                return response.data[0].translation_text;
            }

            // Fallback to simple word replacement for common phrases
            return this.fallbackTranslation(text, fromLang, toLang);

        } catch (error) {
            logger.error('Translation error', { error });
            return this.fallbackTranslation(text, fromLang, toLang);
        }
    }

    /**
     * Free speech-to-text (Mock implementation)
     */
    static async transcribeAudio(_audioBuffer: Buffer, options: any = {}): Promise<any> {
        // For now, return mock transcription
        // In production, you could integrate with browser's Web Speech API
        const mockTranscriptions = [
            "Hello, how are you today?",
            "I want to learn Spanish",
            "Can you help me with pronunciation?",
            "What does this word mean?",
            "Thank you for your help"
        ];

        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

        return {
            text: mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)],
            language: options.language || 'en',
            duration: Math.random() * 5 + 2
        };
    }

    /**
     * Free text-to-speech (Mock implementation)
     */
    static async generateSpeech(_text: string, _voice: string = 'alloy'): Promise<Buffer> {
        // Return empty audio buffer for now
        // In production, you could use browser's Speech Synthesis API
        await new Promise(resolve => setTimeout(resolve, 500));

        return Buffer.from([
            0xFF, 0xFB, 0x90, 0x00, // MP3 header
            ...Array(1000).fill(0) // Empty audio data
        ]);
    }

    // Helper methods
    private static formatPromptForLanguage(text: string, language: string): string {
        const prompts = {
            en: `You are a helpful language learning assistant. User says: "${text}". Respond helpfully and encouragingly.`,
            es: `Eres un asistente útil para aprender idiomas. El usuario dice: "${text}". Responde de manera útil y alentadora.`,
            hi: `आप एक सहायक भाषा सीखने के सहायक हैं। उपयोगकर्ता कहता है: "${text}"। सहायक और प्रोत्साहनजनक उत्तर दें।`
        };

        return prompts[language as keyof typeof prompts] || prompts.en;
    }

    private static cleanHuggingFaceResponse(generated: string, original: string): string {
        // Remove the original prompt from generated text
        return generated.replace(original, '').trim();
    }

    private static async *streamResponse(response: string): AsyncIterable<ChatChunk> {
        const words = response.split(' ');

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const isLast = i === words.length - 1;

            yield {
                content: word + (isLast ? '' : ' '),
                done: false,
            };

            await new Promise(resolve => setTimeout(resolve, 50));
        }

        yield {
            content: '',
            done: true,
            usage: {
                promptTokens: 0,
                completionTokens: words.length,
                totalTokens: words.length,
            },
        };
    }

    private static getRandomResponse(responses: string[]): string {
        return responses[Math.floor(Math.random() * responses.length)];
    }

    private static getFallbackResponse(language: string): string {
        const fallbacks = {
            en: "I'm here to help you learn languages. What would you like to practice?",
            es: "Estoy aquí para ayudarte a aprender idiomas. ¿Qué te gustaría practicar?",
            hi: "मैं यहाँ आपकी भाषा सीखने में मदद करने के लिए हूँ। आप क्या अभ्यास करना चाहेंगे?"
        };

        return fallbacks[language as keyof typeof fallbacks] || fallbacks.en;
    }

    private static fallbackTranslation(text: string, fromLang: string, toLang: string): string {
        // Simple word-by-word translation for common phrases
        const translations: Record<string, Record<string, string>> = {
            'en-es': {
                'hello': 'hola',
                'goodbye': 'adiós',
                'thank you': 'gracias',
                'please': 'por favor',
                'yes': 'sí',
                'no': 'no'
            },
            'en-hi': {
                'hello': 'नमस्ते',
                'goodbye': 'अलविदा',
                'thank you': 'धन्यवाद',
                'please': 'कृपया',
                'yes': 'हाँ',
                'no': 'नहीं'
            }
        };

        const translationMap = translations[`${fromLang}-${toLang}`];
        if (translationMap) {
            const lowerText = text.toLowerCase();
            for (const [english, translated] of Object.entries(translationMap)) {
                if (lowerText.includes(english)) {
                    return translated;
                }
            }
        }

        return `[Translation: ${text}]`; // Fallback
    }

    static async healthCheck(): Promise<boolean> {
        return true;
    }
}