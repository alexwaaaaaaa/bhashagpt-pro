import { PrismaClient, SubscriptionTier, SubscriptionStatus, LearningLevel, MessageRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.apiUsage.deleteMany();
    await prisma.userProgress.deleteMany();
    await prisma.message.deleteMany();
    await prisma.chatSession.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.userActivity.deleteMany();
    await prisma.translation.deleteMany();
    await prisma.user.deleteMany();
  }

  // Create sample users
  console.log('👥 Creating sample users...');
  
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const users = await Promise.all([
    // Free user
    prisma.user.create({
      data: {
        email: 'john.doe@example.com',
        password: hashedPassword,
        name: 'John Doe',
        subscriptionTier: SubscriptionTier.FREE,
        preferredLanguage: 'en',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
    }),
    
    // Pro user
    prisma.user.create({
      data: {
        email: 'jane.smith@example.com',
        password: hashedPassword,
        name: 'Jane Smith',
        subscriptionTier: SubscriptionTier.PRO,
        preferredLanguage: 'en',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
    }),
    
    // Enterprise user
    prisma.user.create({
      data: {
        email: 'admin@bhashagpt.com',
        password: hashedPassword,
        name: 'Admin User',
        subscriptionTier: SubscriptionTier.ENTERPRISE,
        preferredLanguage: 'en',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
    }),
    
    // Hindi user
    prisma.user.create({
      data: {
        email: 'raj.sharma@example.com',
        password: hashedPassword,
        name: 'राज शर्मा',
        subscriptionTier: SubscriptionTier.PRO,
        preferredLanguage: 'hi',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create user progress for different languages
  console.log('📈 Creating user progress...');
  
  const progressData = [
    // John's progress
    { userId: users[0].id, language: 'es', level: LearningLevel.BEGINNER, streakDays: 5, totalLessons: 12, totalMinutes: 180, xpPoints: 240 },
    { userId: users[0].id, language: 'fr', level: LearningLevel.BEGINNER, streakDays: 2, totalLessons: 5, totalMinutes: 75, xpPoints: 100 },
    
    // Jane's progress
    { userId: users[1].id, language: 'es', level: LearningLevel.INTERMEDIATE, streakDays: 15, totalLessons: 45, totalMinutes: 900, xpPoints: 1200 },
    { userId: users[1].id, language: 'de', level: LearningLevel.BEGINNER, streakDays: 8, totalLessons: 20, totalMinutes: 400, xpPoints: 500 },
    
    // Admin's progress
    { userId: users[2].id, language: 'hi', level: LearningLevel.ADVANCED, streakDays: 30, totalLessons: 100, totalMinutes: 2000, xpPoints: 3000 },
    
    // Raj's progress
    { userId: users[3].id, language: 'en', level: LearningLevel.INTERMEDIATE, streakDays: 12, totalLessons: 35, totalMinutes: 700, xpPoints: 900 },
    { userId: users[3].id, language: 'es', level: LearningLevel.BEGINNER, streakDays: 3, totalLessons: 8, totalMinutes: 120, xpPoints: 160 },
  ];

  for (const progress of progressData) {
    await prisma.userProgress.create({
      data: {
        ...progress,
        lastStudyAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
        achievements: ['first_lesson', 'week_streak'],
      },
    });
  }

  console.log(`✅ Created ${progressData.length} progress records`);

  // Create subscriptions
  console.log('💳 Creating subscriptions...');
  
  const subscriptions = [
    // Jane's Pro subscription
    {
      userId: users[1].id,
      planType: SubscriptionTier.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_test_jane_smith',
      stripeSubscriptionId: 'sub_test_jane_pro',
      stripePriceId: 'price_test_pro_monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    
    // Admin's Enterprise subscription
    {
      userId: users[2].id,
      planType: SubscriptionTier.ENTERPRISE,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_test_admin',
      stripeSubscriptionId: 'sub_test_admin_enterprise',
      stripePriceId: 'price_test_enterprise_yearly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    
    // Raj's Pro subscription
    {
      userId: users[3].id,
      planType: SubscriptionTier.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_test_raj_sharma',
      stripeSubscriptionId: 'sub_test_raj_pro',
      stripePriceId: 'price_test_pro_monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const subscription of subscriptions) {
    await prisma.subscription.create({ data: subscription });
  }

  console.log(`✅ Created ${subscriptions.length} subscriptions`);

  // Create chat sessions
  console.log('💬 Creating chat sessions...');
  
  const chatSessions = await Promise.all([
    // John's Spanish learning session
    prisma.chatSession.create({
      data: {
        userId: users[0].id,
        title: 'Spanish Basics - Greetings',
        language: 'es',
        learningLevel: LearningLevel.BEGINNER,
        totalTokens: 1250,
        totalCost: 0.025,
      },
    }),
    
    // Jane's German conversation
    prisma.chatSession.create({
      data: {
        userId: users[1].id,
        title: 'German Business Conversation',
        language: 'de',
        learningLevel: LearningLevel.INTERMEDIATE,
        totalTokens: 2800,
        totalCost: 0.056,
      },
    }),
    
    // Raj's English practice
    prisma.chatSession.create({
      data: {
        userId: users[3].id,
        title: 'English Job Interview Practice',
        language: 'en',
        learningLevel: LearningLevel.INTERMEDIATE,
        totalTokens: 3200,
        totalCost: 0.064,
      },
    }),
  ]);

  console.log(`✅ Created ${chatSessions.length} chat sessions`);

  // Create sample messages
  console.log('📝 Creating sample messages...');
  
  const messages = [
    // Spanish lesson messages
    {
      sessionId: chatSessions[0].id,
      userId: users[0].id,
      role: MessageRole.USER,
      content: 'Hello! I want to learn basic Spanish greetings.',
      isAi: false,
      tokens: 12,
    },
    {
      sessionId: chatSessions[0].id,
      userId: users[0].id,
      role: MessageRole.ASSISTANT,
      content: '¡Hola! I\'d be happy to help you learn Spanish greetings. Let\'s start with the most common ones:\n\n• Hola - Hello\n• Buenos días - Good morning\n• Buenas tardes - Good afternoon\n• Buenas noches - Good evening/night\n\nTry saying "Hola, ¿cómo estás?" which means "Hello, how are you?"',
      translatedContent: 'Hello! I\'d be happy to help you learn Spanish greetings...',
      isAi: true,
      tokens: 95,
      language: 'es',
    },
    {
      sessionId: chatSessions[0].id,
      userId: users[0].id,
      role: MessageRole.USER,
      content: 'Hola, ¿cómo estás?',
      isAi: false,
      tokens: 8,
      language: 'es',
    },
    
    // German business conversation
    {
      sessionId: chatSessions[1].id,
      userId: users[1].id,
      role: MessageRole.USER,
      content: 'I need to practice German for business meetings. Can you help?',
      isAi: false,
      tokens: 15,
    },
    {
      sessionId: chatSessions[1].id,
      userId: users[1].id,
      role: MessageRole.ASSISTANT,
      content: 'Gerne! I\'ll help you practice German for business contexts. Let\'s start with formal greetings and introductions:\n\n• Guten Tag - Good day (formal)\n• Freut mich, Sie kennenzulernen - Nice to meet you\n• Darf ich mich vorstellen? - May I introduce myself?\n\nTry introducing yourself in German!',
      isAi: true,
      tokens: 78,
      language: 'de',
    },
    
    // English job interview practice
    {
      sessionId: chatSessions[2].id,
      userId: users[3].id,
      role: MessageRole.USER,
      content: 'I have a job interview next week. Can you help me practice common questions?',
      isAi: false,
      tokens: 18,
    },
    {
      sessionId: chatSessions[2].id,
      userId: users[3].id,
      role: MessageRole.ASSISTANT,
      content: 'Absolutely! I\'ll help you prepare for your job interview. Let\'s practice with some common questions:\n\n1. "Tell me about yourself"\n2. "Why do you want this job?"\n3. "What are your strengths and weaknesses?"\n4. "Where do you see yourself in 5 years?"\n\nLet\'s start with the first one. Can you tell me about yourself?',
      isAi: true,
      tokens: 89,
      language: 'en',
    },
  ];

  for (const message of messages) {
    await prisma.message.create({
      data: {
        ...message,
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time within last day
      },
    });
  }

  console.log(`✅ Created ${messages.length} messages`);

  // Create API usage records
  console.log('📊 Creating API usage records...');
  
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

  const apiUsageData = [
    // John's usage (Free tier)
    { userId: users[0].id, date: today, tokensUsed: 1250, chatMessages: 5, voiceMinutes: 0, translations: 3, apiCalls: 8, cost: 0.025 },
    { userId: users[0].id, date: yesterday, tokensUsed: 800, chatMessages: 3, voiceMinutes: 2, translations: 5, apiCalls: 10, cost: 0.018 },
    
    // Jane's usage (Pro tier)
    { userId: users[1].id, date: today, tokensUsed: 5200, chatMessages: 15, voiceMinutes: 12, translations: 25, apiCalls: 52, cost: 0.104 },
    { userId: users[1].id, date: yesterday, tokensUsed: 4800, chatMessages: 12, voiceMinutes: 8, translations: 20, apiCalls: 40, cost: 0.096 },
    { userId: users[1].id, date: twoDaysAgo, tokensUsed: 3600, chatMessages: 10, voiceMinutes: 6, translations: 15, apiCalls: 31, cost: 0.072 },
    
    // Raj's usage (Pro tier)
    { userId: users[3].id, date: today, tokensUsed: 3200, chatMessages: 8, voiceMinutes: 5, translations: 12, apiCalls: 25, cost: 0.064 },
    { userId: users[3].id, date: yesterday, tokensUsed: 2400, chatMessages: 6, voiceMinutes: 3, translations: 8, apiCalls: 17, cost: 0.048 },
  ];

  for (const usage of apiUsageData) {
    await prisma.apiUsage.create({ data: usage });
  }

  console.log(`✅ Created ${apiUsageData.length} API usage records`);

  // Create sample translations cache
  console.log('🌐 Creating translation cache...');
  
  const translations = [
    {
      sourceText: 'Hello, how are you?',
      translatedText: 'Hola, ¿cómo estás?',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      provider: 'google',
      confidence: 0.98,
      cacheKey: 'en-es-hello-how-are-you',
      hitCount: 15,
    },
    {
      sourceText: 'Good morning',
      translatedText: 'Buenos días',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      provider: 'google',
      confidence: 0.99,
      cacheKey: 'en-es-good-morning',
      hitCount: 23,
    },
    {
      sourceText: 'Thank you very much',
      translatedText: 'Vielen Dank',
      sourceLanguage: 'en',
      targetLanguage: 'de',
      provider: 'google',
      confidence: 0.97,
      cacheKey: 'en-de-thank-you-very-much',
      hitCount: 8,
    },
    {
      sourceText: 'Nice to meet you',
      translatedText: 'आपसे मिलकर खुशी हुई',
      sourceLanguage: 'en',
      targetLanguage: 'hi',
      provider: 'google',
      confidence: 0.95,
      cacheKey: 'en-hi-nice-to-meet-you',
      hitCount: 12,
    },
  ];

  for (const translation of translations) {
    await prisma.translation.create({ data: translation });
  }

  console.log(`✅ Created ${translations.length} translation cache entries`);

  console.log('🎉 Database seeding completed successfully!');
  
  // Print summary
  console.log('\n📋 Seeding Summary:');
  console.log(`👥 Users: ${users.length}`);
  console.log(`📈 Progress records: ${progressData.length}`);
  console.log(`💳 Subscriptions: ${subscriptions.length}`);
  console.log(`💬 Chat sessions: ${chatSessions.length}`);
  console.log(`📝 Messages: ${messages.length}`);
  console.log(`📊 API usage records: ${apiUsageData.length}`);
  console.log(`🌐 Translation cache: ${translations.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });