'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useVoice } from '@/hooks/use-voice';

interface AdvancedVoiceRecorderProps {
  onTranscription?: (result: TranscriptionResult) => void;
  onCommand?: (command: VoiceCommand) => void;
  onError?: (error: string) => void;
  language?: string;
  enableCommandRecognition?: boolean;
  enableRealTimeTranscription?: boolean;
  enablePronunciationAnalysis?: boolean;
  referenceText?: string;
  className?: string;
}

interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  segments?: any[];
  words?: any[];
}

interface VoiceCommand {
  command: string;
  confidence: number;
  parameters?: Record<string, any>;
}

interface AudioVisualizerProps {
  audioData: Uint8Array;
  isRecording: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioData, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (!isRecording) {
        // Draw idle state
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(width / 2 - 2, height / 2 - 10, 4, 20);
        return;
      }

      // Draw waveform
      ctx.fillStyle = '#3b82f6';
      const barWidth = width / audioData.length;

      for (let i = 0; i < audioData.length; i++) {
        const barHeight = (audioData[i] / 255) * height * 0.8;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }
    };

    draw();
  }, [audioData, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      className="w-full h-15 bg-gray-50 rounded-lg"
    />
  );
};

export const AdvancedVoiceRecorder: React.FC<AdvancedVoiceRecorderProps> = ({
  onTranscription,
  onCommand,
  onError,
  language = 'en',
  enableCommandRecognition = false,
  enableRealTimeTranscription = false,
  enablePronunciationAnalysis = false,
  referenceText,
  className = '',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(128));
  const [streamId, setStreamId] = useState<string | null>(null);
  const [partialTranscription, setPartialTranscription] = useState('');
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [detectedCommand, setDetectedCommand] = useState<VoiceCommand | null>(null);
  const [noiseReduction, setNoiseReduction] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>();

  const { transcribeAudio, detectLanguage, recognizeCommand, analyzePronunciation } = useVoice();

  // Initialize audio context and analyzer
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation,
          noiseSuppression: noiseReduction,
          autoGainControl,
          sampleRate: 16000,
          channelCount: 1
        }
      });

      streamRef.current = stream;

      // Create audio context for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Create media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // Real-time processing for streaming
          if (enableRealTimeTranscription && streamId) {
            processAudioChunk(event.data);
          }
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        
        if (audioBlob.size > 0) {
          await processCompleteAudio(audioBlob);
        }
      };

      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      onError?.('Failed to access microphone. Please check permissions.');
      return false;
    }
  }, [echoCancellation, noiseReduction, autoGainControl, enableRealTimeTranscription, streamId, onError]);

  // Audio visualization
  const updateVisualization = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    setAudioData(dataArray);
    
    // Calculate audio level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average / 255);

    animationFrameRef.current = requestAnimationFrame(updateVisualization);
  }, [isRecording]);

  // Start recording
  const startRecording = async () => {
    if (isRecording) return;

    const initialized = await initializeAudio();
    if (!initialized) return;

    setIsRecording(true);
    setPartialTranscription('');
    setPronunciationScore(null);
    setDetectedCommand(null);

    // Generate stream ID for real-time processing
    if (enableRealTimeTranscription) {
      setStreamId(crypto.randomUUID());
    }

    mediaRecorderRef.current?.start(enableRealTimeTranscription ? 1000 : undefined); // 1s chunks for real-time
    updateVisualization();
  };

  // Stop recording
  const stopRecording = () => {
    if (!isRecording) return;

    setIsRecording(false);
    setIsProcessing(true);

    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    audioContextRef.current?.close();
  };

  // Process audio chunk for real-time transcription
  const processAudioChunk = async (audioChunk: Blob) => {
    if (!streamId) return;

    try {
      const formData = new FormData();
      formData.append('audio_chunk', audioChunk);
      formData.append('stream_id', streamId);
      formData.append('language', language);

      const response = await fetch('/api/v1/voice/stream/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.partial_text) {
          setPartialTranscription(data.data.partial_text);
        }
      }
    } catch (error) {
      console.error('Real-time processing failed:', error);
    }
  };

  // Process complete audio recording
  const processCompleteAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);

      // Finalize stream if using real-time transcription
      let transcriptionResult;
      if (enableRealTimeTranscription && streamId) {
        const response = await fetch(`/api/v1/voice/stream/${streamId}/finalize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          transcriptionResult = data.data;
        }
      } else {
        // Regular transcription
        transcriptionResult = await transcribeAudio(audioBlob, {
          language,
          response_format: 'verbose_json'
        });
      }

      if (transcriptionResult) {
        onTranscription?.(transcriptionResult);

        // Voice command recognition
        if (enableCommandRecognition && transcriptionResult.text) {
          try {
            const command = await recognizeCommand(transcriptionResult.text);
            if (command) {
              setDetectedCommand(command);
              onCommand?.(command);
            }
          } catch (error) {
            console.error('Command recognition failed:', error);
          }
        }

        // Pronunciation analysis
        if (enablePronunciationAnalysis && referenceText && transcriptionResult.text) {
          try {
            const analysis = await analyzePronunciation(audioBlob, referenceText, language);
            setPronunciationScore(analysis.overall_score);
          } catch (error) {
            console.error('Pronunciation analysis failed:', error);
          }
        }
      }

    } catch (error) {
      console.error('Audio processing failed:', error);
      onError?.('Failed to process audio recording');
    } finally {
      setIsProcessing(false);
      setStreamId(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Audio Visualizer */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <AudioVisualizer audioData={audioData} isRecording={isRecording} />
        
        {/* Audio Level Indicator */}
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-sm text-gray-600">Level:</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-100 ${
                audioLevel > 0.8 ? 'bg-red-500' :
                audioLevel > 0.5 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{Math.round(audioLevel * 100)}%</span>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`px-8 py-4 rounded-full font-medium transition-all duration-200 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : isRecording ? (
            'Stop Recording'
          ) : (
            'Start Recording'
          )}
        </button>
      </div>

      {/* Real-time Transcription */}
      {enableRealTimeTranscription && partialTranscription && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Live Transcription</h4>
          <p className="text-blue-700 italic">{partialTranscription}</p>
        </div>
      )}

      {/* Voice Command Detection */}
      {detectedCommand && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Voice Command Detected</h4>
          <div className="text-green-700">
            <p><strong>Command:</strong> {detectedCommand.command}</p>
            <p><strong>Confidence:</strong> {Math.round(detectedCommand.confidence * 100)}%</p>
            {detectedCommand.parameters && Object.keys(detectedCommand.parameters).length > 0 && (
              <p><strong>Parameters:</strong> {JSON.stringify(detectedCommand.parameters)}</p>
            )}
          </div>
        </div>
      )}

      {/* Pronunciation Score */}
      {pronunciationScore !== null && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-2">Pronunciation Score</h4>
          <div className="flex items-center space-x-4">
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${
                  pronunciationScore >= 80 ? 'bg-green-500' :
                  pronunciationScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${pronunciationScore}%` }}
              />
            </div>
            <span className="font-bold text-purple-700">{pronunciationScore}/100</span>
          </div>
        </div>
      )}

      {/* Audio Settings */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Audio Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={noiseReduction}
              onChange={(e) => setNoiseReduction(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Noise Reduction</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoGainControl}
              onChange={(e) => setAutoGainControl(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto Gain Control</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={echoCancellation}
              onChange={(e) => setEchoCancellation(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Echo Cancellation</span>
          </label>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Features</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={enableRealTimeTranscription}
              onChange={(e) => {
                // This would need to be passed as a prop or managed by parent
                console.log('Real-time transcription:', e.target.checked);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Real-time Transcription</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={enableCommandRecognition}
              onChange={(e) => {
                console.log('Command recognition:', e.target.checked);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Voice Commands</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={enablePronunciationAnalysis}
              onChange={(e) => {
                console.log('Pronunciation analysis:', e.target.checked);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Pronunciation Analysis</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default AdvancedVoiceRecorder;