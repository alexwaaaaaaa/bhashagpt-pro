import { Router } from 'express';
import { AIService } from '../services/ai.service';
import { logger } from '../utils/logger';

const router = Router();

// Get AI service information
router.get('/info', async (req, res) => {
  try {
    const serviceInfo = AIService.getServiceInfo();
    
    logger.info('AI service info requested', {
      provider: serviceInfo.provider,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: serviceInfo
    });

  } catch (error) {
    logger.error('Failed to get AI service info', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get AI service information'
    });
  }
});

// Test AI service
router.post('/test', async (req, res) => {
  try {
    const { message = 'Hello, how are you?' } = req.body;
    
    const completion = AIService.createChatCompletion({
      messages: [
        { role: 'user', content: message }
      ],
      userId: req.user?.id
    });

    let response = '';
    for await (const chunk of completion) {
      response += chunk.content;
      if (chunk.done) break;
    }

    res.json({
      success: true,
      data: {
        input: message,
        output: response,
        service: AIService.getServiceInfo()
      }
    });

  } catch (error) {
    logger.error('AI service test failed', { error });
    res.status(500).json({
      success: false,
      message: 'AI service test failed'
    });
  }
});

// Test translation
router.post('/test-translation', async (req, res) => {
  try {
    const { text = 'Hello, how are you?', fromLang = 'en', toLang = 'es' } = req.body;
    
    const translation = await AIService.translateText(text, fromLang, toLang);

    res.json({
      success: true,
      data: {
        original: text,
        translation,
        fromLanguage: fromLang,
        toLanguage: toLang,
        service: AIService.getServiceInfo().provider
      }
    });

  } catch (error) {
    logger.error('Translation test failed', { error });
    res.status(500).json({
      success: false,
      message: 'Translation test failed'
    });
  }
});

// Test language detection
router.post('/test-detection', async (req, res) => {
  try {
    const { text = 'Bonjour, comment allez-vous?' } = req.body;
    
    const detection = await AIService.detectLanguage(text);

    res.json({
      success: true,
      data: {
        text,
        detection,
        service: AIService.getServiceInfo().provider
      }
    });

  } catch (error) {
    logger.error('Language detection test failed', { error });
    res.status(500).json({
      success: false,
      message: 'Language detection test failed'
    });
  }
});

// Test grammar correction
router.post('/test-grammar', async (req, res) => {
  try {
    const { text = 'I are learning Spanish', language = 'en' } = req.body;
    
    const correction = await AIService.correctGrammar(text, language);

    res.json({
      success: true,
      data: {
        original: text,
        correction,
        language,
        service: AIService.getServiceInfo().provider
      }
    });

  } catch (error) {
    logger.error('Grammar correction test failed', { error });
    res.status(500).json({
      success: false,
      message: 'Grammar correction test failed'
    });
  }
});

export default router;