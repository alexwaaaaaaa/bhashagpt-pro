import OpenAI from 'openai';
import { env, APP_CONFIG } from './config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export interface ChatCompletionOptions {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  language?: string;
  learningLevel?: 'beginner' | 'intermediate' | 'advanced';
  temperature?: number;
  maxTokens?: number;
}

export interface TranscriptionOptions {
  audioFile: File | Blob;
  language?: string;
  prompt?: string;
}

export class OpenAIService {
  /**
   * Generate chat completion using GPT-4
   */
  static async createChatCompletion(options: ChatCompletionOptions): Promise<string> {
    try {
      const { messages, language = 'English', learningLevel = 'intermediate', temperature = 0.7, maxTokens } = options;

      // Add system prompt based on language and learning level
      const systemPrompt = this.getSystemPrompt(language, learningLevel);
      const messagesWithSystem = [
        { role: 'system' as const, content: systemPrompt },
        ...messages
      ];

      const completion = await openai.chat.completions.create({
        model: APP_CONFIG.openai.model,
        messages: messagesWithSystem,
        temperature,
        max_tokens: maxTokens || APP_CONFIG.openai.maxTokens,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI chat completion error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Create streaming chat completion
   */
  static async createStreamingChatCompletion(
    options: ChatCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const { messages, language = 'English', learningLevel = 'intermediate', temperature = 0.7 } = options;

      const systemPrompt = this.getSystemPrompt(language, learningLevel);
      const messagesWithSystem = [
        { role: 'system' as const, content: systemPrompt },
        ...messages
      ];

      const stream = await openai.chat.completions.create({
        model: APP_CONFIG.openai.model,
        messages: messagesWithSystem,
        temperature,
        max_tokens: APP_CONFIG.openai.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw new Error('Failed to generate streaming AI response');
    }
  }

  /**
   * Transcribe audio using Whisper
   */
  static async transcribeAudio(options: TranscriptionOptions): Promise<string> {
    try {
      const { audioFile, language, prompt } = options;

      // Convert Blob to File if necessary
      const file = audioFile instanceof File 
        ? audioFile 
        : new File([audioFile], 'audio.webm', { type: 'audio/webm' });

      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: language ? this.getWhisperLanguageCode(language) : undefined,
        prompt,
        response_format: 'text',
      });

      return transcription;
    } catch (error) {
      console.error('OpenAI transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Generate speech from text
   */
  static async generateSpeech(text: string, voice: string = 'alloy'): Promise<ArrayBuffer> {
    try {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as any,
        input: text,
      });

      return await mp3.arrayBuffer();
    } catch (error) {
      console.error('OpenAI speech generation error:', error);
      throw new Error('Failed to generate speech');
    }
  }

  /**
   * Get system prompt based on language and learning level
   */
  private static getSystemPrompt(language: string, learningLevel: string): string {
    const basePrompt = APP_CONFIG.openai.systemPrompts[learningLevel] || APP_CONFIG.openai.systemPrompts.default;
    
    return `${basePrompt} You are helping the user learn ${language}. 
    Adapt your responses to their learning level (${learningLevel}). 
    Provide corrections, explanations, and encouragement as appropriate. 
    If they make mistakes, gently correct them and explain why.`;
  }

  /**
   * Convert language name to Whisper language code
   */
  private static getWhisperLanguageCode(language: string): string {
    const languageMap: Record<string, string> = {
      'English': 'en',
      'Spanish': 'es',
      'French': 'fr',
      'German': 'de',
      'Italian': 'it',
      'Portuguese': 'pt',
      'Hindi': 'hi',
      'Chinese': 'zh',
      'Japanese': 'ja',
    };

    return languageMap[language] || 'en';
  }

  /**
   * Estimate token count for text
   */
  static estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if request is within token limits
   */
  static isWithinTokenLimit(messages: Array<{ content: string }>, maxTokens: number = APP_CONFIG.openai.maxTokens): boolean {
    const totalTokens = messages.reduce((sum, msg) => sum + this.estimateTokenCount(msg.content), 0);
    return totalTokens <= maxTokens * 0.8; // Leave 20% buffer for response
  }
}

export default OpenAIService;