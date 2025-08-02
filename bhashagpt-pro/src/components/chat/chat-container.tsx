'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Mic,
    MicOff,
    Send,
    Languages,
    ChevronDown,
    Volume2,
    Play,
    Pause,
    MoreVertical,
    Phone,
    Video,
    AlertCircle,
    RefreshCw,
    StopCircle,
    Loader2,
    Globe,
    Settings,
    X
} from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { APP_CONFIG } from '@/lib/config';

interface ChatContainerProps {
    userId?: string;
    initialLanguage?: string;
    learningLevel?: 'beginner' | 'intermediate' | 'advanced';
    autoTranslate?: boolean;
    preferredLanguage?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
    userId,
    initialLanguage = 'es',
    learningLevel = 'intermediate',
    autoTranslate = false,
    preferredLanguage = 'en'
}) => {
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
    const [showTranslation, setShowTranslation] = useState(autoTranslate);
    const [voiceSpeed, setVoiceSpeed] = useState(1.0);
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const [isAvatarPlaying, setIsAvatarPlaying] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showSettings, setShowSettings] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recordingIntervalRef = useRef<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Use the enhanced chat hook
    const {
        messages,
        isLoading,
        isTyping,
        currentSession,
        streamingMessage,
        error,
        retryCount,
        rateLimitExceeded,
        sendMessage,
        retryLastMessage,
        clearMessages,
        createNewSession,
        stopGeneration,
        translateMessage,
    } = useChat({
        language: selectedLanguage,
        learningLevel,
        userId,
        autoTranslate: showTranslation,
        preferredLanguage,
    });

    const languages = APP_CONFIG.supportedLanguages;

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingMessage]);

    useEffect(() => {
        if (isRecording) {
            recordingIntervalRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (recordingIntervalRef.current) {
                window.clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }
            setRecordingTime(0);
        }
        return () => {
            if (recordingIntervalRef.current) {
                window.clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }
        };
    }, [isRecording]);

    // Initialize session on mount
    useEffect(() => {
        if (!currentSession) {
            createNewSession(`${languages.find(l => l.code === selectedLanguage)?.name} Practice`);
        }
    }, [currentSession, createNewSession, selectedLanguage, languages]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const handleSendMessage = useCallback(async () => {
        if (!inputText.trim() || isLoading) return;
        const messageContent = inputText.trim();
        setInputText('');
        // Focus back to input
        setTimeout(() => inputRef.current?.focus(), 100);
        await sendMessage(messageContent);
    }, [inputText, isLoading, sendMessage]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [handleSendMessage]);

    const handleLanguageChange = useCallback((langCode: string, langName: string) => {
        setSelectedLanguage(langCode);
        setIsLanguageDropdownOpen(false);
        // Create new session for new language
        createNewSession(`${langName} Practice`);
    }, [createNewSession]);

    const handleVoiceToggle = useCallback(() => {
        setIsRecording(!isRecording);
        // TODO: Implement actual voice recording
    }, [isRecording]);

    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const VoiceWaveform = () => (
        <div className="flex items-center gap-1 h-8">
            {[...Array(20)].map((_, i) => (
                <div
                    key={i}
                    className={`w-1 bg-blue-400 rounded-full transition-all duration-150 ${
                        isRecording ? 'animate-pulse' : ''
                    }`}
                    style={{
                        height: isRecording ? `${Math.random() * 24 + 8}px` : '8px',
                        animationDelay: `${i * 50}ms`
                    }}
                />
            ))}
        </div>
    );

    const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        if (error) {
            return (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mx-4 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm text-red-400">{error}</p>
                        {retryCount > 0 && (
                            <p className="text-xs text-red-300 mt-1">
                                Retry attempt: {retryCount}/3
                            </p>
                        )}
                    </div>
                    <button
                        onClick={retryLastMessage}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        title="Retry"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            );
        }
        return <>{children}</>;
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold">AI</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">BhashaGPT Tutor</h3>
                        <p className="text-xs text-green-400">
                            Online • Teaching {languages.find(l => l.code === selectedLanguage)?.name}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                            aria-label="Select Language"
                        >
                            <Languages className="w-4 h-4" />
                            <span className="text-sm">
                                {languages.find(l => l.code === selectedLanguage)?.name}
                            </span>
                            <ChevronDown className="w-4 h-4" />
                        </button>

                        {isLanguageDropdownOpen && (
                            <div className="absolute right-0 top-12 w-48 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-50 max-h-64 overflow-y-auto">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleLanguageChange(lang.code, lang.name)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                            selectedLanguage === lang.code ? 'bg-gray-700' : ''
                                        }`}
                                    >
                                        <span className="text-lg">{lang.nativeName.charAt(0)}</span>
                                        <div className="text-left">
                                            <div className="text-sm font-medium">{lang.name}</div>
                                            <div className="text-xs text-gray-400">{lang.nativeName}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => setShowTranslation(!showTranslation)}
                        className={`p-2 rounded-lg transition-colors ${
                            showTranslation ? "bg-purple-500 text-white" : "hover:bg-gray-700"
                        }`}
                        title="Toggle Translation"
                        aria-label="Toggle Translation"
                    >
                        <Globe className="w-5 h-5" />
                    </button>
                    <button 
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Voice Call"
                        aria-label="Voice Call"
                    >
                        <Phone className="w-5 h-5" />
                    </button>
                    <button 
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Video Call"
                        aria-label="Video Call"
                    >
                        <Video className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Settings"
                        aria-label="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Rate Limit Warning */}
            {rateLimitExceeded && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3">
                    <div className="flex items-center gap-2 text-yellow-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">
                            Rate limit reached. Please wait before sending another message.
                        </span>
                    </div>
                </div>
            )}

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <ErrorBoundary>
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                                    message.isUser
                                        ? 'bg-blue-500 text-white rounded-br-md'
                                        : 'bg-gray-700 text-white rounded-bl-md'
                                }`}
                            >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {message.content}
                                </p>
                                {showTranslation && message.translatedContent && !message.isUser && (
                                    <div className="mt-2 pt-2 border-t border-gray-600">
                                        <p className="text-xs text-gray-300 italic">
                                            {message.translatedContent}
                                        </p>
                                    </div>
                                )}
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs opacity-70">
                                        {message.timestamp.toLocaleTimeString([], { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </span>
                                    {!message.isUser && (
                                        <button 
                                            className="p-1 hover:bg-gray-600 rounded transition-colors"
                                            title="Play Audio"
                                            aria-label="Play Audio"
                                        >
                                            <Volume2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Streaming Message */}
                    {streamingMessage && (
                        <div className="flex justify-start">
                            <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-gray-700 text-white rounded-bl-md">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {streamingMessage}
                                    <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Typing Indicator */}
                    {isTyping && !streamingMessage && (
                        <div className="flex justify-start">
                            <div className="bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-md">
                                <div className="flex items-center gap-1">
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map((i) => (
                                            <div
                                                key={i}
                                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                                style={{ animationDelay: `${i * 200}ms` }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs text-gray-400 ml-2">AI is typing...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </ErrorBoundary>
            </div>

            {/* Voice Recording Overlay */}
            {isRecording && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-8 rounded-2xl text-center">
                        <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Mic className="w-12 h-12 text-white" />
                        </div>
                        <p className="text-lg font-semibold mb-2">Recording...</p>
                        <p className="text-2xl font-mono text-blue-400 mb-4">
                            {formatTime(recordingTime)}
                        </p>
                        <VoiceWaveform />
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={handleVoiceToggle}
                                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                            >
                                <StopCircle className="w-4 h-4" />
                                Stop Recording
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleVoiceToggle}
                        className={`p-3 rounded-full transition-all duration-200 ${
                            isRecording
                                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                        title={isRecording ? "Stop Recording" : "Start Recording"}
                        aria-label={isRecording ? "Stop Recording" : "Start Recording"}
                    >
                        {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            disabled={isLoading || rateLimitExceeded}
                            className={`w-full px-4 py-3 bg-gray-700 text-white rounded-full border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors ${
                                (isLoading || rateLimitExceeded) ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            aria-label="Message input"
                        />
                    </div>
                    {isLoading && streamingMessage ? (
                        <button
                            onClick={stopGeneration}
                            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                            title="Stop Generation"
                            aria-label="Stop Generation"
                        >
                            <StopCircle className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputText.trim() || isLoading || rateLimitExceeded}
                            className={`p-3 rounded-full transition-all duration-200 ${
                                inputText.trim() && !isLoading && !rateLimitExceeded
                                    ? 'bg-blue-500 hover:bg-blue-600 transform hover:scale-105'
                                    : 'bg-gray-700 cursor-not-allowed'
                            }`}
                            title="Send Message"
                            aria-label="Send Message"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatContainer;