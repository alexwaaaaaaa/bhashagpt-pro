import { openaiService } from './openai.service';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import crypto from 'crypto';

export interface VoiceProcessingOptions {
  language?: string;
  model?: 'whisper-1';
  temperature?: number;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    probability: number;
  }>;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  alternatives: Array<{
    language: string;
    confidence: number;
  }>;
}

export interface TTSOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: 'tts-1' | 'tts-1-hd';
  speed?: number; // 0.25 to 4.0
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac';
}

export interface PronunciationAnalysis {
  overall_score: number;
  accuracy_score: number;
  fluency_score: number;
  completeness_score: number;
  pronunciation_score: number;
  words: Array<{
    word: string;
    accuracy_score: number;
    error_type?: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
    phonemes?: Array<{
      phoneme: string;
      accuracy_score: number;
    }>;
  }>;
  syllables: Array<{
    syllable: string;
    accuracy_score: number;
    offset: number;
    duration: number;
  }>;
}

export interface VoiceCommand {
  command: string;
  confidence: number;
  parameters?: Record<string, any>;
}

export interface AudioProcessingResult {
  processed_audio_url: string;
  noise_reduction_applied: boolean;
  normalization_applied: boolean;
  original_duration: number;
  processed_duration: number;
  quality_score: number;
}

