#!/usr/bin/env ts-node

// Test script for Free AI Service
import { FreeAIService, ChatMessage } from './services/free-ai.service';
import { logger } from './utils/logger';

async function testFreeAIService() {
    console.log('🚀 Starting Free AI Service Tests...\n');

    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    try {
        const isHealthy = await FreeAIService.healthCheck();
        console.log(`✅ Health Check: ${isHealthy ? 'PASSED' : 'FAILED'}\n`);
    } catch (error) {
        console.log(`❌ Health Check FAILED: ${error}\n`);
    }

    // Test 2: Local Response Generation (English)
    console.log('2️⃣ Testing Local Response Generation (English)...');
    try {
        const messages: ChatMessage[] = [
            { role: 'user', content: 'Hello, how are you?' }
        ];

        console.log('Input:', messages[0].content);
        
        const chunks: any[] = [];
        for await (const chunk of FreeAIService.createChatCompletion({
            messages,
            language: 'en',
            userId: 'test-user'
        })) {
            chunks.push(chunk);
            if (!chunk.done) {
                process.stdout.write(chunk.content);
            }
        }
        
        console.log('\n✅ English Local Response: PASSED\n');
    } catch (error) {
        console.log(`❌ English Local Response FAILED: ${error}\n`);
    }

    // Test 3: Local Response Generation (Spanish)
    console.log('3️⃣ Testing Local Response Generation (Spanish)...');
    try {
        const messages: ChatMessage[] = [
            { role: 'user', content: 'Hola, ¿cómo estás?' }
        ];

        console.log('Input:', messages[0].content);
        
        const chunks: any[] = [];
        for await (const chunk of FreeAIService.createChatCompletion({
            messages,
            language: 'es',
            userId: 'test-user'
        })) {
            chunks.push(chunk);
            if (!chunk.done) {
                process.stdout.write(chunk.content);
            }
        }
        
        console.log('\n✅ Spanish Local Response: PASSED\n');
    } catch (error) {
        console.log(`❌ Spanish Local Response FAILED: ${error}\n`);
    }

    // Test 4: Local Response Generation (Hindi)
    console.log('4️⃣ Testing Local Response Generation (Hindi)...');
    try {
        const messages: ChatMessage[] = [
            { role: 'user', content: 'नमस्ते, आप कैसे हैं?' }
        ];

        console.log('Input:', messages[0].content);
        
        const chunks: any[] = [];
        for await (const chunk of FreeAIService.createChatCompletion({
            messages,
            language: 'hi',
            userId: 'test-user'
        })) {
            chunks.push(chunk);
            if (!chunk.done) {
                process.stdout.write(chunk.content);
            }
        }
        
        console.log('\n✅ Hindi Local Response: PASSED\n');
    } catch (error) {
        console.log(`❌ Hindi Local Response FAILED: ${error}\n`);
    }

    // Test 5: Translation Service
    console.log('5️⃣ Testing Translation Service...');
    try {
        const translations = [
            { text: 'hello', from: 'en', to: 'es' },
            { text: 'thank you', from: 'en', to: 'hi' },
            { text: 'goodbye', from: 'en', to: 'es' }
        ];

        for (const { text, from, to } of translations) {
            const result = await FreeAIService.translateText(text, from, to);
            console.log(`"${text}" (${from} → ${to}): "${result}"`);
        }
        
        console.log('✅ Translation Service: PASSED\n');
    } catch (error) {
        console.log(`❌ Translation Service FAILED: ${error}\n`);
    }

    // Test 6: Speech-to-Text (Mock)
    console.log('6️⃣ Testing Speech-to-Text (Mock)...');
    try {
        const mockAudioBuffer = Buffer.from('mock audio data');
        const result = await FreeAIService.transcribeAudio(mockAudioBuffer, { language: 'en' });
        
        console.log('Transcription Result:', result);
        console.log('✅ Speech-to-Text: PASSED\n');
    } catch (error) {
        console.log(`❌ Speech-to-Text FAILED: ${error}\n`);
    }

    // Test 7: Text-to-Speech (Mock)
    console.log('7️⃣ Testing Text-to-Speech (Mock)...');
    try {
        const audioBuffer = await FreeAIService.generateSpeech('Hello world', 'alloy');
        
        console.log(`Generated audio buffer size: ${audioBuffer.length} bytes`);
        console.log('✅ Text-to-Speech: PASSED\n');
    } catch (error) {
        console.log(`❌ Text-to-Speech FAILED: ${error}\n`);
    }

    // Test 8: Different Question Types
    console.log('8️⃣ Testing Different Question Types...');
    try {
        const testQuestions = [
            'Can you help me learn Spanish?',
            'What is the meaning of this word?',
            'I want to practice pronunciation',
            'How do I say hello in French?'
        ];

        for (const question of testQuestions) {
            console.log(`\nQ: ${question}`);
            process.stdout.write('A: ');
            
            const messages: ChatMessage[] = [
                { role: 'user', content: question }
            ];

            for await (const chunk of FreeAIService.createChatCompletion({
                messages,
                language: 'en',
                userId: 'test-user'
            })) {
                if (!chunk.done) {
                    process.stdout.write(chunk.content);
                }
            }
            console.log('');
        }
        
        console.log('\n✅ Different Question Types: PASSED\n');
    } catch (error) {
        console.log(`❌ Different Question Types FAILED: ${error}\n`);
    }

    console.log('🎉 All Free AI Service Tests Completed!');
}

// Run tests
if (require.main === module) {
    testFreeAIService().catch(console.error);
}

export { testFreeAIService };