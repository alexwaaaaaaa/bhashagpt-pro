import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export interface TutorContext {
  userId: string;
  targetLanguage: string;
  nativeLanguage: string;
  proficiencyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'NATIVE';
  conversationHistory: ConversationMessage[];
  learningGoals?: string[];
  culturalContext?: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  corrections?: GrammarCorrection[];
  vocabulary?: VocabularyItem[];
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
  rule: string;
}

export interface VocabularyItem {
  word: string;
  translation: string;
  pronunciation: string;
  context: string;
  difficulty: number;
}

export interface TutorResponse {
  message: string;
  nativeTranslation?: string;
  corrections: GrammarCorrection[];
  vocabulary: VocabularyItem[];
  culturalInsight?: string;
  pronunciationTips?: string[];
  nextSuggestions: string[];
  difficultyAdjustment?: 'easier' | 'harder' | 'maintain';
}

export class LanguageTutorService {
  private static readonly SYSTEM_PROMPTS = {
    BEGINNER: `You are BhashaGPT, a patient and encouraging multilingual AI language tutor. You're helping a BEGINNER learner.

Guidelines:
- Use simple vocabulary and short sentences
- Always provide translations in their native language
- Focus on basic grammar patterns
- Encourage every attempt, even if incorrect
- Provide clear pronunciation guides using phonetic spelling
- Introduce cultural context gradually
- Ask simple questions to keep conversation flowing
- Correct mistakes gently with explanations

Response format:
1. Your response in the target language (simple)
2. Translation in native language
3. Any corrections with gentle explanations
4. New vocabulary with pronunciation
5. Cultural tip if relevant
6. Encouraging next question or topic`,

    INTERMEDIATE: `You are BhashaGPT, a supportive multilingual AI language tutor. You're helping an INTERMEDIATE learner.

Guidelines:
- Use moderate vocabulary with some challenging words
- Mix simple and complex sentence structures
- Provide translations when introducing new concepts
- Focus on common grammar mistakes
- Include idiomatic expressions gradually
- Share relevant cultural insights
- Encourage longer responses
- Provide detailed grammar explanations

Response format:
1. Your response in target language (moderate complexity)
2. Translation for new/difficult parts
3. Grammar corrections with rules
4. Vocabulary expansion with context
5. Cultural insights and context
6. Pronunciation tips for difficult sounds
7. Follow-up questions to deepen conversation`,

    ADVANCED: `You are BhashaGPT, a sophisticated multilingual AI language tutor. You're helping an ADVANCED learner.

Guidelines:
- Use complex vocabulary and varied sentence structures
- Include idioms, colloquialisms, and formal language
- Provide minimal translations (only for very advanced concepts)
- Focus on nuanced grammar and style
- Share deep cultural insights and context
- Encourage native-like expression
- Challenge with complex topics
- Provide subtle corrections

Response format:
1. Your response in target language (complex and natural)
2. Minimal translations (only when necessary)
3. Nuanced corrections focusing on style and fluency
4. Advanced vocabulary and expressions
5. Rich cultural context and insights
6. Pronunciation refinements
7. Thought-provoking follow-up questions`,

    NATIVE: `You are BhashaGPT, a multilingual AI conversation partner. You're chatting with a NATIVE speaker who wants to maintain/improve their language skills.

Guidelines:
- Use natural, native-level language
- Include regional variations and slang when appropriate
- Focus on style, eloquence, and sophisticated expression
- Provide cultural references and context
- Engage in complex, nuanced discussions
- Correct only very subtle mistakes
- Challenge with advanced topics and concepts

Response format:
1. Natural conversation in target language
2. Sophisticated vocabulary and expressions
3. Cultural references and insights
4. Style and eloquence suggestions
5. Complex follow-up topics`
  };

  static async generateTutorResponse(
    context: TutorContext,
    userMessage: string
  ): Promise<TutorResponse> {
    try {
      // Get user's learning progress
      const userProgress = await this.getUserProgress(context.userId, context.targetLanguage);
      
      // Build conversation context
      const messages = await this.buildConversationMessages(context, userMessage, userProgress);
      
      // Generate response with retry logic
      const response = await this.generateResponseWithRetry(messages, context);
      
      // Parse and structure the response
      const structuredResponse = await this.parseAndStructureResponse(response, context);
      
      // Save conversation to database
      await this.saveConversation(context.userId, userMessage, structuredResponse);
      
      // Update user progress
      await this.updateUserProgress(context.userId, context.targetLanguage, structuredResponse);
      
      return structuredResponse;
    } catch (error) {
      logger.error('Failed to generate tutor response', { error, userId: context.userId });
      throw new Error('Failed to generate response');
    }
  }