export class VoiceProcessingService {
  private static readonly CACHE_TTL = 3600; // 1 hour
  private static readonly SUPPORTED_LANGUAGES = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'
  ];

  private static readonly VOICE_COMMANDS = {
    'translate': ['translate', 'translation', 'convert'],
    'repeat': ['repeat', 'again', 'once more'],
    'slower': ['slower', 'slow down', 'more slowly'],
    'faster': ['faster', 'speed up', 'quickly'],
    'pause': ['pause', 'stop', 'wait'],
    'continue': ['continue', 'resume', 'go on'],
    'help': ['help', 'assistance', 'what can you do']
  };

  // Speech-to-Text using Whisper API
  static async transcribeAudio(
    audioBuffer: Buffer,
    options: VoiceProcessingOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      const cacheKey = this.generateCacheKey('transcribe', audioBuffer, options);
      
      // Check cache first
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Returning cached transcription result');
        return cached;
      }

      // Preprocess audio if needed
      const processedAudio = await this.preprocessAudio(audioBuffer);

      // Use OpenAI service for transcription
      const response = await openaiService.transcribeAudio((processedAudio as any).buffer || audioBuffer, {
        language: options.language,
        model: options.model || 'whisper-1',
        prompt: options.prompt,
        temperature: options.temperature
      });

      // Process the response
      const result: TranscriptionResult = {
        text: response.text,
        language: response.language || 'unknown',
        confidence: 0.9, // OpenAI doesn't provide confidence, use default
        segments: [], // Not available in current OpenAI response
        words: [] // Not available in current OpenAI response
      };

      // Cache the result
      await this.setCache(cacheKey, result);

      logger.info('Audio transcription completed', {
        language: result.language,
        textLength: result.text.length,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      logger.error('Audio transcription failed', { error });
      throw new Error('Failed to transcribe audio');
    }
  }

  // Language Detection for multilingual input
  static async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    try {
      const cacheKey = this.generateCacheKey('detect_lang', text);
      
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Use OpenAI to detect language
      const prompt = `Detect the language of the following text and provide confidence scores. 
      Respond in JSON format with: {"language": "code", "confidence": 0.95, "alternatives": [{"language": "code", "confidence": 0.05}]}
      
      Text: "${text}"`;

      const completion = openaiService.createChatCompletion({
        messages: [
          { role: 'system', content: 'You are a language detection expert. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        maxTokens: 200,
        stream: false
      });

      let responseContent = '';
      for await (const chunk of completion) {
        responseContent += chunk.content;
        if (chunk.done) break;
      }

      const result = JSON.parse(responseContent);
      
      // Validate and normalize the result
      const detectionResult: LanguageDetectionResult = {
        language: result.language,
        confidence: Math.min(Math.max(result.confidence, 0), 1),
        alternatives: result.alternatives || []
      };

      await this.setCache(cacheKey, detectionResult);
      
      logger.info('Language detection completed', {
        text: text.substring(0, 50),
        detectedLanguage: detectionResult.language,
        confidence: detectionResult.confidence
      });

      return detectionResult;

    } catch (error) {
      logger.error('Language detection failed', { error });
      
      // Fallback to simple heuristics
      return this.fallbackLanguageDetection(text);
    }
  }

  // Audio preprocessing (noise reduction, normalization)
  static async preprocessAudio(audioBuffer: Buffer): Promise<AudioProcessingResult> {
    try {
      logger.info('Starting audio preprocessing', {
        originalSize: audioBuffer.length
      });

      // For now, return the original buffer with metadata
      // In production, you would integrate with audio processing libraries
      // like ffmpeg, sox, or specialized noise reduction services
      
      const result: AudioProcessingResult & { buffer: Buffer } = {
        processed_audio_url: `data:audio/wav;base64,${audioBuffer.toString('base64')}`,
        noise_reduction_applied: false, // Would be true after actual processing
        normalization_applied: false,   // Would be true after actual processing
        original_duration: 0,           // Would calculate from audio
        processed_duration: 0,          // Would calculate from processed audio
        quality_score: 0.8,            // Would calculate based on processing
        buffer: audioBuffer             // Include the buffer for immediate use
      };

      logger.info('Audio preprocessing completed', {
        qualityScore: result.quality_score,
        noiseReduction: result.noise_reduction_applied,
        normalization: result.normalization_applied
      });

      return result;

    } catch (error) {
      logger.error('Audio preprocessing failed', { error });
      throw new Error('Failed to preprocess audio');
    }
  }

  // Text-to-Speech with natural voices
  static async synthesizeSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<Buffer> {
    try {
      const cacheKey = this.generateCacheKey('tts', text, options);
      
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Returning cached TTS result');
        return Buffer.from(cached, 'base64');
      }

      const audioBuffer = await openaiService.generateSpeech(
        text,
        options.voice || 'alloy',
        options.model || 'tts-1'
      );
      
      // Cache the result as base64
      await this.setCache(cacheKey, audioBuffer.toString('base64'));

      logger.info('Text-to-speech synthesis completed', {
        textLength: text.length,
        voice: options.voice,
        audioSize: audioBuffer.length
      });

      return audioBuffer;

    } catch (error) {
      logger.error('Text-to-speech synthesis failed', { error });
      throw new Error('Failed to synthesize speech');
    }
  }

  // Accent and pronunciation analysis
  static async analyzePronunciation(
    audioBuffer: Buffer,
    referenceText: string,
    language: string = 'en'
  ): Promise<PronunciationAnalysis> {
    try {
      const cacheKey = this.generateCacheKey('pronunciation', audioBuffer, { referenceText, language });
      
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // First, transcribe the audio to get the actual spoken text
      const transcription = await this.transcribeAudio(audioBuffer, {
        language,
        response_format: 'verbose_json'
      });

      // Analyze pronunciation by comparing transcription with reference
      const analysis = await this.performPronunciationAnalysis(
        transcription,
        referenceText,
        language
      );

      await this.setCache(cacheKey, analysis);

      logger.info('Pronunciation analysis completed', {
        overallScore: analysis.overall_score,
        accuracyScore: analysis.accuracy_score,
        fluencyScore: analysis.fluency_score
      });

      return analysis;

    } catch (error) {
      logger.error('Pronunciation analysis failed', { error });
      throw new Error('Failed to analyze pronunciation');
    }
  }

  // Voice command recognition
  static async recognizeVoiceCommand(text: string): Promise<VoiceCommand | null> {
    try {
      const normalizedText = text.toLowerCase().trim();
      
      // Check for direct command matches
      for (const [command, variations] of Object.entries(this.VOICE_COMMANDS)) {
        for (const variation of variations) {
          if (normalizedText.includes(variation)) {
            return {
              command,
              confidence: this.calculateCommandConfidence(normalizedText, variation),
              parameters: this.extractCommandParameters(normalizedText, command)
            };
          }
        }
      }

      // Use AI for more complex command recognition
      const aiCommand = await this.recognizeComplexCommand(text);
      if (aiCommand) {
        return aiCommand;
      }

      return null;

    } catch (error) {
      logger.error('Voice command recognition failed', { error });
      return null;
    }
  }

  // Real-time audio streaming support
  static async processAudioStream(
    audioChunk: Buffer,
    streamId: string,
    options: VoiceProcessingOptions = {}
  ): Promise<{ partial_text: string; is_final: boolean; stream_id: string }> {
    try {
      // Store audio chunk in stream buffer
      const streamKey = `audio_stream:${streamId}`;
      const existingBuffer = await redisClient.get(streamKey);
      
      let combinedBuffer: Buffer;
      if (existingBuffer) {
        const existing = Buffer.from(existingBuffer, 'base64');
        combinedBuffer = Buffer.concat([existing, audioChunk]);
      } else {
        combinedBuffer = audioChunk;
      }

      // Store updated buffer
      await redisClient.setex(streamKey, 300, combinedBuffer.toString('base64')); // 5 min TTL

      // Process if we have enough audio (e.g., 1 second worth)
      const minBufferSize = 16000; // Assuming 16kHz sample rate, 1 second
      
      if (combinedBuffer.length >= minBufferSize) {
        const transcription = await this.transcribeAudio(combinedBuffer, {
          ...options,
          response_format: 'json'
        });

        return {
          partial_text: transcription.text,
          is_final: false,
          stream_id: streamId
        };
      }

      return {
        partial_text: '',
        is_final: false,
        stream_id: streamId
      };

    } catch (error) {
      logger.error('Audio stream processing failed', { error, streamId });
      throw new Error('Failed to process audio stream');
    }
  }

  // Finalize audio stream
  static async finalizeAudioStream(streamId: string): Promise<TranscriptionResult> {
    try {
      const streamKey = `audio_stream:${streamId}`;
      const bufferData = await redisClient.get(streamKey);
      
      if (!bufferData) {
        throw new Error('Stream not found or expired');
      }

      const audioBuffer = Buffer.from(bufferData, 'base64');
      const result = await this.transcribeAudio(audioBuffer, {
        response_format: 'verbose_json'
      });

      // Clean up stream data
      await redisClient.del(streamKey);

      logger.info('Audio stream finalized', {
        streamId,
        textLength: result.text.length,
        language: result.language
      });

      return result;

    } catch (error) {
      logger.error('Audio stream finalization failed', { error, streamId });
      throw new Error('Failed to finalize audio stream');
    }
  }

  // Web Speech API fallback support
  static getWebSpeechAPIConfig(language: string = 'en-US') {
    return {
      lang: language,
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      grammars: this.generateSpeechGrammar()
    };
  }

  // Private helper methods
  private static async performPronunciationAnalysis(
    transcription: TranscriptionResult,
    referenceText: string,
    language: string
  ): Promise<PronunciationAnalysis> {
    // Use AI to analyze pronunciation differences
    const prompt = `Analyze pronunciation accuracy by comparing the spoken text with the reference text.
    
    Reference: "${referenceText}"
    Spoken: "${transcription.text}"
    Language: ${language}
    
    Provide detailed pronunciation analysis in JSON format with scores (0-100):
    {
      "overall_score": 85,
      "accuracy_score": 90,
      "fluency_score": 80,
      "completeness_score": 95,
      "pronunciation_score": 85,
      "words": [{"word": "hello", "accuracy_score": 95, "error_type": "None"}],
      "syllables": [{"syllable": "hel", "accuracy_score": 90, "offset": 0, "duration": 0.3}]
    }`;

    try {
      const completion = openaiService.createChatCompletion({
        messages: [
          { role: 'system', content: 'You are a pronunciation analysis expert. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 1000,
        stream: false
      });

      let responseContent = '';
      for await (const chunk of completion) {
        responseContent += chunk.content;
        if (chunk.done) break;
      }

      return JSON.parse(responseContent);
    } catch (error) {
      // Fallback analysis
      return this.fallbackPronunciationAnalysis(transcription.text, referenceText);
    }
  }

  private static async recognizeComplexCommand(text: string): Promise<VoiceCommand | null> {
    const prompt = `Analyze if this text contains a voice command for a language learning app.
    
    Text: "${text}"
    
    Possible commands: translate, repeat, slower, faster, pause, continue, help
    
    If a command is detected, respond with JSON:
    {"command": "translate", "confidence": 0.9, "parameters": {"target_language": "spanish"}}
    
    If no command is detected, respond with: null`;

    try {
      const completion = openaiService.createChatCompletion({
        messages: [
          { role: 'system', content: 'You are a voice command recognition expert. Respond with JSON or null.' },
          { role: 'user', content: prompt }
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        maxTokens: 200,
        stream: false
      });

      let responseContent = '';
      for await (const chunk of completion) {
        responseContent += chunk.content;
        if (chunk.done) break;
      }

      const result = responseContent.trim();
      return result === 'null' ? null : JSON.parse(result);
    } catch (error) {
      return null;
    }
  }

  private static fallbackLanguageDetection(text: string): LanguageDetectionResult {
    // Simple heuristic-based language detection
    const patterns = {
      'en': /\b(the|and|is|in|to|of|a|that|it|with|for|as|was|on|are|you)\b/gi,
      'es': /\b(el|la|de|que|y|en|un|es|se|no|te|lo|le|da|su|por|son|con|para|una|tiene|las|los|como|pero|sus|le|ha|está|todo|esta|fue|hasta|desde|hace|cuando|muy|sin|sobre|también|me|ya|si|porque)\b/gi,
      'fr': /\b(le|de|et|à|un|il|être|et|en|avoir|que|pour|dans|ce|son|une|sur|avec|ne|se|pas|tout|plus|pouvoir|par|je|son|que|qui|lui|vous|sa|nous|comme|mais|faire|ses|mon|man|bien|où|sans|peut|tous|après|deux|grande|ces|pendant|même|notre|beaucoup|autre|depuis|contre|va|car|rien|cela|été|moins|doit|donc|années|temps|très|savoir|falloir|fois|chaque|dont|sous|entre|encore|aussi|celui|toute|place|dire|part|plusieurs|contre|lors|avant|quelque|peu|même|prendre|état|main|tenir|vers|ceux|ci|grand|chose|autres|là|voir|corps|cet|moment|premier|rendre|compte|fait|groupe|vie|côté|cas|lieu|eau|histoire|sans|toujours|terre|mois|air|livre|point|question|gouvernement|public|devenir|venir|nombre|pays|fois|gens|temps|jour|main|chose|homme|année|mot|même|où|partie|prendre|place|faire|aller|vouloir|dire|grand|petit|autre|donner|voir|savoir|pouvoir|falloir|devoir|croire|trouver|porter|parler|montrer|demander|passer|suivre|sortir|entrer|rester|tomber|mettre|laisser|paraître|connaître|comprendre|prendre|partir|tenir|venir|devenir|revenir|mourir|naître|vivre|servir|courir|dormir|mentir|sentir|ouvrir|couvrir|offrir|souffrir|cueillir|assaillir|bouillir|faillir|saillir|tressaillir|défaillir|accueillir|recueillir)\b/gi,
      'de': /\b(der|die|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|im|dem|nicht|ein|eine|als|auch|es|an|werden|aus|er|hat|dass|sie|nach|wird|bei|einer|um|am|sind|noch|wie|einem|über|einen|so|zum|war|haben|nur|oder|aber|vor|zur|bis|unter|während|des)\b/gi
    };

    let bestMatch = { language: 'en', confidence: 0.5 };
    
    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      const confidence = matches ? Math.min(matches.length / 10, 0.95) : 0.1;
      
      if (confidence > bestMatch.confidence) {
        bestMatch = { language: lang, confidence };
      }
    }

    return {
      language: bestMatch.language,
      confidence: bestMatch.confidence,
      alternatives: []
    };
  }

  private static fallbackPronunciationAnalysis(
    spokenText: string,
    referenceText: string
  ): PronunciationAnalysis {
    // Simple similarity-based analysis
    const similarity = this.calculateTextSimilarity(spokenText, referenceText);
    const score = Math.round(similarity * 100);

    return {
      overall_score: score,
      accuracy_score: score,
      fluency_score: Math.max(score - 10, 0),
      completeness_score: Math.min(score + 5, 100),
      pronunciation_score: score,
      words: referenceText.split(' ').map(word => ({
        word,
        accuracy_score: score,
        error_type: 'None' as const
      })),
      syllables: []
    };
  }

  private static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(' ');
    const words2 = text2.toLowerCase().split(' ');
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  private static calculateConfidence(whisperResponse: any): number {
    if (whisperResponse.segments) {
      const avgLogProb = whisperResponse.segments.reduce(
        (sum: number, segment: any) => sum + (segment.avg_logprob || -1),
        0
      ) / whisperResponse.segments.length;
      
      // Convert log probability to confidence (0-1)
      return Math.max(0, Math.min(1, Math.exp(avgLogProb)));
    }
    
    return 0.8; // Default confidence
  }

  private static calculateCommandConfidence(text: string, command: string): number {
    const words = text.split(' ');
    const commandWords = command.split(' ');
    
    let matches = 0;
    for (const cmdWord of commandWords) {
      if (words.some(word => word.includes(cmdWord))) {
        matches++;
      }
    }
    
    return matches / commandWords.length;
  }

  private static extractCommandParameters(text: string, command: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    switch (command) {
      case 'translate':
        // Extract target language
        const langMatch = text.match(/to\s+(\w+)/i);
        if (langMatch) {
          params.target_language = langMatch[1].toLowerCase();
        }
        break;
        
      case 'slower':
      case 'faster':
        // Extract speed modifier
        const speedMatch = text.match(/(\d+)%|(\d+)\s*times?/i);
        if (speedMatch) {
          params.speed_modifier = parseInt(speedMatch[1] || speedMatch[2]);
        }
        break;
    }
    
    return params;
  }

  private static generateSpeechGrammar(): string {
    // Generate speech recognition grammar for voice commands
    const commands = Object.values(this.VOICE_COMMANDS).flat();
    return `#JSGF V1.0; grammar commands; public <command> = ${commands.join(' | ')};`;
  }

  private static generateCacheKey(operation: string, ...args: any[]): string {
    const content = JSON.stringify({ operation, args });
    return `voice_processing:${crypto.createHash('md5').update(content).digest('hex')}`;
  }

  private static async getFromCache(key: string): Promise<any> {
    try {
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Cache retrieval failed', { key, error });
      return null;
    }
  }

  private static async setCache(key: string, value: any): Promise<void> {
    try {
      await redisClient.setex(key, this.CACHE_TTL, JSON.stringify(value));
    } catch (error) {
      logger.warn('Cache storage failed', { key, error });
    }
  }
}