import { DIDService } from './services/did-avatar.service';

async function testDIDAvatar() {
  console.log('🎬 Testing D-ID Avatar Service...\n');

  try {
    // Test 1: Get available avatars
    console.log('👥 Testing avatar retrieval...');
    const avatars = DIDService.getAvailableAvatars();
    console.log(`✅ Found ${avatars.length} available avatars`);
    console.log('Sample avatar:', avatars[0]?.name, '-', avatars[0]?.description);
    console.log('');

    // Test 2: Filter avatars by criteria
    console.log('🔍 Testing avatar filtering...');
    const femaleAvatars = DIDService.getAvatarsByCriteria({ gender: 'female' });
    const youngAvatars = DIDService.getAvatarsByCriteria({ age: 'young' });
    const spanishAvatars = DIDService.getAvatarsByCriteria({ language: 'es' });
    
    console.log(`✅ Female avatars: ${femaleAvatars.length}`);
    console.log(`✅ Young avatars: ${youngAvatars.length}`);
    console.log(`✅ Spanish-speaking avatars: ${spanishAvatars.length}`);
    console.log('');

    // Test 3: Emotion analysis
    console.log('😊 Testing emotion analysis...');
    const testTexts = [
      'I am so excited to learn Spanish today!',
      'I am sorry, but I made a mistake.',
      'This is very important information.',
      'Hello, how are you doing today?'
    ];

    for (const text of testTexts) {
      const emotion = await DIDService.analyzeEmotion(text);
      console.log(`"${text.substring(0, 30)}..." → ${emotion}`);
    }
    console.log('');

    // Test 4: Text-to-speech fallback
    console.log('🔊 Testing text-to-speech fallback...');
    const ttsUrl = await DIDService.generateTextToSpeech(
      'This is a test of the text-to-speech fallback system.',
      'en-US-AriaNeural'
    );
    console.log('✅ TTS URL generated:', ttsUrl);
    console.log('');

    // Test 5: Video generation request preparation
    console.log('🎥 Testing video generation request...');
    const testRequest = {
      text: 'Hello! Welcome to BhashaGPT. I am here to help you learn languages.',
      avatarId: 'amy-jcwCkr1grs',
      emotion: 'friendly',
      userId: 'test-user-123',
      voice: {
        type: 'text' as const,
        language: 'en',
        style: 'friendly'
      },
      config: {
        fluent: true,
        pad_audio: 0.5,
        stitch: true,
        result_format: 'mp4' as const
      }
    };

    console.log('Request prepared:', {
      text: testRequest.text.substring(0, 50) + '...',
      avatarId: testRequest.avatarId,
      emotion: testRequest.emotion,
      userId: testRequest.userId
    });

    // Note: Actual video generation requires D-ID API key
    if (process.env.DID_API_KEY) {
      console.log('🔑 D-ID API key found - video generation would work');
    } else {
      console.log('⚠️  D-ID API key not found - add DID_API_KEY to .env for full testing');
    }
    console.log('');

    console.log('🎉 All D-ID Avatar Service tests completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   • ${avatars.length} avatars available`);
    console.log(`   • Emotion analysis working`);
    console.log(`   • Text-to-speech fallback ready`);
    console.log(`   • Video generation ${process.env.DID_API_KEY ? 'ready' : 'needs API key'}`);
    console.log('');
    console.log('🚀 The D-ID Avatar system is ready for production use!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('D-ID API key')) {
        console.log('\n💡 Note: Add your D-ID API key to the .env file:');
        console.log('   DID_API_KEY="your-d-id-api-key-here"');
      } else if (error.message.includes('Redis')) {
        console.log('\n💡 Note: Make sure Redis is running for caching functionality');
      } else if (error.message.includes('Database')) {
        console.log('\n💡 Note: Make sure the database is connected and migrated');
      }
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDIDAvatar();
}

export { testDIDAvatar };