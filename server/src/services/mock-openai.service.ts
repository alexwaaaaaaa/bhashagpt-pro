// Mock OpenAI Service for Testing (No API Key Required)
import { logger } from '../utils/logger';

export interface MockChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MockChatChunk {
  content: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class MockOpenAIService {
  // Mock responses for different languages
  private static mockResponses = {
    en: [
      "Hello! I'm here to help you learn languages. What would you like to practice today?",
      "Great question! Let me explain that concept to you.",
      "You're doing well! Keep practicing and you'll improve quickly.",
      "That's a common mistake. Here's the correct way to say it...",
      "Excellent pronunciation! You're making great progress."
    ],
    es: [
      "¡Hola! Estoy aquí para ayudarte a aprender idiomas. ¿Qué te gustaría practicar hoy?",
      "¡Excelente pregunta! Déjame explicarte ese concepto.",
      "¡Lo estás haciendo bien! Sigue practicando y mejorarás rápidamente.",
      "Ese es un error común. Aquí está la forma correcta de decirlo...",
      "¡Excelente pronunciación! Estás progresando muy bien."
    ],
    fr: [
      "Bonjour! Je suis là pour vous aider à apprendre les langues. Que souhaitez-vous pratiquer aujourd'hui?",
      "Excellente question! Laissez-moi vous expliquer ce concept.",
      "Vous vous débrouillez bien! Continuez à pratiquer et vous vous améliorerez rapidement.",
      "C'est une erreur courante. Voici la bonne façon de le dire...",
      "Excellente prononciation! Vous faites de grands progrès."
    ],
    hi: [
      "नमस्ते! मैं यहाँ आपकी भाषा सीखने में मदद करने के लिए हूँ। आज आप क्या अभ्यास करना चाहेंगे?",
      "बहुत अच्छा सवाल! मैं आपको यह अवधारणा समझाता हूँ।",
      "आप अच्छा कर रहे हैं! अभ्यास करते रहें और आप जल्दी सुधार करेंगे।",
      "यह एक आम गलती है। इसे कहने का सही तरीका यह है...",
      "उत्कृष्ट उच्चारण! आप बहुत अच्छी प्रगति कर रहे हैं।"
    ]
  };

  /**
   * Mock chat completion with streaming
   */
  static async *createChatCompletion(params: {
    messages: MockChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    userId?: string;
    language?: string;
  }): AsyncIterable<MockChatChunk> {
    try {
      const { messages, language = 'en', userId } = params;
      
      logger.info('Mock OpenAI chat completion request', {
        userId,
        messageCount: messages.length,
        language,
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get user's last message
      const userMessage = messages[messages.length - 1]?.content || '';
      
      // Generate mock response based on language and content
      const response = this.generateMockResponse(userMessage, language);
      
      // Simulate streaming response
      const words = response.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const isLast = i === words.length - 1;
        
        yield {
          content: word + (isLast ? '' : ' '),
          done: false,
        };
        
        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Final chunk with usage info
      yield {
        content: '',
        done: true,
        usage: {
          promptTokens: userMessage.length / 4, // Rough estimate
          completionTokens: response.length / 4,
          totalTokens: (userMessage.length + response.length) / 4,
        },
      };

      logger.info('Mock OpenAI chat completion completed', {
        userId,
        responseLength: response.length,
      });

    } catch (error) {
      logger.error('Mock OpenAI chat completion error', { error, userId: params.userId });
      throw new Error('Mock AI response generation failed');
    }
  }

  /**
   * Mock audio transcription
   */
  static async transcribeAudio(
    audioBuffer: Buffer,
    options: {
      language?: string;
      model?: string;
      prompt?: string;
      temperature?: number;
    } = {}
  ): Promise<{
    text: string;
    language: string;
    duration: number;
  }> {
    try {
      logger.info('Mock OpenAI transcription request', {
        audioSize: audioBuffer.length,
        language: options.language,
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock transcription responses
      const mockTranscriptions = [
        "Hello, how are you today?",
        "I would like to learn Spanish.",
        "Can you help me with pronunciation?",
        "What is the weather like?",
        "Thank you for your help.",
        "I am practicing my language skills.",
        "This is a test of the speech recognition system."
      ];

      const randomTranscription = mockTranscriptions[
        Math.floor(Math.random() * mockTranscriptions.length)
      ];

      const result = {
        text: randomTranscription,
        language: options.language || 'en',
        duration: Math.random() * 10 + 2, // 2-12 seconds
      };

      logger.info('Mock OpenAI transcription completed', {
        textLength: result.text.length,
        language: result.language,
        duration: result.duration,
      });

      return result;

    } catch (error) {
      logger.error('Mock OpenAI transcription error', { error });
      throw new Error('Mock transcription failed');
    }
  }

  /**
   * Mock speech generation
   */
  static async generateSpeech(
    text: string,
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy',
    model: 'tts-1' | 'tts-1-hd' = 'tts-1'
  ): Promise<Buffer> {
    try {
      logger.info('Mock OpenAI TTS request', {
        textLength: text.length,
        voice,
        model,
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generate mock audio buffer (empty MP3 header)
      const mockAudioData = Buffer.from([
        0xFF, 0xFB, 0x90, 0x00, // MP3 header
        ...Array(1000).fill(0) // Empty audio data
      ]);

      logger.info('Mock OpenAI TTS completed', {
        audioSize: mockAudioData.length,
      });

      return mockAudioData;

    } catch (error) {
      logger.error('Mock OpenAI TTS error', { error });
      throw new Error('Mock speech generation failed');
    }
  }

  /**
   * Generate contextual mock response
   */
  private static generateMockResponse(userMessage: string, language: string): string {
    const responses = this.mockResponses[language as keyof typeof this.mockResponses] || this.mockResponses.en;
    
    // Simple keyword-based response selection
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('namaste')) {
      return responses[0];
    } else if (lowerMessage.includes('help') || lowerMessage.includes('question')) {
      return responses[1];
    } else if (lowerMessage.includes('practice') || lowerMessage.includes('learn')) {
      return responses[2];
    } else if (lowerMessage.includes('mistake') || lowerMessage.includes('wrong')) {
      return responses[3];
    } else if (lowerMessage.includes('pronunciation') || lowerMessage.includes('speak')) {
      return responses[4];
    } else {
      // Random response
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  /**
   * Mock health check
   */
  static async healthCheck(): Promise<boolean> {
    return true; // Mock service is always "healthy"
  }
}

export const mockOpenaiService = new MockOpenAIService();