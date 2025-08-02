# Google Gemini Setup Guide

## 🎯 **Why Gemini?**

Google Gemini is the **best free AI option** for BhashaGPT Pro:

- ✅ **Completely Free** - 15 requests/minute, 1500/day
- ✅ **High Quality** - Better than Hugging Face, close to GPT-4
- ✅ **Fast Response** - Quick generation times
- ✅ **Multi-language** - Excellent for language learning
- ✅ **No Credit Card** - Just Google account needed

## 🔑 **Get Free Gemini API Key**

### **Step 1: Go to Google AI Studio**
1. Visit: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Accept terms and conditions

### **Step 2: Create API Key**
1. Click "Create API Key"
2. Select "Create API key in new project" (recommended)
3. Copy the generated API key
4. Keep it safe - you won't see it again!

### **Step 3: Add to Your Project**
```bash
# Add to your .env file
GEMINI_API_KEY="AIzaSyC-your-actual-api-key-here"
AI_PROVIDER="gemini"
```

## 🚀 **Quick Test**

### **Test API Key:**
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY" \
-H "Content-Type: application/json" \
-d '{
  "contents": [{
    "parts": [{
      "text": "Hello, how are you?"
    }]
  }]
}'
```

### **Test in BhashaGPT:**
```bash
# Start your server
npm run dev

# Test AI service
curl -X POST http://localhost:8000/api/v1/ai/test \
-H "Content-Type: application/json" \
-d '{"message": "Hello, I want to learn Spanish"}'
```

## 📊 **Gemini vs Other Options**

| Feature | Gemini (Free) | OpenAI | Hugging Face | Mock |
|---------|---------------|--------|--------------|------|
| **Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Cost** | **FREE** | $5+ | FREE | FREE |
| **Limits** | 15/min | Pay per use | Rate limited | None |
| **Languages** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Setup** | Easy | Medium | Easy | None |

## 🎯 **Gemini Features in BhashaGPT**

### **1. Chat Completion**
```javascript
// Intelligent language tutoring
const response = await aiService.createChatCompletion({
  messages: [
    { role: 'user', content: 'How do I say hello in Spanish?' }
  ],
  language: 'en'
});
```

### **2. Translation**
```javascript
// High-quality translation
const translation = await aiService.translateText(
  'Hello, how are you?',
  'en',
  'es'
);
// Result: "Hola, ¿cómo estás?"
```

### **3. Language Detection**
```javascript
// Detect language automatically
const detection = await aiService.detectLanguage('Bonjour, comment allez-vous?');
// Result: { language: 'fr', confidence: 0.95 }
```

### **4. Grammar Correction**
```javascript
// Fix grammar mistakes
const correction = await aiService.correctGrammar(
  'I are learning Spanish',
  'en'
);
// Result: { correctedText: 'I am learning Spanish', corrections: [...] }
```

## ⚙️ **Configuration Options**

### **Basic Setup (.env)**
```bash
# Recommended for most users
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-api-key-here"
```

### **Advanced Setup**
```bash
# Multiple providers with fallback
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-gemini-key"
OPENAI_API_KEY="your-openai-key"  # Fallback
HUGGING_FACE_TOKEN="your-hf-token"  # Second fallback
```

## 🔍 **Monitoring Usage**

### **Check Service Status:**
```bash
GET http://localhost:8000/api/v1/ai/info
```

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "gemini",
    "model": "gemini-pro",
    "hasGeminiKey": true,
    "features": [
      "Chat Completion",
      "Translation",
      "Language Detection", 
      "Grammar Correction"
    ],
    "limits": {
      "requestsPerMinute": 15,
      "requestsPerDay": 1500,
      "cost": "Free"
    }
  }
}
```

## 🚨 **Rate Limits & Best Practices**

### **Free Tier Limits:**
- **15 requests per minute**
- **1,500 requests per day**
- **No cost** - completely free

### **Best Practices:**
1. **Cache responses** - Avoid duplicate requests
2. **Batch similar requests** - Group related queries
3. **Handle rate limits** - Implement retry logic
4. **Monitor usage** - Track daily usage
5. **Use fallbacks** - Have backup providers

### **Rate Limit Handling:**
```javascript
// Automatic retry with exponential backoff
if (error.message.includes('rate limit')) {
  await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
  // Retry request
}
```

## 🛠️ **Troubleshooting**

### **Common Issues:**

#### **1. "API key not valid"**
```bash
# Solution: Check your API key
echo $GEMINI_API_KEY
# Make sure it starts with "AIzaSy"
```

#### **2. "Rate limit exceeded"**
```bash
# Solution: Wait 1 minute or use fallback
AI_PROVIDER="free"  # Temporary fallback
```

#### **3. "Service unavailable"**
```bash
# Solution: Check Google AI Studio status
curl -I https://generativelanguage.googleapis.com/
```

### **Debug Mode:**
```bash
# Enable debug logging
LOG_LEVEL="debug"
npm run dev
```

## 📈 **Performance Tips**

### **1. Optimize Prompts**
```javascript
// Good: Specific and clear
"Translate 'Hello' from English to Spanish"

// Bad: Vague and long
"Can you please help me translate this word from English language to Spanish language: Hello"
```

### **2. Use Appropriate Temperature**
```javascript
// For translation/facts: low temperature
temperature: 0.1

// For creative content: higher temperature  
temperature: 0.7
```

### **3. Cache Responses**
```javascript
// Cache translations and common responses
const cacheKey = `translate_${text}_${fromLang}_${toLang}`;
const cached = await redis.get(cacheKey);
if (cached) return cached;
```

## 🎉 **Success!**

With Gemini setup, your BhashaGPT Pro will have:

- ✅ **High-quality AI responses** for language learning
- ✅ **Free unlimited usage** within rate limits
- ✅ **Fast response times** for better UX
- ✅ **Multi-language support** for global users
- ✅ **Advanced features** like grammar correction
- ✅ **Reliable fallbacks** for 99.9% uptime

**Your language learning platform is now powered by Google's best AI - completely free!**