'use client';

import { useState } from 'react';
import { useChat } from '@/hooks/use-chat';

export default function TestIntegrationPage() {
    const [language, setLanguage] = useState('en');
    const [learningLevel, setLearningLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
    
    const {
        messages,
        isLoading,
        isTyping,
        error,
        streamingMessage,
        sendMessage,
        clearMessages,
        getConversationSummary
    } = useChat({
        language,
        learningLevel,
        userId: 'test-integration-user'
    });

    const [inputMessage, setInputMessage] = useState('');

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;
        
        await sendMessage(inputMessage);
        setInputMessage('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const summary = getConversationSummary();

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
                    🧪 Free AI Service Integration Test
                </h1>

                {/* Controls */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Language
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="hi">Hindi</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Learning Level
                            </label>
                            <select
                                value={learningLevel}
                                onChange={(e) => setLearningLevel(e.target.value as any)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Conversation Stats</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{summary.totalMessages}</div>
                            <div className="text-sm text-gray-600">Total Messages</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{summary.userMessages}</div>
                            <div className="text-sm text-gray-600">Your Messages</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{summary.aiMessages}</div>
                            <div className="text-sm text-gray-600">AI Responses</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">{language.toUpperCase()}</div>
                            <div className="text-sm text-gray-600">Language</div>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="bg-white rounded-lg shadow-md">
                    {/* Messages */}
                    <div className="h-96 overflow-y-auto p-6 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                <p className="text-lg">👋 Start a conversation!</p>
                                <p className="text-sm mt-2">Try saying "Hello" or "Hola" or "नमस्ते"</p>
                            </div>
                        )}
                        
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                        message.isUser
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-800'
                                    }`}
                                >
                                    <p>{message.content}</p>
                                    <p className="text-xs mt-1 opacity-70">
                                        {message.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Streaming Message */}
                        {(isTyping || streamingMessage) && (
                            <div className="flex justify-start">
                                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
                                    <p>{streamingMessage || '...'}</p>
                                    {isTyping && (
                                        <div className="flex space-x-1 mt-2">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="px-6 py-2 bg-red-50 border-t border-red-200">
                            <p className="text-red-600 text-sm">❌ {error}</p>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="border-t border-gray-200 p-4">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={`Type your message in ${language === 'en' ? 'English' : language === 'es' ? 'Spanish' : 'Hindi'}...`}
                                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading || !inputMessage.trim()}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? '⏳' : '📤'}
                            </button>
                            <button
                                onClick={clearMessages}
                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>

                {/* Test Suggestions */}
                <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">🧪 Test Suggestions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">English Tests</h4>
                            <div className="space-y-1 text-sm">
                                <button
                                    onClick={() => setInputMessage("Hello, how are you?")}
                                    className="block w-full text-left p-2 hover:bg-gray-100 rounded"
                                >
                                    "Hello, how are you?"
                                </button>
                                <button
                                    onClick={() => setInputMessage("Can you help me learn Spanish?")}
                                    className="block w-full text-left p-2 hover:bg-gray-100 rounded"
                                >
                                    "Can you help me learn Spanish?"
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">Spanish Tests</h4>
                            <div className="space-y-1 text-sm">
                                <button
                                    onClick={() => setInputMessage("Hola, ¿cómo estás?")}
                                    className="block w-full text-left p-2 hover:bg-gray-100 rounded"
                                >
                                    "Hola, ¿cómo estás?"
                                </button>
                                <button
                                    onClick={() => setInputMessage("¿Puedes ayudarme?")}
                                    className="block w-full text-left p-2 hover:bg-gray-100 rounded"
                                >
                                    "¿Puedes ayudarme?"
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">Hindi Tests</h4>
                            <div className="space-y-1 text-sm">
                                <button
                                    onClick={() => setInputMessage("नमस्ते, आप कैसे हैं?")}
                                    className="block w-full text-left p-2 hover:bg-gray-100 rounded"
                                >
                                    "नमस्ते, आप कैसे हैं?"
                                </button>
                                <button
                                    onClick={() => setInputMessage("क्या आप मेरी मदद कर सकते हैं?")}
                                    className="block w-full text-left p-2 hover:bg-gray-100 rounded"
                                >
                                    "क्या आप मेरी मदद कर सकते हैं?"
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}