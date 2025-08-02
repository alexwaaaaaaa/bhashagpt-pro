# BhashaGPT Language Tutor API Documentation

## Overview

The BhashaGPT Language Tutor API provides advanced AI-powered language learning capabilities with context-aware conversations, grammar correction, vocabulary building, and cultural insights.

## Features

### ✅ **Core Features**
- **Context-Aware Conversations** - Maintains conversation history and adapts to user level
- **Grammar Correction** - Real-time grammar analysis with detailed explanations
- **Vocabulary Building** - Interactive exercises and contextual word learning
- **Cultural Insights** - Cultural context and tips for authentic communication
- **Progress Tracking** - XP system, streaks, and learning analytics
- **Adaptive Difficulty** - Automatically adjusts complexity based on user performance
- **Stream Responses** - Real-time streaming for natural conversation feel

### ✅ **Advanced Capabilities**
- **Multi-level Support** - BEGINNER, INTERMEDIATE, ADVANCED, NATIVE
- **Token Management** - Intelligent token usage with retry logic
- **Error Handling** - Comprehensive error recovery and fallbacks
- **Content Filtering** - OpenAI moderation for safe interactions
- **Usage Tracking** - Integrated with subscription limits

## API Endpoints

### 1. Chat with Language Tutor

**POST** `/api/v1/tutor/chat`

Start or continue a conversation with the AI language tutor.

```json
{
  "message": "Hola, ¿cómo estás?",
  "targetLanguage": "Spanish",
  "nativeLanguage": "English",
  "proficiencyLevel": "INTERMEDIATE",
  "learningGoals": ["conversation", "grammar"],
  "culturalContext": true,
  "conversationHistory": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "2024-01-01T10:00:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "¡Hola! Estoy muy bien, gracias. ¿Y tú cómo estás hoy?",
    "nativeTranslation": "Hello! I'm very well, thank you. And how are you today?",
    "corrections": [
      {
        "original": "como estas",
        "corrected": "cómo estás",
        "explanation": "Remember to use accent marks: 'cómo' (how) and 'estás' (you are)",
        "rule": "Interrogative words require accent marks"
      }
    ],
    "vocabulary": [
      {
        "word": "estás",
        "translation": "you are (informal)",
        "pronunciation": "es-TAHS",
        "context": "Used for temporary states and conditions",
        "difficulty": 2
      }
    ],
    "culturalInsight": "In Spanish-speaking countries, it's common to ask about someone's well-being as a genuine inquiry, not just a greeting.",
    "pronunciationTips": [
      "Roll the 'r' in 'gracias' lightly",
      "Stress the last syllable in 'estás'"
    ],
    "nextSuggestions": [
      "Tell me about your day",
      "Ask about weekend plans",
      "Discuss your hobbies"
    ],
    "difficultyAdjustment": "maintain"
  }
}
```

### 2. Stream Chat Response

**POST** `/api/v1/tutor/chat/stream`

Get real-time streaming responses for natural conversation flow.

**Request:** Same as regular chat

**Response:** Server-Sent Events (SSE)
```
data: {"content": "¡Hola! "}
data: {"content": "Estoy muy bien, "}
data: {"content": "gracias. "}
data: {"done": true}
```

### 3. Generate Vocabulary Exercise

**POST** `/api/v1/tutor/vocabulary/exercise`

Create personalized vocabulary building exercises.

```json
{
  "language": "French",
  "topic": "food and cooking"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "topic": "Food and Cooking",
    "level": "INTERMEDIATE",
    "vocabulary": [
      {
        "word": "cuisiner",
        "translation": "to cook",
        "pronunciation": "kwee-zee-NAY",
        "example": "J'aime cuisiner le weekend."
      }
    ],
    "dialogue": "Marie et Pierre parlent de cuisine...",
    "exercises": [
      {
        "type": "fill_blank",
        "question": "Je vais _____ un gâteau. (I'm going to bake a cake)",
        "answer": "cuisiner",
        "options": ["cuisiner", "manger", "acheter"]
      }
    ],
    "culturalContext": "French cooking emphasizes fresh, seasonal ingredients..."
  }
}
```

### 4. Grammar Analysis

**POST** `/api/v1/tutor/grammar/analyze`

Analyze text for grammar mistakes with detailed explanations.

```json
{
  "text": "Je suis allé au magasin hier et j'ai acheté des pomme.",
  "language": "French",
  "userLevel": "INTERMEDIATE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalText": "Je suis allé au magasin hier et j'ai acheté des pomme.",
    "corrections": [
      {
        "original": "des pomme",
        "corrected": "des pommes",
        "explanation": "After 'des' (plural article), nouns must be plural. Add 's' to 'pomme'.",
        "rule": "Plural agreement with indefinite articles"
      }
    ],
    "correctionCount": 1
  }
}
```

### 5. Cultural Insights

**POST** `/api/v1/tutor/culture/insight`

Get cultural context and insights for better language understanding.

