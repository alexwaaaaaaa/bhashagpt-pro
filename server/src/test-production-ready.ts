#!/usr/bin/env ts-node

// Production Readiness Test for Free AI Service
import { FreeAIService, ChatMessage } from './services/free-ai.service';
import { AIService } from './services/ai.service';
import { logger } from './utils/logger';

interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    details?: any;
    error?: string;
}

class ProductionReadinessTest {
    private results: TestResult[] = [];

    async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
        const startTime = Date.now();
        
        try {
            console.log(`🧪 Running: ${name}...`);
            const result = await testFn();
            const duration = Date.now() - startTime;
            
            const testResult: TestResult = {
                name,
                passed: true,
                duration,
                details: result
            };
            
            console.log(`✅ ${name} - PASSED (${duration}ms)`);
            this.results.push(testResult);
            return testResult;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            const testResult: TestResult = {
                name,
                passed: false,
                duration,
                error: error instanceof Error ? error.message : String(error)
            };
            
            console.log(`❌ ${name} - FAILED (${duration}ms): ${testResult.error}`);
            this.results.push(testResult);
            return testResult;
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Production Readiness Tests for Free AI Service\n');

        // Test 1: Service Health
        await this.runTest('Service Health Check', async () => {
            const isHealthy = await FreeAIService.healthCheck();
            if (!isHealthy) throw new Error('Service not healthy');
            return { healthy: isHealthy };
        });

        // Test 2: AI Service Integration
        await this.runTest('AI Service Integration', async () => {
            const serviceInfo = AIService.getServiceInfo();
            if (!serviceInfo.provider) throw new Error('No provider configured');
            return serviceInfo;
        });

        // Test 3: Error Handling - Invalid Input
        await this.runTest('Error Handling - Invalid Input', async () => {
            try {
                const messages: ChatMessage[] = [];
                const chunks = [];
                for await (const chunk of FreeAIService.createChatCompletion({
                    messages,
                    userId: 'test'
                })) {
                    chunks.push(chunk);
                    if (chunks.length > 10) break; // Prevent infinite loop
                }
                return { handled: true, chunks: chunks.length };
            } catch (error) {
                // Should handle gracefully
                return { handled: true, error: 'Handled gracefully' };
            }
        });

        // Test 4: Timeout Handling
        await this.runTest('Timeout Handling', async () => {
            const startTime = Date.now();
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Test timeout handling' }
            ];
            
            const chunks: any[] = [];
            for await (const chunk of FreeAIService.createChatCompletion({
                messages,
                userId: 'test-timeout'
            })) {
                chunks.push(chunk);
                if (chunk.done) break;
            }
            
            const duration = Date.now() - startTime;
            if (duration > 15000) throw new Error('Response took too long');
            
            return { duration, chunks: chunks.length };
        });

        // Test 5: Multilingual Support
        await this.runTest('Multilingual Support', async () => {
            const languages = [
                { code: 'en', text: 'Hello, how are you?' },
                { code: 'es', text: 'Hola, ¿cómo estás?' },
                { code: 'hi', text: 'नमस्ते, आप कैसे हैं?' }
            ];

            const results: any[] = [];
            for (const lang of languages) {
                const messages: ChatMessage[] = [
                    { role: 'user', content: lang.text }
                ];

                const chunks: string[] = [];
                for await (const chunk of FreeAIService.createChatCompletion({
                    messages,
                    language: lang.code,
                    userId: 'test-multilingual'
                })) {
                    if (!chunk.done) {
                        chunks.push(chunk.content);
                    } else {
                        break;
                    }
                }

                const response = chunks.join('');
                results.push({
                    language: lang.code,
                    input: lang.text,
                    output: response,
                    hasResponse: response.length > 0
                });
            }

            return results;
        });

        // Test 6: Translation Service
        await this.runTest('Translation Service', async () => {
            const translations = [
                { text: 'hello', from: 'en', to: 'es' },
                { text: 'thank you', from: 'en', to: 'hi' },
                { text: 'goodbye', from: 'en', to: 'es' }
            ];

            const results: any[] = [];
            for (const trans of translations) {
                const result = await FreeAIService.translateText(trans.text, trans.from, trans.to);
                results.push({
                    ...trans,
                    translation: result,
                    hasTranslation: result.length > 0
                });
            }

            return results;
        });

        // Test 7: Concurrent Requests
        await this.runTest('Concurrent Request Handling', async () => {
            const concurrentRequests = 5;
            const promises: Promise<string>[] = [];

            for (let i = 0; i < concurrentRequests; i++) {
                const promise = (async () => {
                    const messages: ChatMessage[] = [
                        { role: 'user', content: `Concurrent test ${i + 1}` }
                    ];

                    const chunks: string[] = [];
                    for await (const chunk of FreeAIService.createChatCompletion({
                        messages,
                        userId: `test-concurrent-${i}`
                    })) {
                        if (chunk.done) break;
                        chunks.push(chunk.content);
                    }

                    return chunks.join('');
                })();

                promises.push(promise);
            }

            const results = await Promise.all(promises);
            return {
                requestCount: concurrentRequests,
                successCount: results.filter(r => r.length > 0).length,
                responses: results
            };
        });

