// AI Service Wrapper - Multiple providers (OpenAI, Free APIs, Mock)
import { env } from '../config/environment';
import { openaiService } from './openai.service';
import { MockOpenAIService } from './mock-openai.service';
import { FreeAIService } from './free-ai.service';
import { GeminiService } from './gemini.service';
import { logger } from '../utils/logger';

type AIProvider = 'openai' | 'gemini' | 'free' | 'mock';

export class AIService {
  private static getProvider(): AIProvider {
    const provider = env.AI_PROVIDER as AIProvider;
    
    // Auto-detect best available provider
    if (provider === 'openai' && env.OPENAI_API_KEY) {
      return 'openai';
    } else if (provider === 'gemini' && env.GEMINI_API_KEY) {
      return 'gemini';
    } else if ((provider === 'free' || provider === 'gemini') && env.GEMINI_API_KEY) {
      return 'gemini'; // Prefer Gemini over Hugging Face
    } else if (provider === 'free' || !env.OPENAI_API_KEY) {
      return 'free';
    } else {
      return 'mock';
    }
  }

  static async *createChatCompletion(params: any): AsyncIterable<any> {
    const provider = this.getProvider();
    
    switch (provider) {
      case 'openai':
        logger.info('Using OpenAI API');
        yield* openaiService.createChatCompletion(params);
        break;
        
      case 'gemini':
        logger.info('Using Google Gemini API (Free)');
        yield* GeminiService.createChatCompletion(params);
        break;
        
      case 'free':
        logger.info('Using Free AI APIs (Hugging Face fallback)');
        yield* FreeAIService.createChatCompletion(params);
        break;
        
      case 'mock':
      default:
        logger.info('Using Mock AI (no API required)');
        yield* MockOpenAIService.createChatCompletion(params);
        break;
    }
  }

  static async transcribeAudio(audioBuffer: Buffer, options: any = {}) {
    const provider = this.getProvider();
    
    switch (provider) {
      case 'openai':
        logger.info('Using OpenAI Whisper API');
        return await openaiService.transcribeAudio(audioBuffer, options);
        
      case 'free':
        logger.info('Using Free Speech-to-Text');
        return await FreeAIService.transcribeAudio(audioBuffer, options);
        
      case 'mock':
      default:
        logger.info('Using Mock transcription');
        return await MockOpenAIService.transcribeAudio(audioBuffer, options);
    }
  }

  static async generateSpeech(text: string, voice: any = 'alloy', model: any = 'tts-1') {
    const provider = this.getProvider();
    
    switch (provider) {
      case 'openai':
        logger.info('Using OpenAI TTS API');
        return await openaiService.generateSpeech(text, voice, model);
        
      case 'free':
        logger.info('Using Free Text-to-Speech');
        return await FreeAIService.generateSpeech(text, voice);
        
      case 'mock':
      default:
        logger.info('Using Mock TTS');
        return await MockOpenAIService.generateSpeech(text, voice, model);
    }
  }

  static async translateText(text: string, fromLang: string, toLang: string) {
    const provider = this.getProvider();
    
    switch (provider) {
      case 'gemini':
        logger.info('Using Gemini Translation');
        return await GeminiService.translateText(text, fromLang, toLang);
        
      case 'free':
        logger.info('Using Free Translation API');
        return await FreeAIService.translateText(text, fromLang, toLang);
        
      case 'openai':
      case 'mock':
      default:
        // Fallback to simple translation
        return `[${toLang.toUpperCase()}] ${text}`;
    }
  }

  static async detectLanguage(text: string) {
    const provider = this.getProvider();
    
    switch (provider) {
      case 'gemini':
        logger.info('Using Gemini Language Detection');
        return await GeminiService.detectLanguage(text);
        
      case 'free':
        logger.info('Using Free Language Detection');
        // Fallback to simple detection
        return {
          language: 'en',
          confidence: 0.5,
          alternatives: []
        };
        
      case 'openai':
      case 'mock':
      default:
        return {
          language: 'en',
          confidence: 0.5,
          alternatives: []
        };
    }
  }

  static async correctGrammar(text: string, language: string = 'en') {
    const provider = this.getProvider();
    
    switch (provider) {
      case 'gemini':
        logger.info('Using Gemini Grammar Correction');
        return await GeminiService.correctGrammar(text, language);
        
      case 'openai':
      case 'free':
      case 'mock':
      default:
        return {
          correctedText: text,
          corrections: []
        };
    }
  }

  static async healthCheck(): Promise<boolean> {
    const provider = this.getProvider();
    
    switch (provider) {
      case 'openai':
        return await openaiService.healthCheck();
      case 'gemini':
        return await GeminiService.healthCheck();
      case 'free':
        return await FreeAIService.healthCheck();
      case 'mock':
      default:
        return await MockOpenAIService.healthCheck();
    }
  }

  static getServiceInfo() {
    const provider = this.getProvider();
    
    const baseInfo = {
      provider,
      hasOpenAIKey: !!env.OPENAI_API_KEY,
      hasHuggingFaceToken: !!env.HUGGING_FACE_TOKEN,
      hasGeminiKey: !!env.GEMINI_API_KEY,
      mockMode: provider === 'mock',
      freeMode: provider === 'free' || provider === 'gemini',
      description: this.getProviderDescription(provider)
    };

    // Add provider-specific info
    switch (provider) {
      case 'gemini':
        return {
          ...baseInfo,
          ...GeminiService.getServiceInfo()
        };
      case 'openai':
        return {
          ...baseInfo,
          model: 'GPT-4/GPT-3.5',
          features: ['Chat', 'TTS', 'STT', 'Translation']
        };
      case 'free':
        return {
          ...baseInfo,
          model: 'Hugging Face Models',
          features: ['Chat', 'Translation']
        };
      case 'mock':
      default:
        return {
          ...baseInfo,
          model: 'Mock Responses',
          features: ['Chat', 'TTS', 'STT']
        };
    }
  }

  private static getProviderDescription(provider: AIProvider): string {
    switch (provider) {
      case 'openai':
        return 'Using OpenAI GPT-4/GPT-3.5 (Paid API)';
      case 'gemini':
        return 'Using Google Gemini Pro (Free API)';
      case 'free':
        return 'Using Free AI APIs (Hugging Face)';
      case 'mock':
        return 'Using Mock AI (No API required)';
      default:
        return 'Unknown provider';
    }
  }
}

export const aiService = new AIService();