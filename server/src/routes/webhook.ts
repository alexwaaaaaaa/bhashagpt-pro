import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { StripeService } from '../services/stripe.service';
import { WebhookService } from '../services/webhook.service';
import { logger } from '../utils/logger';

const router = Router();

// Stripe webhook endpoint
router.post('/stripe', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    logger.warn('Missing Stripe signature header');
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Missing signature header',
    });
    return;
  }

  try {
    // Construct the event from the raw body and signature
    const event = StripeService.constructWebhookEvent(req.body, signature);

    logger.info('Received Stripe webhook', {
      eventId: event.id,
      eventType: event.type,
    });

    // Process the webhook event
    await WebhookService.handleWebhookEvent(event);

    // Return a response to acknowledge receipt of the event
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    logger.error('Webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      signature,
    });

    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Webhook signature verification failed',
    });
  }
});

// Health check for webhook endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Webhook endpoint is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;