  static async generateStreamResponse(
    context: TutorContext,
    userMessage: string
  ): Promise<AsyncIterable<string>> {
    try {
      const userProgress = await this.getUserProgress(context.userId, context.targetLanguage);
      const messages = await this.buildConversationMessages(context, userMessage, userProgress);

      const stream = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      return this.processStreamResponse(stream, context, userMessage);
    } catch (error) {
      logger.error('Failed to generate stream response', { error, userId: context.userId });
      throw new Error('Failed to generate stream response');
    }
  }

  private static async buildConversationMessages(
    context: TutorContext,
    userMessage: string,
    userProgress: any
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
    const systemPrompt = this.SYSTEM_PROMPTS[context.proficiencyLevel];
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${systemPrompt}

Target Language: ${context.targetLanguage}
Native Language: ${context.nativeLanguage}
User Level: ${context.proficiencyLevel}
Learning Goals: ${context.learningGoals?.join(', ') || 'General conversation practice'}

User Progress:
- Total conversations: ${userProgress?.totalLessons || 0}
- Streak: ${userProgress?.streakDays || 0} days
- XP Points: ${userProgress?.xpPoints || 0}
- Common mistakes: ${userProgress?.commonMistakes || 'None identified yet'}

${context.culturalContext ? 'Include cultural context and insights in your responses.' : ''}

Remember to be encouraging, patient, and adapt your language complexity to the user's level.`
      }
    ];

    // Add recent conversation history (last 10 messages)
    const recentHistory = context.conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  private static async generateResponseWithRetry(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    context: TutorContext,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages,
          temperature: 0.7,
          max_tokens: 1000,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error('Empty response from OpenAI');
        }

        // Filter inappropriate content
        if (await this.containsInappropriateContent(response)) {
          throw new Error('Response contains inappropriate content');
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Attempt ${attempt} failed`, { error, userId: context.userId });
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('Failed to generate response after retries');
  }

  private static async parseAndStructureResponse(
    response: string,
    context: TutorContext
  ): Promise<TutorResponse> {
    // Use AI to parse the response into structured format
    try {
      const parsePrompt = `Parse this language tutoring response into structured JSON format:

Response: "${response}"

Extract:
1. Main message in target language
2. Translation/explanation in native language (if provided)
3. Grammar corrections (original -> corrected with explanation)
4. New vocabulary items (word, translation, pronunciation, context)
5. Cultural insights
6. Pronunciation tips
7. Suggested follow-up questions

Return valid JSON only.`;

      const parseCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: parsePrompt }],
        temperature: 0.1,
        max_tokens: 800,
      });

      const parsedContent = parseCompletion.choices[0]?.message?.content;
      if (parsedContent) {
        try {
          const structured = JSON.parse(parsedContent);
          return {
            message: structured.message || response,
            nativeTranslation: structured.nativeTranslation,
            corrections: structured.corrections || [],
            vocabulary: structured.vocabulary || [],
            culturalInsight: structured.culturalInsight,
            pronunciationTips: structured.pronunciationTips || [],
            nextSuggestions: structured.nextSuggestions || [],
            difficultyAdjustment: structured.difficultyAdjustment
          };
        } catch (parseError) {
          logger.warn('Failed to parse structured response', { parseError });
        }
      }
    } catch (error) {
      logger.warn('Failed to structure response', { error });
    }

    // Fallback to basic structure
    return {
      message: response,
      corrections: [],
      vocabulary: [],
      nextSuggestions: [],
    };
  }

  private static async *processStreamResponse(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
    context: TutorContext,
    userMessage: string
  ): AsyncIterable<string> {
    let fullResponse = '';

    try {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield content;
        }
      }

      // Save the complete conversation after streaming
      if (fullResponse) {
        const structuredResponse = await this.parseAndStructureResponse(fullResponse, context);
        await this.saveConversation(context.userId, userMessage, structuredResponse);
        await this.updateUserProgress(context.userId, context.targetLanguage, structuredResponse);
      }
    } catch (error) {
      logger.error('Error in stream processing', { error, userId: context.userId });
      throw error;
    }
  }

  private static async containsInappropriateContent(content: string): Promise<boolean> {
    try {
      const moderation = await openai.moderations.create({
        input: content,
      });

      return moderation.results[0]?.flagged || false;
    } catch (error) {
      logger.warn('Failed to check content moderation', { error });
      return false; // Fail open
    }
  }

  private static async getUserProgress(userId: string, language: string) {
    try {
      return await prisma.userProgress.findUnique({
        where: {
          userId_language: {
            userId,
            language,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get user progress', { error, userId });
      return null;
    }
  }

  private static async saveConversation(
    userId: string,
    userMessage: string,
    tutorResponse: TutorResponse
  ): Promise<void> {
    try {
      // Find or create active chat session
      let session = await prisma.chatSession.findFirst({
        where: {
          userId,
          isArchived: false,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (!session) {
        session = await prisma.chatSession.create({
          data: {
            userId,
            title: 'Language Learning Session',
            language: 'multilingual',
            learningLevel: 'INTERMEDIATE',
          },
        });
      }

      // Save user message
      await prisma.message.create({
        data: {
          sessionId: session.id,
          userId,
          role: 'user',
          content: userMessage,
          isAi: false,
        },
      });

      // Save tutor response
      await prisma.message.create({
        data: {
          sessionId: session.id,
          userId,
          role: 'assistant',
          content: tutorResponse.message,
          translatedContent: tutorResponse.nativeTranslation,
          isAi: true,
        },
      });

      // Update session
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      logger.error('Failed to save conversation', { error, userId });
    }
  }

  private static async updateUserProgress(
    userId: string,
    language: string,
    response: TutorResponse
  ): Promise<void> {
    try {
      const xpGained = this.calculateXP(response);
      
      await prisma.userProgress.upsert({
        where: {
          userId_language: {
            userId,
            language,
          },
        },
        update: {
          totalLessons: { increment: 1 },
          xpPoints: { increment: xpGained },
          lastStudyAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          userId,
          language,
          level: 'BEGINNER',
          totalLessons: 1,
          xpPoints: xpGained,
          lastStudyAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to update user progress', { error, userId });
    }
  }

  private static calculateXP(response: TutorResponse): number {
    let xp = 10; // Base XP for conversation

    // Bonus XP for corrections learned
    xp += response.corrections.length * 5;

    // Bonus XP for new vocabulary
    xp += response.vocabulary.length * 3;

    // Bonus XP for cultural insights
    if (response.culturalInsight) xp += 8;

    return xp;
  }

  // Vocabulary building exercises
  static async generateVocabularyExercise(
    userId: string,
    language: string,
    topic?: string
  ): Promise<any> {
    try {
      const userProgress = await this.getUserProgress(userId, language);
      const level = userProgress?.level || 'BEGINNER';

      const prompt = `Create a vocabulary building exercise for a ${level} level ${language} learner.
      ${topic ? `Focus on the topic: ${topic}` : 'Choose an appropriate everyday topic.'}
      
      Include:
      1. 5-8 new vocabulary words with translations
      2. Example sentences using each word
      3. A short dialogue or story incorporating the words
      4. 3 practice questions
      5. Cultural context for the vocabulary
      
      Format as JSON.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      return response ? JSON.parse(response) : null;
    } catch (error) {
      logger.error('Failed to generate vocabulary exercise', { error, userId });
      throw new Error('Failed to generate vocabulary exercise');
    }
  }

  // Grammar correction with explanations
  static async analyzeGrammar(
    text: string,
    language: string,
    userLevel: string
  ): Promise<GrammarCorrection[]> {
    try {
      const prompt = `Analyze this ${language} text for grammar mistakes. User level: ${userLevel}

Text: "${text}"

For each mistake, provide:
1. The original incorrect phrase
2. The corrected version
3. A clear explanation appropriate for ${userLevel} level
4. The grammar rule being applied

Focus on the most important mistakes for this level. Format as JSON array.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800,
      });

      const response = completion.choices[0]?.message?.content;
      return response ? JSON.parse(response) : [];
    } catch (error) {
      logger.error('Failed to analyze grammar', { error });
      return [];
    }
  }

  // Cultural insights
  static async getCulturalInsight(
    language: string,
    topic: string,
    userLevel: string
  ): Promise<string> {
    try {
      const prompt = `Provide a cultural insight about ${topic} in ${language}-speaking cultures.
      
      Make it appropriate for a ${userLevel} level learner:
      - Use appropriate vocabulary level
      - Include practical applications
      - Make it engaging and memorable
      - Connect to language usage when possible
      
      Keep it concise but informative (2-3 paragraphs).`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 400,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('Failed to get cultural insight', { error });
      return '';
    }
  }
}