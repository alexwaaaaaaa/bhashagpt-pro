'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, ChatSession } from '@/types/chat';
import { APP_CONFIG, ERROR_CODES } from '@/lib/config';

interface UseChatOptions {
    language?: string;
    learningLevel?: 'beginner' | 'intermediate' | 'advanced';
    userId?: string;
    autoTranslate?: boolean;
    preferredLanguage?: string;
}

interface ConversationSummary {
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    language: string;
    learningLevel: string;
}

export const useChat = (options: UseChatOptions = {}) => {
    const {
        language = 'en',
        learningLevel = 'intermediate',
        userId = 'anonymous',
        autoTranslate = false,
        preferredLanguage = 'en'
    } = options;

    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
    const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
    
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesRef = useRef<Message[]>([]);
    const streamingMessageRef = useRef<string>('');

    // Update refs when state changes
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        streamingMessageRef.current = streamingMessage;
    }, [streamingMessage]);

    // Load messages from localStorage on mount
    useEffect(() => {
        if (currentSession?.id) {
            loadMessagesFromStorage(currentSession.id);
        }
    }, [currentSession?.id]);

    // Auto-save messages when they change
    useEffect(() => {
        if (currentSession?.id && messages.length > 0) {
            saveMessagesToStorage(currentSession.id, messages);
        }
    }, [messages, currentSession?.id]);

    // Load messages from localStorage
    const loadMessagesFromStorage = useCallback((sessionId: string) => {
        try {
            const savedMessages = localStorage.getItem(`chat_session_${sessionId}`);
            if (savedMessages) {
                const parsed = JSON.parse(savedMessages);
                const messagesWithDates = parsed.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
                setMessages(messagesWithDates);
            }
        } catch (error) {
            console.error('Failed to load saved messages:', error);
        }
    }, []);

    // Save messages to localStorage
    const saveMessagesToStorage = useCallback((sessionId: string, msgs: Message[]) => {
        try {
            localStorage.setItem(`chat_session_${sessionId}`, JSON.stringify(msgs));
        } catch (error) {
            console.error('Failed to save messages:', error);
            // Handle storage quota exceeded
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                // Clear old sessions to make space
                clearOldSessions();
                try {
                    localStorage.setItem(`chat_session_${sessionId}`, JSON.stringify(msgs));
                } catch {
                    console.error('Still unable to save after cleanup');
                }
            }
        }
    }, []);

    // Clear old sessions to free up storage
    const clearOldSessions = useCallback(() => {
        try {
            const keys = Object.keys(localStorage);
            const sessionKeys = keys.filter(key => key.startsWith('chat_session_'));
            
            // Sort by timestamp and keep only the 10 most recent
            const sessions = sessionKeys.map(key => {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '[]');
                    const lastMessage = data[data.length - 1];
                    return {
                        key,
                        timestamp: lastMessage ? new Date(lastMessage.timestamp).getTime() : 0
                    };
                } catch {
                    return { key, timestamp: 0 };
                }
            });

            sessions.sort((a, b) => b.timestamp - a.timestamp);
            
            // Remove old sessions
            sessions.slice(10).forEach(session => {
                localStorage.removeItem(session.key);
            });
        } catch (error) {
            console.error('Failed to clear old sessions:', error);
        }
    }, []);

    // Enhanced translation with caching
    const translateMessage = useCallback(async (text: string, targetLang: string, sourceLang?: string) => {
        if (!autoTranslate || targetLang === (sourceLang || language)) return null;

        try {
            const response = await fetch('/api/chat/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    targetLanguage: targetLang,
                    sourceLanguage: sourceLang || language,
                    userId
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.translatedText;
            } else if (response.status === 429) {
                console.warn('Translation rate limit exceeded');
                return null;
            }
        } catch (error) {
            console.error('Translation failed:', error);
        }

        return null;
    }, [autoTranslate, language, userId]);

    // Enhanced rate limit checking
    const checkRateLimit = useCallback(() => {
        const today = new Date().toDateString();
        const usageKey = `chat_usage_${userId}_${today}`;
        const usage = parseInt(localStorage.getItem(usageKey) || '0');
        
        const limit = APP_CONFIG.limits.free.chatMessages;
        
        if (usage >= limit) {
            setRateLimitExceeded(true);
            return false;
        }
        
        localStorage.setItem(usageKey, (usage + 1).toString());
        return true;
    }, [userId]);

    // Enhanced streaming message handler
    const processStreamingResponse = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>, newMessages: Message[]) => {
        let aiMessageContent = '';
        const aiMessageId = `ai_${Date.now()}`;
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.error) {
                                throw new Error(data.error);
                            }
                            
                            if (data.content) {
                                aiMessageContent += data.content;
                                setStreamingMessage(aiMessageContent);
                            }
                            
                            if (data.done) {
                                // Translation handling
                                let translatedContent: string | undefined;
                                if (autoTranslate && preferredLanguage !== language) {
                                    const translation = await translateMessage(aiMessageContent, preferredLanguage);
                                    translatedContent = translation || undefined;
                                }

                                const aiMessage: Message = {
                                    id: aiMessageId,
                                    content: aiMessageContent,
                                    translatedContent,
                                    isUser: false,
                                    timestamp: new Date(),
                                    language
                                };

                                const finalMessages = [...newMessages, aiMessage];
                                setMessages(finalMessages);
                                setStreamingMessage('');
                                setIsTyping(false);
                                return; // Success
                            }
                        } catch (parseError) {
                            console.error('Failed to parse streaming data:', parseError);
                        }
                    }
                }
            }
        } catch (streamError) {
            console.error('Streaming error:', streamError);
            throw streamError;
        }
    }, [autoTranslate, language, preferredLanguage, translateMessage]);

    // Enhanced send message with comprehensive error handling
    const sendMessage = useCallback(async (content: string, retryAttempt = 0) => {
        if (!content.trim()) return;
        
        // Check rate limits
        if (!checkRateLimit()) {
            setError('Daily message limit reached. Please upgrade to Pro for unlimited messages.');
            return;
        }

        setIsLoading(true);
        setIsTyping(true);
        setError(null);
        setStreamingMessage('');

        // Cancel any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        try {
            // Add user message
            const userMessage: Message = {
                id: `user_${Date.now()}`,
                content,
                isUser: true,
                timestamp: new Date(),
                language
            };

            // Add translation for user message if needed
            if (autoTranslate && preferredLanguage !== language) {
                const translation = await translateMessage(content, preferredLanguage);
                if (translation) {
                    userMessage.translatedContent = translation;
                }
            }

            const newMessages = [...messagesRef.current, userMessage];
            setMessages(newMessages);

            // Prepare context messages (last 10 for API)
            const contextMessages = newMessages
                .slice(-10)
                .map(msg => ({
                    role: msg.isUser ? 'user' as const : 'assistant' as const,
                    content: msg.content
                }));

            // Call streaming API
            const response = await fetch('/api/chat/completion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: contextMessages,
                    language,
                    learningLevel,
                    userId
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                if (response.status === 429) {
                    setRateLimitExceeded(true);
                    throw new Error(errorData.error || 'Rate limit exceeded. Please try again later.');
                }
                
                throw new Error(errorData.error || `API error: ${response.status}`);
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body available');

            await processStreamingResponse(reader, newMessages);
            setRetryCount(0); // Reset retry count on success

        } catch (err: any) {
            console.error('Chat error:', err);
            
            if (err.name === 'AbortError') {
                return; // Request was cancelled
            }

            setError(err.message || 'Failed to send message');
            setStreamingMessage('');
            setIsTyping(false);

            // Enhanced retry logic with exponential backoff
            if (retryAttempt < 3 && !err.message.includes('Rate limit') && !rateLimitExceeded) {
                const delay = Math.pow(2, retryAttempt) * 1000; // 1s, 2s, 4s
                setRetryCount(retryAttempt + 1);
                
                setTimeout(() => {
                    sendMessage(content, retryAttempt + 1);
                }, delay);
            }
        } finally {
            setIsLoading(false);
        }
    }, [
        language, 
        learningLevel, 
        userId, 
        autoTranslate,
        preferredLanguage,
        checkRateLimit, 
        translateMessage, 
        processStreamingResponse,
        rateLimitExceeded
    ]);

    // Create new session
    const createNewSession = useCallback((title?: string) => {
        const newSession: ChatSession = {
            id: `session_${Date.now()}`,
            user_id: userId,
            title: title || `${APP_CONFIG.supportedLanguages.find(l => l.code === language)?.name || 'Chat'} Practice`,
            language,
            messages: [],
            created_at: new Date(),
            updated_at: new Date()
        };
        
        setCurrentSession(newSession);
        setMessages([]);
        setError(null);
        setRetryCount(0);
        setRateLimitExceeded(false);
        
        return newSession;
    }, [userId, language]);

    // Retry last message
    const retryLastMessage = useCallback(() => {
        const lastUserMessage = messages.findLast(msg => msg.isUser);
        if (lastUserMessage) {
            // Remove any failed AI response
            const lastAiIndex = messages.findLastIndex(msg => !msg.isUser);
            const lastUserIndex = messages.findLastIndex(msg => msg.isUser);
            
            if (lastAiIndex > lastUserIndex) {
                setMessages(prev => prev.slice(0, lastAiIndex));
            }
            
            sendMessage(lastUserMessage.content);
        }
    }, [messages, sendMessage]);

    // Clear messages
    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
        setStreamingMessage('');
        setIsTyping(false);
        setRateLimitExceeded(false);
        setRetryCount(0);
        
        if (currentSession?.id) {
            localStorage.removeItem(`chat_session_${currentSession.id}`);
        }
    }, [currentSession?.id]);

    // Stop current generation
    const stopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsLoading(false);
        setIsTyping(false);
        setStreamingMessage('');
    }, []);

    // Get conversation summary
    const getConversationSummary = useCallback((): ConversationSummary => {
        const messageCount = messages.length;
        const userMessages = messages.filter(msg => msg.isUser).length;
        const aiMessages = messages.filter(msg => !msg.isUser).length;
        
        return {
            totalMessages: messageCount,
            userMessages,
            aiMessages,
            language,
            learningLevel
        };
    }, [messages, language, learningLevel]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        // State
        messages,
        isLoading,
        isTyping,
        error,
        streamingMessage,
        rateLimitExceeded,
        retryCount,
        currentSession,
        
        // Actions
        sendMessage,
        retryLastMessage,
        clearMessages,
        stopGeneration,
        createNewSession,
        setCurrentSession,
        translateMessage,
        
        // Utilities
        getConversationSummary,
    };
};