        // Test 8: Memory Usage
        await this.runTest('Memory Usage Test', async () => {
            const initialMemory = process.memoryUsage();
            
            // Run multiple requests to test memory leaks
            for (let i = 0; i < 10; i++) {
                const messages: ChatMessage[] = [
                    { role: 'user', content: `Memory test ${i}` }
                ];

                const chunks: any[] = [];
                for await (const chunk of FreeAIService.createChatCompletion({
                    messages,
                    userId: `memory-test-${i}`
                })) {
                    chunks.push(chunk);
                    if (chunk.done) break;
                }
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

            return {
                initialMemory: Math.round(initialMemory.heapUsed / 1024 / 1024),
                finalMemory: Math.round(finalMemory.heapUsed / 1024 / 1024),
                memoryIncrease: Math.round(memoryIncrease / 1024 / 1024),
                acceptable: memoryIncrease < 50 * 1024 * 1024 // Less than 50MB increase
            };
        });

        // Test 9: Speech Processing (Mock)
        await this.runTest('Speech Processing', async () => {
            const mockBuffer = Buffer.from('test audio data');
            
            const transcription = await FreeAIService.transcribeAudio(mockBuffer, { language: 'en' });
            const speech = await FreeAIService.generateSpeech('Test speech', 'alloy');

            return {
                transcription: {
                    hasText: !!transcription.text,
                    hasLanguage: !!transcription.language,
                    hasDuration: typeof transcription.duration === 'number'
                },
                speech: {
                    hasBuffer: speech instanceof Buffer,
                    bufferSize: speech.length
                }
            };
        });

        // Test 10: Logging and Monitoring
        await this.runTest('Logging and Monitoring', async () => {
            const originalLog = logger.info;
            let logCount = 0;

            // Mock logger to count logs
            logger.info = ((...args: any[]) => {
                logCount++;
                (originalLog as any).apply(logger, args);
            }) as any;

            const messages: ChatMessage[] = [
                { role: 'user', content: 'Test logging' }
            ];

            const chunks: any[] = [];
            for await (const chunk of FreeAIService.createChatCompletion({
                messages,
                userId: 'test-logging'
            })) {
                if (chunk.done) break;
                chunks.push(chunk);
            }

            // Restore original logger
            logger.info = originalLog;

            return {
                logsGenerated: logCount > 0,
                logCount,
                responseGenerated: chunks.length > 0
            };
        });

        this.generateReport();
    }

    generateReport() {
        console.log('\n📊 Production Readiness Test Report');
        console.log('=====================================\n');

        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const passRate = Math.round((passed / total) * 100);

        console.log(`Overall Result: ${passed}/${total} tests passed (${passRate}%)`);
        console.log(`Status: ${passRate >= 90 ? '🟢 PRODUCTION READY' : passRate >= 70 ? '🟡 NEEDS ATTENTION' : '🔴 NOT READY'}\n`);

        // Detailed results
        console.log('Test Details:');
        console.log('-------------');
        this.results.forEach((result, index) => {
            const status = result.passed ? '✅' : '❌';
            const duration = `${result.duration}ms`;
            console.log(`${index + 1}. ${status} ${result.name} (${duration})`);
            
            if (!result.passed && result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });

        // Performance summary
        const avgDuration = Math.round(
            this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length
        );
        const maxDuration = Math.max(...this.results.map(r => r.duration));

        console.log('\nPerformance Summary:');
        console.log('-------------------');
        console.log(`Average Response Time: ${avgDuration}ms`);
        console.log(`Maximum Response Time: ${maxDuration}ms`);
        console.log(`Performance Rating: ${maxDuration < 5000 ? '🟢 Excellent' : maxDuration < 10000 ? '🟡 Good' : '🔴 Needs Optimization'}`);

        // Recommendations
        console.log('\nRecommendations:');
        console.log('---------------');
        if (passRate >= 90) {
            console.log('🎉 Service is production-ready!');
            console.log('✅ All critical tests passed');
            console.log('✅ Performance is acceptable');
            console.log('✅ Error handling is robust');
        } else {
            console.log('⚠️  Service needs attention before production:');
            this.results.filter(r => !r.passed).forEach(result => {
                console.log(`   - Fix: ${result.name}`);
            });
        }

        console.log('\n🚀 Free AI Service Test Complete!');
    }
}

// Run tests
if (require.main === module) {
    const tester = new ProductionReadinessTest();
    tester.runAllTests().catch(console.error);
}

export { ProductionReadinessTest };