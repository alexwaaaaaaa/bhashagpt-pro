// Google Gemini AI Service - Free and High Quality
import axios from 'axios';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiChatChunk {
  content: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class GeminiService {
  private static readonly BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  private static readonly MODEL = 'gemini-pro';
  
  /**
   * Chat completion with Gemini Pro (Free)
   */
  static async *createChatCompletion(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    userId?: string;
    language?: string;
  }): AsyncIterable<GeminiChatChunk> {
    try {
      const { messages, language = 'en', userId, temperature = 0.7 } = params;
      
      logger.info('Gemini chat completion request', {
        userId,
        messageCount: messages.length,
        language,
        model: this.MODEL
      });

      // Convert messages to Gemini format
      const geminiMessages = this.convertToGeminiFormat(messages, language);
      
      const response = await this.callGeminiAPI(geminiMessages, temperature);
      
      // Stream the response
      yield* this.streamResponse(response);

      logger.info('Gemini chat completion completed', {
        userId,
        responseLength: response.length,
      });

    } catch (error) {
      logger.error('Gemini chat completion error', { error, userId: params.userId });
      
      // Fallback to local response
      const fallbackResponse = this.getFallbackResponse(params.language || 'en');
      yield* this.streamResponse(fallbackResponse);
    }
  }

  /**
   * Call Gemini API
   */
  private static async callGeminiAPI(
    messages: GeminiMessage[], 
    temperature: number = 0.7
  ): Promise<string> {
    try {
      const apiKey = env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }

      const response = await axios.post(
        `${this.BASE_URL}/${this.MODEL}:generateContent?key=${apiKey}`,
        {
          contents: messages,
          generationConfig: {
            temperature,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if ((response.data as any)?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return (response.data as any).candidates[0].content.parts[0].text;
      }
      
      throw new Error('Invalid Gemini response format');

    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Gemini API rate limit exceeded. Please try again in a moment.');
      } else if (error.response?.status === 403) {
        throw new Error('Gemini API key is invalid or expired.');
      } else if (error.response?.data?.error?.message) {
        throw new Error(`Gemini API error: ${error.response.data.error.message}`);
      }
      
      logger.error('Gemini API call failed', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data 
      });
      
      throw error;
    }
  }

  /**
   * Convert standard messages to Gemini format
   */
  private static convertToGeminiFormat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    language: string
  ): GeminiMessage[] {
    const geminiMessages: GeminiMessage[] = [];
    
    // Add system prompt as first user message
    const systemPrompt = this.getSystemPrompt(language);
    geminiMessages.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
    
    // Add a model response to acknowledge the system prompt
    geminiMessages.push({
      role: 'model',
      parts: [{ text: 'I understand. I\'m ready to help you learn languages!' }]
    });

    // Convert conversation messages
    for (const message of messages) {
      if (message.role === 'system') continue; // Skip system messages (already handled)
      
      const role = message.role === 'assistant' ? 'model' : 'user';
      geminiMessages.push({
        role,
        parts: [{ text: message.content }]
      });
    }

    return geminiMessages;
  }

  /**
   * Get system prompt for language learning
   */
  private static getSystemPrompt(language: string): string {
    const prompts = {
      en: `You are BhashaGPT, a friendly and encouraging AI language tutor. Your personality is warm, patient, and culturally aware.

CORE PRINCIPLES:
- Always be encouraging and positive
- Provide gentle corrections without being harsh
- Use culturally appropriate examples and references
- Adapt your teaching style to the user's learning level
- Include pronunciation tips when helpful
- Celebrate progress and milestones
- Keep responses concise but helpful
- Focus on practical, everyday conversations

Please respond in a helpful, encouraging manner and assist with language learning.`,

      es: `Eres BhashaGPT, un tutor de idiomas AI amigable y alentador. Tu personalidad es cálida, paciente y culturalmente consciente.

PRINCIPIOS FUNDAMENTALES:
- Siempre sé alentador y positivo
- Proporciona correcciones suaves sin ser duro
- Usa ejemplos y referencias culturalmente apropiados
- Adapta tu estilo de enseñanza al nivel de aprendizaje del usuario
- Incluye consejos de pronunciación cuando sea útil
- Celebra el progreso y los hitos
- Mantén las respuestas concisas pero útiles
- Enfócate en conversaciones prácticas y cotidianas

Por favor responde de manera útil y alentadora, y ayuda con el aprendizaje de idiomas.`,

      hi: `आप BhashaGPT हैं, एक मित्रवत और प्रोत्साहनजनक AI भाषा शिक्षक। आपका व्यक्तित्व गर्म, धैर्यवान और सांस्कृतिक रूप से जागरूक है।

मूल सिद्धांत:
- हमेशा प्रोत्साहनजनक और सकारात्मक रहें
- कठोर हुए बिना सौम्य सुधार प्रदान करें
- सांस्कृतिक रूप से उपयुक्त उदाहरण और संदर्भ का उपयोग करें
- उपयोगकर्ता के सीखने के स्तर के अनुसार अपनी शिक्षण शैली को अनुकूलित करें
- जब सहायक हो तो उच्चारण युक्तियां शामिल करें
- प्रगति और मील के पत्थर का जश्न मनाएं
- उत्तर संक्षिप्त लेकिन सहायक रखें
- व्यावहारिक, रोजमर्रा की बातचीत पर ध्यान दें

कृपया सहायक, प्रोत्साहनजनक तरीके से जवाब दें और भाषा सीखने में सहायता करें।`
    };

    return prompts[language as keyof typeof prompts] || prompts.en;
  }

  /**
   * Translation using Gemini
   */
  static async translateText(
    text: string, 
    fromLang: string, 
    toLang: string
  ): Promise<string> {
    try {
      const prompt = `Translate the following text from ${fromLang} to ${toLang}. Only provide the translation, no explanations:

"${text}"`;

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      const translation = await this.callGeminiAPI(messages, 0.3);
      
      // Clean up the response (remove quotes if present)
      return translation.replace(/^["']|["']$/g, '').trim();

    } catch (error) {
      logger.error('Gemini translation error', { error });
      return `[Translation Error: ${text}]`;
    }
  }

  /**
   * Language detection using Gemini
   */
  static async detectLanguage(text: string): Promise<{
    language: string;
    confidence: number;
    alternatives: Array<{ language: string; confidence: number }>;
  }> {
    try {
      const prompt = `Detect the language of this text and respond in JSON format only:
{
  "language": "language_code",
  "confidence": 0.95,
  "alternatives": [{"language": "code", "confidence": 0.05}]
}

Text: "${text}"`;

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      const response = await this.callGeminiAPI(messages, 0.1);
      
      try {
        const result = JSON.parse(response);
        return {
          language: result.language || 'en',
          confidence: Math.min(Math.max(result.confidence || 0.8, 0), 1),
          alternatives: result.alternatives || []
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          language: 'en',
          confidence: 0.5,
          alternatives: []
        };
      }

    } catch (error) {
      logger.error('Gemini language detection error', { error });
      return {
        language: 'en',
        confidence: 0.5,
        alternatives: []
      };
    }
  }

  /**
   * Grammar correction using Gemini
   */
  static async correctGrammar(
    text: string, 
    language: string = 'en'
  ): Promise<{
    correctedText: string;
    corrections: Array<{
      original: string;
      corrected: string;
      explanation: string;
    }>;
  }> {
    try {
      const prompt = `Please correct the grammar in this ${language} text and explain the corrections in JSON format:

{
  "correctedText": "corrected version",
  "corrections": [
    {
      "original": "wrong part",
      "corrected": "correct part", 
      "explanation": "why it was wrong"
    }
  ]
}

Text to correct: "${text}"`;

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      const response = await this.callGeminiAPI(messages, 0.3);
      
      try {
        const result = JSON.parse(response);
        return {
          correctedText: result.correctedText || text,
          corrections: result.corrections || []
        };
      } catch (parseError) {
        return {
          correctedText: text,
          corrections: []
        };
      }

    } catch (error) {
      logger.error('Gemini grammar correction error', { error });
      return {
        correctedText: text,
        corrections: []
      };
    }
  }

  /**
   * Stream response word by word
   */
  private static async *streamResponse(response: string): AsyncIterable<GeminiChatChunk> {
    const words = response.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const isLast = i === words.length - 1;
      
      yield {
        content: word + (isLast ? '' : ' '),
        done: false,
      };
      
      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    // Final chunk with usage info
    yield {
      content: '',
      done: true,
      usage: {
        promptTokens: 0, // Gemini doesn't provide token counts
        completionTokens: words.length,
        totalTokens: words.length,
      },
    };
  }

  /**
   * Fallback responses when API fails
   */
  private static getFallbackResponse(language: string): string {
    const fallbacks = {
      en: "I'm here to help you learn languages! What would you like to practice today?",
      es: "¡Estoy aquí para ayudarte a aprender idiomas! ¿Qué te gustaría practicar hoy?",
      hi: "मैं यहाँ आपकी भाषा सीखने में मदद करने के लिए हूँ! आज आप क्या अभ्यास करना चाहेंगे?",
      fr: "Je suis là pour vous aider à apprendre les langues ! Que souhaitez-vous pratiquer aujourd'hui ?",
      de: "Ich bin hier, um Ihnen beim Sprachenlernen zu helfen! Was möchten Sie heute üben?"
    };

    return fallbacks[language as keyof typeof fallbacks] || fallbacks.en;
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      if (!env.GEMINI_API_KEY) {
        return false;
      }

      // Simple test call
      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'Hello' }]
        }
      ];

      await this.callGeminiAPI(messages, 0.5);
      return true;

    } catch (error) {
      logger.error('Gemini health check failed', { error });
      return false;
    }
  }

  /**
   * Get API usage info
   */
  static getServiceInfo() {
    return {
      provider: 'Google Gemini',
      model: this.MODEL,
      hasApiKey: !!env.GEMINI_API_KEY,
      features: [
        'Chat Completion',
        'Translation', 
        'Language Detection',
        'Grammar Correction'
      ],
      limits: {
        requestsPerMinute: 15,
        requestsPerDay: 1500,
        cost: 'Free'
      }
    };
  }
}

export const geminiService = new GeminiService();