# 🤗 Hugging Face Token Setup Guide

## 🎯 Overview
Hugging Face provides free access to thousands of AI models. Token improves rate limits and gives access to more models.

## 📋 Step-by-Step Instructions

### Step 1: Create Account
1. Go to [https://huggingface.co/](https://huggingface.co/)
2. Click **"Sign Up"** (top right corner)
3. Choose signup method:
   - **Email + Password** (recommended)
   - **GitHub** (if you have GitHub account)
   - **Google** (if you have Google account)
4. Fill in details:
   - **Username**: Choose unique username
   - **Email**: Your email address
   - **Password**: Strong password
5. Click **"Sign Up"**
6. **Verify email** - Check your inbox and click verification link

### Step 2: Access Token Settings
1. **Login** to your Hugging Face account
2. Click on your **profile picture** (top right corner)
3. Select **"Settings"** from dropdown menu
4. In left sidebar, click **"Access Tokens"**

### Step 3: Generate New Token
1. Click **"New token"** button
2. Fill in token details:
   - **Name**: `BhashaGPT-Token` (or any name you prefer)
   - **Role**: Select **"Read"** (sufficient for API access)
   - **Repositories**: Leave empty (optional)
3. Click **"Generate a token"**
4. **IMPORTANT**: Copy the token immediately and save it securely
   - Token format: `hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - You won't be able to see it again!

### Step 4: Configure in Your Project
Add to your `.env` file:
```bash
# Hugging Face Configuration
HUGGING_FACE_TOKEN="hf_your_actual_token_here"
AI_PROVIDER="free"
```

## 🔧 Testing Your Token

### Test 1: Check Token Validity
```bash
curl -H "Authorization: Bearer hf_your_token_here" \
     https://api-inference.huggingface.co/models/gpt2
```

### Test 2: Test in Your App
```bash
# Start your server
npm run dev

# Test AI service
curl -X GET http://localhost:8000/api/v1/ai/info
```

Expected response:
```json
{
  "success": true,
  "data": {
    "provider": "free",
    "hasHuggingFaceToken": true,
    "description": "Using Free AI APIs (Hugging Face, Gemini)"
  }
}
```

## 🆓 Free Tier Limits

### Without Token:
- **Rate Limit**: ~10 requests/minute
- **Models**: Limited access
- **Queue Time**: Longer wait times

### With Free Token:
- **Rate Limit**: ~30 requests/minute
- **Models**: Access to most free models
- **Queue Time**: Faster processing
- **Priority**: Higher priority in queue

## 🚀 Available Models

### Text Generation:
- `gpt2` - Basic text generation
- `microsoft/DialoGPT-large` - Conversational AI
- `facebook/blenderbot-400M-distill` - Chatbot

### Translation:
- `Helsinki-NLP/opus-mt-en-es` - English to Spanish
- `Helsinki-NLP/opus-mt-en-hi` - English to Hindi
- `Helsinki-NLP/opus-mt-en-fr` - English to French

### Sentiment Analysis:
- `cardiffnlp/twitter-roberta-base-sentiment-latest`
- `nlptown/bert-base-multilingual-uncased-sentiment`

## 🔒 Security Best Practices

### ✅ Do:
- Keep token in `.env` file only
- Add `.env` to `.gitignore`
- Use "Read" role for basic access
- Regenerate token if compromised

### ❌ Don't:
- Share token publicly
- Commit token to git
- Use "Write" role unless needed
- Store token in frontend code

## 🛠️ Troubleshooting

### Common Issues:

#### 1. "Invalid token" error
```bash
# Check if token is correctly formatted
echo $HUGGING_FACE_TOKEN
# Should start with "hf_"
```

#### 2. "Rate limit exceeded"
```bash
# Wait 1 minute and try again
# Or upgrade to paid plan for higher limits
```

#### 3. "Model loading" error
```bash
# Some models take time to load
# Wait 20-30 seconds and retry
```

#### 4. "Service unavailable"
```bash
# Hugging Face servers might be busy
# Try different model or wait
```

## 💡 Pro Tips

### 1. Model Selection:
- Use smaller models for faster responses
- Use larger models for better quality
- Test different models to find best fit

### 2. Caching:
- Our service automatically caches responses
- Repeated requests are served from cache
- Reduces API calls and improves speed

### 3. Fallbacks:
- Service automatically falls back to other providers
- If Hugging Face fails, tries Gemini or Mock
- Always provides some response

### 4. Monitoring:
```bash
# Check service status
curl http://localhost:8000/api/v1/ai/info

# Test specific functionality
curl -X POST http://localhost:8000/api/v1/ai/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

## 🎯 Next Steps

1. **Get Token**: Follow steps above to get your free token
2. **Configure**: Add token to `.env` file
3. **Test**: Use `/api/v1/ai/test` endpoint
4. **Integrate**: Start using in your language learning app
5. **Monitor**: Check usage and performance
6. **Optimize**: Fine-tune based on your needs

## 📞 Support

If you face any issues:
1. Check [Hugging Face Status](https://status.huggingface.co/)
2. Review [Hugging Face Docs](https://huggingface.co/docs)
3. Test with different models
4. Check server logs for detailed errors

## 🎉 Success!

Once configured, you'll have access to:
- ✅ Free AI chat responses
- ✅ Multiple language support
- ✅ Translation capabilities
- ✅ Sentiment analysis
- ✅ No monthly costs
- ✅ Good quality responses

Your BhashaGPT Pro will work without any paid APIs!