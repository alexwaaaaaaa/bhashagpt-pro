import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented later
router.post('/register', (req, res) => {
  res.status(501).json({ message: 'Register endpoint not implemented yet' });
});

router.post('/login', (req, res) => {
  res.status(501).json({ message: 'Login endpoint not implemented yet' });
});

router.post('/refresh', (req, res) => {
  res.status(501).json({ message: 'Refresh endpoint not implemented yet' });
});

router.post('/logout', (req, res) => {
  res.status(501).json({ message: 'Logout endpoint not implemented yet' });
});

export default router;