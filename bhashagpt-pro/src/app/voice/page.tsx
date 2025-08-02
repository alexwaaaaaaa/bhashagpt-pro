'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MessageCircle, Languages, Volume2 } from 'lucide-react';
import VoiceRecorder from '@/components/voice/voice-recorder';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';

const VoicePage = () => {
    const [transcriptions, setTranscriptions] = useState<Array<{
        id: string;
        text: string;
        timestamp: Date;
        language: string;
    }>>([]);
    const [selectedLanguage, setSelectedLanguage] = useState('en');

    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'es', name: 'Spanish', flag: '🇪🇸' },
        { code: 'fr', name: 'French', flag: '🇫🇷' },
        { code: 'de', name: 'German', flag: '🇩🇪' },
        { code: 'it', name: 'Italian', flag: '🇮🇹' },
        { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
        { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
        { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
        { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
        { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    ];

    const handleTranscriptionComplete = (text: string, audioBlob: Blob) => {
        const newTranscription = {
            id: Date.now().toString(),
            text,
            timestamp: new Date(),
            language: selectedLanguage,
        };
        
        setTranscriptions(prev => [newTranscription, ...prev]);
        
        // You can also send this to your chat system or save it
        console.log('Transcription completed:', { text, audioBlob });
    };

    const handleError = (error: string) => {
        console.error('Voice recorder error:', error);
        // You can show a toast notification here
    };

    const clearTranscriptions = () => {
        setTranscriptions([]);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                            <Mic className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            Voice Practice
                        </h1>
                    </div>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Practice your pronunciation and speaking skills with our advanced voice recognition technology. 
                        Record your voice and get instant transcription powered by OpenAI Whisper.
                    </p>
                </motion.div>

                {/* Language Selection */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8"
                >
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Languages className="w-5 h-5 text-purple-400" />
                            <h2 className="text-lg font-semibold text-white">Select Language</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => setSelectedLanguage(lang.code)}
                                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                                        selectedLanguage === lang.code
                                            ? 'border-purple-500 bg-purple-500/20 text-white'
                                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
                                    }`}
                                >
                                    <span className="text-lg">{lang.flag}</span>
                                    <span className="text-sm font-medium">{lang.name}</span>
                                </button>
                            ))}
                        </div>
                    </Card>
                </motion.div>

                {/* Voice Recorder */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                >
                    <VoiceRecorder
                        onTranscriptionComplete={handleTranscriptionComplete}
                        onError={handleError}
                        language={selectedLanguage}
                        maxDuration={180} // 3 minutes
                    />
                </motion.div>

                {/* Transcription History */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <MessageCircle className="w-5 h-5 text-blue-400" />
                                <h2 className="text-lg font-semibold text-white">Transcription History</h2>
                            </div>
                            {transcriptions.length > 0 && (
                                <Button
                                    onClick={clearTranscriptions}
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-white"
                                >
                                    Clear All
                                </Button>
                            )}
                        </div>

                        {transcriptions.length === 0 ? (
                            <div className="text-center py-12">
                                <Volume2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400 mb-2">No transcriptions yet</p>
                                <p className="text-sm text-gray-500">
                                    Start recording to see your transcriptions here
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {transcriptions.map((transcription, index) => (
                                    <motion.div
                                        key={transcription.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="p-4 bg-gray-700 rounded-lg border border-gray-600"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">
                                                    {languages.find(l => l.code === transcription.language)?.flag}
                                                </span>
                                                <span className="text-sm text-gray-400">
                                                    {languages.find(l => l.code === transcription.language)?.name}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {transcription.timestamp.toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-white leading-relaxed">
                                            "{transcription.text}"
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </Card>
                </motion.div>

                {/* Tips */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8"
                >
                    <Card className="p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
                        <h3 className="text-lg font-semibold text-white mb-4">💡 Tips for Better Recognition</h3>
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                            <div>
                                <h4 className="font-medium text-white mb-2">Audio Quality</h4>
                                <ul className="space-y-1 text-gray-400">
                                    <li>• Speak clearly and at a normal pace</li>
                                    <li>• Use a quiet environment</li>
                                    <li>• Keep microphone close to your mouth</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium text-white mb-2">Best Practices</h4>
                                <ul className="space-y-1 text-gray-400">
                                    <li>• Pause between sentences</li>
                                    <li>• Avoid background noise</li>
                                    <li>• Select the correct language</li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default VoicePage;