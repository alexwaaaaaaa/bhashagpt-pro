'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic,
    MicOff,
    Play,
    Pause,
    Square,
    Send,
    Trash2,
    AlertCircle,
    Volume2,
    Loader2
} from 'lucide-react';
import Button from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
    onTranscriptionComplete?: (text: string, audioBlob: Blob) => void;
    onError?: (error: string) => void;
    className?: string;
    maxDuration?: number; // in seconds
    language?: string;
}

interface AudioData {
    blob: Blob;
    url: string;
    duration: number;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
    onTranscriptionComplete,
    onError,
    className,
    maxDuration = 300, // 5 minutes default
    language = 'en'
}) => {
    // Recording states
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Audio data
    const [audioData, setAudioData] = useState<AudioData | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioLevels, setAudioLevels] = useState<number[]>(new Array(50).fill(0));

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const recordingTimerRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Initialize audio context and request permissions
    useEffect(() => {
        checkMicrophonePermission();
        return cleanup;
    }, []);

    const cleanup = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    }, []);

    const checkMicrophonePermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasPermission(true);
            stream.getTracks().forEach(track => track.stop()); // Stop the test stream
        } catch (err) {
            setHasPermission(false);
            setError('Microphone permission denied. Please allow microphone access to record audio.');
            onError?.('Microphone permission denied');
        }
    };

    const setupAudioContext = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                }
            });

            audioStreamRef.current = stream;
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();

            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);

            analyserRef.current.fftSize = 256;

            return stream;
        } catch (err) {
            throw new Error('Failed to access microphone');
        }
    };

    const startRecording = async () => {
        try {
            setError(null);
            const stream = await setupAudioContext();

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
                const url = URL.createObjectURL(blob);
                setAudioData({
                    blob,
                    url,
                    duration: recordingTime
                });
            };

            mediaRecorder.start(100); // Collect data every 100ms
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            recordingTimerRef.current = window.setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= maxDuration) {
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);

            // Start audio level monitoring
            monitorAudioLevels();

        } catch (err) {
            setError('Failed to start recording. Please check your microphone.');
            onError?.('Failed to start recording');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);

            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach(track => track.stop());
            }

            setAudioLevels(new Array(50).fill(0));
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            if (isPaused) {
                mediaRecorderRef.current.resume();
                setIsPaused(false);
                // Resume timer
                recordingTimerRef.current = window.setInterval(() => {
                    setRecordingTime(prev => prev + 1);
                }, 1000);
                monitorAudioLevels();
            } else {
                mediaRecorderRef.current.pause();
                setIsPaused(true);
                if (recordingTimerRef.current) {
                    clearInterval(recordingTimerRef.current);
                }
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
            }
        }
    };

    const monitorAudioLevels = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevels = () => {
            if (!analyserRef.current || !isRecording || isPaused) return;

            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate average volume
            const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
            const normalizedLevel = Math.min(average / 128, 1);

            // Update audio levels for visualization
            setAudioLevels(prev => {
                const newLevels = [...prev.slice(1), normalizedLevel];
                return newLevels;
            });

            animationFrameRef.current = requestAnimationFrame(updateLevels);
        };

        updateLevels();
    };

    const playAudio = () => {
        if (!audioData) return;

        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current = null;
        }

        const audio = new Audio(audioData.url);
        audioElementRef.current = audio;

        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onended = () => setIsPlaying(false);

        audio.play().catch(err => {
            setError('Failed to play audio');
            onError?.('Failed to play audio');
        });
    };

    const stopAudio = () => {
        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    const deleteRecording = () => {
        if (audioData) {
            URL.revokeObjectURL(audioData.url);
            setAudioData(null);
        }
        setRecordingTime(0);
        setError(null);
    };

    const transcribeAudio = async () => {
        if (!audioData) return;

        setIsTranscribing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', audioData.blob, 'recording.webm');
            formData.append('model', 'whisper-1');
            formData.append('language', language);

            const response = await fetch('/api/voice/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Transcription failed');
            }

            const result = await response.json();

            if (result.text) {
                onTranscriptionComplete?.(result.text, audioData.blob);
                deleteRecording(); // Clear the recording after successful transcription
            } else {
                throw new Error('No transcription received');
            }

        } catch (err) {
            setError('Failed to transcribe audio. Please try again.');
            onError?.('Transcription failed');
        } finally {
            setIsTranscribing(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Permission denied state
    if (hasPermission === false) {
        return (
            <div className={cn('p-6 bg-gray-800 rounded-lg border border-gray-700', className)}>
                <div className="flex items-center gap-3 text-red-400 mb-4">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Microphone Access Required</span>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                    Please allow microphone access to use voice recording features.
                </p>
                <Button onClick={checkMicrophonePermission} variant="primary" size="sm">
                    Grant Permission
                </Button>
            </div>
        );
    }

    return (
        <div className={cn('p-6 bg-gray-800 rounded-lg border border-gray-700', className)}>
            {/* Error Display */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20"
                    >
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Recording Controls */}
            <div className="flex items-center justify-center mb-6">
                {!isRecording && !audioData && (
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Button
                            onClick={startRecording}
                            variant="primary"
                            size="lg"
                            className="w-16 h-16 rounded-full p-0"
                            disabled={!hasPermission}
                        >
                            <Mic className="w-6 h-6" />
                        </Button>
                    </motion.div>
                )}

                {isRecording && (
                    <div className="flex items-center gap-4">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button
                                onClick={pauseRecording}
                                variant="secondary"
                                size="lg"
                                className="w-12 h-12 rounded-full p-0"
                            >
                                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                            </Button>
                        </motion.div>

                        <motion.div
                            animate={{ scale: isPaused ? 1 : [1, 1.1, 1] }}
                            transition={{ repeat: isPaused ? 0 : Infinity, duration: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button
                                onClick={stopRecording}
                                variant="destructive"
                                size="lg"
                                className="w-16 h-16 rounded-full p-0"
                            >
                                <Square className="w-6 h-6" />
                            </Button>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Recording Timer */}
            {isRecording && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mb-6"
                >
                    <div className="text-2xl font-mono text-white mb-2">
                        {formatTime(recordingTime)}
                    </div>
                    <div className="text-sm text-gray-400">
                        {isPaused ? 'Recording Paused' : 'Recording...'}
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                        <motion.div
                            className="bg-red-500 h-1 rounded-full"
                            style={{ width: `${(recordingTime / maxDuration) * 100}%` }}
                        />
                    </div>
                </motion.div>
            )}

            {/* Audio Waveform Visualization */}
            {(isRecording || audioData) && (
                <div className="mb-6">
                    <div className="flex items-center justify-center h-20 gap-1">
                        {audioLevels.map((level, index) => (
                            <motion.div
                                key={index}
                                className="bg-gradient-to-t from-purple-500 to-blue-500 rounded-full"
                                style={{
                                    width: '3px',
                                    height: `${Math.max(4, level * 60)}px`,
                                }}
                                animate={{
                                    height: isRecording && !isPaused
                                        ? `${Math.max(4, level * 60)}px`
                                        : '4px'
                                }}
                                transition={{ duration: 0.1 }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Audio Playback Controls */}
            {audioData && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            onClick={isPlaying ? stopAudio : playAudio}
                            variant="secondary"
                            size="lg"
                            className="w-12 h-12 rounded-full p-0"
                        >
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </Button>

                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Volume2 className="w-4 h-4" />
                            <span>{formatTime(audioData.duration)}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        <Button
                            onClick={deleteRecording}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>

                        <Button
                            onClick={transcribeAudio}
                            variant="primary"
                            size="sm"
                            disabled={isTranscribing}
                            isLoading={isTranscribing}
                        >
                            {isTranscribing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Transcribing...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send & Transcribe
                                </>
                            )}
                        </Button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default VoiceRecorder;