'use client';

import { useState, useRef, useCallback } from 'react';

interface UseVoiceOptions {
  onTranscription?: (result: TranscriptionResult) => void;
  onError?: (error: string) => void;
  language?: string;
}

interface TranscriptionResult {
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

interface LanguageDetectionResult {
  language: string;
  confidence: number;
  alternatives: Array<{
    language: string;
    confidence: number;
  }>;
}

interface VoiceCommand {
  command: string;
  confidence: number;
  parameters?: Record<string, any>;
}

interface PronunciationAnalysis {
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

interface TTSOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: 'tts-1' | 'tts-1-hd';
  speed?: number;
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac';
}

interface WebSpeechConfig {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  grammars: string;
}

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const useVoice = (options: UseVoiceOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [supportedLanguages, setSupportedLanguages] = useState<any[]>([]);
  const [webSpeechConfig, setWebSpeechConfig] = useState<WebSpeechConfig | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Enhanced transcription with Whisper API
  const transcribeAudio = useCallback(async (
    audioBlob: Blob, 
    transcriptionOptions: {
      language?: string;
      model?: 'whisper-1';
      temperature?: number;
      prompt?: string;
      response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
    } = {}
  ): Promise<TranscriptionResult> => {
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', transcriptionOptions.language || options.language || 'en');
      formData.append('model', transcriptionOptions.model || 'whisper-1');
      formData.append('response_format', transcriptionOptions.response_format || 'verbose_json');
      
      if (transcriptionOptions.temperature) {
        formData.append('temperature', transcriptionOptions.temperature.toString());
      }
      if (transcriptionOptions.prompt) {
        formData.append('prompt', transcriptionOptions.prompt);
      }

      const response = await fetch('/api/v1/voice/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      const result: TranscriptionResult = data.data;
      
      setTranscription(result);
      options.onTranscription?.(result);
      
      return result;
    } catch (error) {
      options.onError?.('Failed to transcribe audio');
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  }, [options]);

  // Language detection
  const detectLanguage = useCallback(async (text: string): Promise<LanguageDetectionResult> => {
    try {
      const response = await fetch('/api/v1/voice/detect-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Language detection failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      throw new Error('Failed to detect language');
    }
  }, []);

  // Text-to-Speech synthesis
  const synthesizeSpeech = useCallback(async (
    text: string, 
    ttsOptions: TTSOptions = {}
  ): Promise<Blob> => {
    try {
      const response = await fetch('/api/v1/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text,
          voice: ttsOptions.voice || 'alloy',
          model: ttsOptions.model || 'tts-1',
          speed: ttsOptions.speed || 1.0,
          response_format: ttsOptions.response_format || 'mp3'
        }),
      });

      if (!response.ok) {
        throw new Error('Speech synthesis failed');
      }

      return await response.blob();
    } catch (error) {
      throw new Error('Failed to synthesize speech');
    }
  }, []);

  // Pronunciation analysis
  const analyzePronunciation = useCallback(async (
    audioBlob: Blob,
    referenceText: string,
    language: string = 'en'
  ): Promise<PronunciationAnalysis> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('reference_text', referenceText);
      formData.append('language', language);

      const response = await fetch('/api/v1/voice/analyze-pronunciation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Pronunciation analysis failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      throw new Error('Failed to analyze pronunciation');
    }
  }, []);

  // Voice command recognition
  const recognizeCommand = useCallback(async (text: string): Promise<VoiceCommand | null> => {
    try {
      const response = await fetch('/api/v1/voice/recognize-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Command recognition failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      throw new Error('Failed to recognize voice command');
    }
  }, []);

  // Audio preprocessing
  const preprocessAudio = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/v1/voice/preprocess', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Audio preprocessing failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      throw new Error('Failed to preprocess audio');
    }
  }, []);

  // Get supported languages
  const getSupportedLanguages = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/voice/supported-languages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get supported languages');
      }

      const data = await response.json();
      setSupportedLanguages(data.data.languages);
      return data.data;
    } catch (error) {
      throw new Error('Failed to get supported languages');
    }
  }, []);

  // Get Web Speech API configuration
  const getWebSpeechConfig = useCallback(async (language: string = 'en-US') => {
    try {
      const response = await fetch(`/api/v1/voice/web-speech-config?language=${language}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get Web Speech API config');
      }

      const data = await response.json();
      setWebSpeechConfig(data.data);
      return data.data;
    } catch (error) {
      throw new Error('Failed to get Web Speech API configuration');
    }
  }, []);

  // Web Speech API fallback
  const startWebSpeechRecognition = useCallback(async (
    language: string = 'en-US',
    onResult?: (text: string, isFinal: boolean) => void,
    onEnd?: () => void
  ) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Web Speech API not supported');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    const config = await getWebSpeechConfig(language);
    
    recognition.lang = config.lang;
    recognition.continuous = config.continuous;
    recognition.interimResults = config.interimResults;
    recognition.maxAlternatives = config.maxAlternatives;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        onResult?.(text, result.isFinal);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      onEnd?.();
    };

    recognition.onerror = (event: any) => {
      options.onError?.(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [options, getWebSpeechConfig]);

  // Stop Web Speech API recognition
  const stopWebSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Enhanced recording with preprocessing
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Preprocess audio before transcription
        try {
          const preprocessed = await preprocessAudio(audioBlob);
          // Use preprocessed audio if available, otherwise use original
          await transcribeAudio(audioBlob);
        } catch (error) {
          // Fallback to original audio if preprocessing fails
          await transcribeAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      // Fallback to Web Speech API if available
      try {
        await startWebSpeechRecognition(
          options.language || 'en-US',
          (text, isFinal) => {
            if (isFinal) {
              const result: TranscriptionResult = {
                text,
                language: options.language || 'en',
                confidence: 0.8 // Estimated confidence for Web Speech API
              };
              setTranscription(result);
              options.onTranscription?.(result);
            }
          }
        );
      } catch (fallbackError) {
        options.onError?.('Failed to start recording and Web Speech API fallback failed');
      }
    }
  }, [options, preprocessAudio, transcribeAudio, startWebSpeechRecognition]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    } else if (recognitionRef.current) {
      stopWebSpeechRecognition();
    }
  }, [isRecording, stopWebSpeechRecognition]);

  return {
    // State
    isRecording,
    isTranscribing,
    transcription,
    supportedLanguages,
    webSpeechConfig,
    
    // Core functions
    startRecording,
    stopRecording,
    transcribeAudio,
    
    // Advanced features
    detectLanguage,
    synthesizeSpeech,
    analyzePronunciation,
    recognizeCommand,
    preprocessAudio,
    
    // Configuration
    getSupportedLanguages,
    getWebSpeechConfig,
    
    // Web Speech API fallback
    startWebSpeechRecognition,
    stopWebSpeechRecognition,
  };
};