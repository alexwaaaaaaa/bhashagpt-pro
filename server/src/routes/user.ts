import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented later
router.get('/profile', (req, res) => {
  res.status(501).json({ message: 'Get user profile endpoint not implemented yet' });
});

router.put('/profile', (req, res) => {
  res.status(501).json({ message: 'Update user profile endpoint not implemented yet' });
});

export { router as userRoutes };