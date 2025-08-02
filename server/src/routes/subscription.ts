import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { SubscriptionController } from '../controllers/subscription.controller';

const router = Router();

// Get current subscription
router.get(
  '/current',
  authMiddleware,
  SubscriptionController.getCurrentSubscription
);

// Get subscription analytics
router.get(
  '/analytics',
  authMiddleware,
  SubscriptionController.getSubscriptionAnalytics
);

// Get available plans
router.get(
  '/plans',
  SubscriptionController.getAvailablePlans
);

// Create subscription
router.post(
  '/create',
  authMiddleware,
  [
    body('priceId').notEmpty().withMessage('Price ID is required'),
    body('paymentMethodId').optional().isString(),
  ],
  validateRequest,
  SubscriptionController.createSubscription
);

// Update subscription (upgrade/downgrade)
router.put(
  '/update',
  authMiddleware,
  [
    body('priceId').notEmpty().withMessage('New price ID is required'),
  ],
  validateRequest,
  SubscriptionController.updateSubscription
);

// Cancel subscription
router.post(
  '/cancel',
  authMiddleware,
  [
    body('cancelAtPeriodEnd').optional().isBoolean(),
  ],
  validateRequest,
  SubscriptionController.cancelSubscription
);

// Reactivate subscription
router.post(
  '/reactivate',
  authMiddleware,
  SubscriptionController.reactivateSubscription
);

// Get usage stats
router.get(
  '/usage',
  authMiddleware,
  [
    query('date').optional().isISO8601().withMessage('Invalid date format'),
  ],
  validateRequest,
  SubscriptionController.getUsageStats
);

// Check usage limits
router.post(
  '/check-limits',
  authMiddleware,
  [
    body('action').isIn(['message', 'token', 'voice', 'translation']).withMessage('Invalid action type'),
    body('amount').optional().isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  ],
  validateRequest,
  SubscriptionController.checkUsageLimits
);

// Record usage
router.post(
  '/record-usage',
  authMiddleware,
  [
    body('messages').optional().isInt({ min: 0 }),
    body('tokens').optional().isInt({ min: 0 }),
    body('voiceMinutes').optional().isInt({ min: 0 }),
    body('translations').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  SubscriptionController.recordUsage
);

// Get payment methods
router.get(
  '/payment-methods',
  authMiddleware,
  SubscriptionController.getPaymentMethods
);

// Add payment method
router.post(
  '/payment-methods',
  authMiddleware,
  [
    body('paymentMethodId').notEmpty().withMessage('Payment method ID is required'),
    body('setAsDefault').optional().isBoolean(),
  ],
  validateRequest,
  SubscriptionController.addPaymentMethod
);

// Remove payment method
router.delete(
  '/payment-methods/:paymentMethodId',
  authMiddleware,
  [
    param('paymentMethodId').notEmpty().withMessage('Payment method ID is required'),
  ],
  validateRequest,
  SubscriptionController.removePaymentMethod
);

// Set default payment method
router.put(
  '/payment-methods/:paymentMethodId/default',
  authMiddleware,
  [
    param('paymentMethodId').notEmpty().withMessage('Payment method ID is required'),
  ],
  validateRequest,
  SubscriptionController.setDefaultPaymentMethod
);

// Get invoices
router.get(
  '/invoices',
  authMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  ],
  validateRequest,
  SubscriptionController.getInvoices
);

// Get specific invoice
router.get(
  '/invoices/:invoiceId',
  authMiddleware,
  [
    param('invoiceId').notEmpty().withMessage('Invoice ID is required'),
  ],
  validateRequest,
  SubscriptionController.getInvoice
);

// Download invoice
router.get(
  '/invoices/:invoiceId/download',
  authMiddleware,
  [
    param('invoiceId').notEmpty().withMessage('Invoice ID is required'),
  ],
  validateRequest,
  SubscriptionController.downloadInvoice
);

// Request refund
router.post(
  '/refund',
  authMiddleware,
  [
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('amount').optional().isInt({ min: 1 }).withMessage('Amount must be positive'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
  ],
  validateRequest,
  SubscriptionController.requestRefund
);

export default router;