import { LanguageTutorService, TutorContext } from './services/language-tutor.service';

async function testLanguageTutor() {
  console.log('🧪 Testing Language Tutor Service...\n');

  const context: TutorContext = {
    userId: 'test-user-123',
    targetLanguage: 'Spanish',
    nativeLanguage: 'English',
    proficiencyLevel: 'INTERMEDIATE',
    conversationHistory: [],
    learningGoals: ['conversation', 'grammar'],
    culturalContext: true,
  };

  try {
    console.log('📝 Testing vocabulary exercise generation...');
    const vocabExercise = await LanguageTutorService.generateVocabularyExercise(
      'test-user-123',
      'Spanish',
      'food and cooking'
    );
    console.log('✅ Vocabulary exercise generated successfully');
    console.log('Sample:', JSON.stringify(vocabExercise, null, 2).slice(0, 200) + '...\n');

    console.log('🔍 Testing grammar analysis...');
    const grammarAnalysis = await LanguageTutorService.analyzeGrammar(
      'Yo soy muy feliz hoy y quiero comer algo delicioso.',
      'Spanish',
      'INTERMEDIATE'
    );
    console.log('✅ Grammar analysis completed');
    console.log('Corrections found:', grammarAnalysis.length, '\n');

    console.log('🌍 Testing cultural insight...');
    const culturalInsight = await LanguageTutorService.getCulturalInsight(
      'Spanish',
      'greetings',
      'INTERMEDIATE'
    );
    console.log('✅ Cultural insight generated');
    console.log('Insight preview:', culturalInsight.slice(0, 100) + '...\n');

    console.log('💬 Testing tutor conversation...');
    const tutorResponse = await LanguageTutorService.generateTutorResponse(
      context,
      'Hola, ¿cómo estás? Me gusta aprender español.'
    );
    console.log('✅ Tutor response generated successfully');
    console.log('Response preview:', tutorResponse.message.slice(0, 100) + '...');
    console.log('Corrections:', tutorResponse.corrections.length);
    console.log('Vocabulary items:', tutorResponse.vocabulary.length);
    console.log('Next suggestions:', tutorResponse.nextSuggestions.length, '\n');

    console.log('🎉 All tests passed! Language Tutor Service is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      console.log('\n💡 Note: Make sure your OpenAI API key is set in the environment variables.');
      console.log('   Add OPENAI_API_KEY to your .env file to test the full functionality.');
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testLanguageTutor();
}

export { testLanguageTutor };