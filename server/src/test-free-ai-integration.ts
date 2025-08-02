#!/usr/bin/env ts-node

// Integration test for Free AI Service with API endpoints
import express from 'express';
import { FreeAIService, ChatMessage } from './services/free-ai.service';

const app = express();
app.use(express.json());

// Test endpoint for chat completion
app.post('/api/test/chat', async (req, res) => {
    try {
        const { message, language = 'en' } = req.body;
        
        const messages: ChatMessage[] = [
            { role: 'user', content: message }
        ];

        const chunks: any[] = [];
        
        for await (const chunk of FreeAIService.createChatCompletion({
            messages,
            language,
            userId: 'test-user'
        })) {
            chunks.push(chunk);
        }

        const fullResponse = chunks
            .filter(chunk => !chunk.done)
            .map(chunk => chunk.content)
            .join('');

        res.json({
            success: true,
            response: fullResponse,
            chunks: chunks.length,
            language
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Test endpoint for translation
app.post('/api/test/translate', async (req, res) => {
    try {
        const { text, fromLang, toLang } = req.body;
        
        const translation = await FreeAIService.translateText(text, fromLang, toLang);
        
        res.json({
            success: true,
            original: text,
            translation,
            fromLang,
            toLang
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Test endpoint for speech-to-text
app.post('/api/test/transcribe', async (req, res) => {
    try {
        const mockBuffer = Buffer.from('mock audio data');
        const result = await FreeAIService.transcribeAudio(mockBuffer, { language: 'en' });
        
        res.json({
            success: true,
            transcription: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Health check endpoint
app.get('/api/test/health', async (req, res) => {
    try {
        const isHealthy = await FreeAIService.healthCheck();
        
        res.json({
            success: true,
            healthy: isHealthy,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

const PORT = 3001;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🧪 Free AI Test Server running on http://localhost:${PORT}`);
        console.log('\nAvailable endpoints:');
        console.log('POST /api/test/chat - Test chat completion');
        console.log('POST /api/test/translate - Test translation');
        console.log('POST /api/test/transcribe - Test speech-to-text');
        console.log('GET  /api/test/health - Health check');
        console.log('\nExample usage:');
        console.log('curl -X POST http://localhost:3001/api/test/chat -H "Content-Type: application/json" -d \'{"message":"Hello, how are you?","language":"en"}\'');
    });
}

export { app };