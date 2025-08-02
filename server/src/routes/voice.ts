import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented later
router.post('/transcribe', (req, res) => {
  res.status(501).json({ message: 'Voice transcribe endpoint not implemented yet' });
});

router.post('/synthesize', (req, res) => {
  res.status(501).json({ message: 'Voice synthesize endpoint not implemented yet' });
});

export { router as voiceRoutes };