```json
{
  "language": "Japanese",
  "topic": "business meetings",
  "userLevel": "ADVANCED"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "topic": "business meetings",
    "language": "Japanese",
    "insight": "In Japanese business culture, the concept of 'nemawashi' (根回し) is crucial. This refers to the informal consensus-building that happens before official meetings. Decisions are rarely made during the meeting itself; instead, the meeting serves to formally confirm what has already been agreed upon through private discussions. Understanding this helps explain why Japanese business meetings might seem formal or predetermined to Western participants."
  }
}
```

### 6. Learning Progress

**GET** `/api/v1/tutor/progress/:language`

Track user's learning progress and statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "language": "Spanish",
    "progress": {
      "totalSessions": 45,
      "currentStreak": 7,
      "xpPoints": 1250,
      "level": "INTERMEDIATE",
      "completedLessons": 23,
      "averageSessionLength": 15
    },
    "recentActivity": [
      {
        "date": "2024-01-01",
        "sessionsCount": 2,
        "xpGained": 35,
        "topicsDiscussed": ["food", "travel"]
      }
    ],
    "strengths": ["vocabulary", "pronunciation"],
    "areasForImprovement": ["subjunctive mood", "formal register"]
  }
}
```

### 7. Conversation Suggestions

**GET** `/api/v1/tutor/suggestions?language=Spanish&proficiencyLevel=INTERMEDIATE&interests=travel,food`

Get personalized conversation topic suggestions.

**Response:**
```json
{
  "success": true,
  "data": [
    "Discuss your travel experiences and dream destinations",
    "Talk about cultural differences you've noticed",
    "Explain a recipe from your country",
    "Describe a memorable meal you've had",
    "Plan an imaginary trip to a Spanish-speaking country",
    "Compare food cultures between countries"
  ]
}
```

## Proficiency Levels

### BEGINNER
- **Vocabulary:** 500-1000 words
- **Grammar:** Present tense, basic sentence structure
- **Topics:** Daily routines, family, hobbies, basic needs
- **Features:** Heavy translation support, simple corrections, basic cultural tips

### INTERMEDIATE  
- **Vocabulary:** 1000-3000 words
- **Grammar:** Past/future tenses, complex sentences
- **Topics:** Travel, work, opinions, experiences
- **Features:** Moderate translation, detailed grammar explanations, cultural insights

### ADVANCED
- **Vocabulary:** 3000+ words, idioms
- **Grammar:** Subjunctive, conditional, complex structures
- **Topics:** Abstract concepts, debates, literature
- **Features:** Minimal translation, nuanced corrections, deep cultural context

### NATIVE
- **Vocabulary:** Full range including slang, technical terms
- **Grammar:** Perfect fluency, style refinement
- **Topics:** Any topic at native level
- **Features:** Style suggestions, regional variations, sophisticated discourse

## Error Handling

### Rate Limiting
```json
{
  "success": false,
  "message": "Daily message limit reached. Upgrade to Pro for unlimited conversations.",
  "remaining": 0,
  "resetDate": "2024-01-02T00:00:00Z"
}
```

### Service Errors
```json
{
  "success": false,
  "message": "Failed to process your message. Please try again.",
  "code": "PROCESSING_ERROR"
}
```

### Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "targetLanguage",
      "message": "Target language is required"
    }
  ]
}
```

## Usage Tracking

The system automatically tracks:
- **Messages sent** (counts against daily limits)
- **Tokens used** (for cost management)
- **Session duration** (for analytics)
- **Learning progress** (XP, streaks, achievements)

## Best Practices

### 1. Conversation Flow
- Maintain conversation history for context
- Use appropriate proficiency level
- Include learning goals for personalized responses

### 2. Error Recovery
- Implement retry logic for failed requests
- Handle rate limiting gracefully
- Provide fallback responses for service errors

### 3. Performance
- Use streaming for real-time feel
- Cache conversation history locally
- Implement proper loading states

### 4. User Experience
- Show progress indicators during processing
- Display grammar corrections prominently
- Encourage regular practice with streaks

## Integration Examples

### Frontend Integration (React)
```javascript
// Stream chat response
const streamChat = async (message, context) => {
  const response = await fetch('/api/v1/tutor/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message, ...context })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.content) {
          // Update UI with streaming content
          updateChatMessage(data.content);
        }
      }
    }
  }
};
```

### Mobile Integration (React Native)
```javascript
// Grammar analysis with feedback
const analyzeGrammar = async (text, language) => {
  try {
    const response = await fetch('/api/v1/tutor/grammar/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text, language, userLevel: 'INTERMEDIATE' })
    });

    const result = await response.json();
    
    if (result.success) {
      showGrammarFeedback(result.data.corrections);
    }
  } catch (error) {
    showError('Failed to analyze grammar');
  }
};
```

## Security & Privacy

- All conversations are encrypted in transit
- User data is anonymized for AI training
- Content moderation prevents inappropriate responses
- Usage tracking respects user privacy settings
- Conversation history can be deleted by users

## Monitoring & Analytics

The system provides comprehensive analytics:
- **Usage patterns** by language and level
- **Learning progress** tracking
- **Popular topics** and conversation flows
- **Error rates** and performance metrics
- **User engagement** and retention data