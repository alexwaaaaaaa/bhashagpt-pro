# Stripe Payment System Setup Guide

This guide explains how to set up and configure the Stripe payment system for BhashaGPT Pro subscription management.

## Features Implemented

### ✅ Core Payment Features
- **Customer Management**: Automatic Stripe customer creation on user signup
- **Subscription Management**: Create, update, cancel, and reactivate subscriptions
- **Payment Method Management**: Add, remove, and set default payment methods
- **Invoice Generation**: Automatic invoice creation and email notifications
- **Refund Handling**: Process refunds with proper tracking
- **Usage Tracking**: Monitor API usage against subscription limits

### ✅ Subscription Tiers
- **Free Tier**: 50 messages/day, basic features
- **Pro Tier**: Unlimited messages, advanced features
- **Enterprise Tier**: Custom limits and features

### ✅ Webhook Handling
- Payment success/failure notifications
- Subscription lifecycle events
- Invoice status updates
- Payment method changes
- Dispute notifications

### ✅ Security & Validation
- Webhook signature verification
- Input validation and sanitization
- Rate limiting and usage enforcement
- Secure error handling

## Setup Instructions

### 1. Stripe Account Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Set up webhook endpoints
4. Create product and price objects

### 2. Environment Configuration

Add these variables to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key-here"
STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key-here"
STRIPE_WEBHOOK_SECRET="whsec_your-stripe-webhook-secret-here"
STRIPE_PRO_PRICE_ID="price_pro_monthly"
STRIPE_PRO_YEARLY_PRICE_ID="price_pro_yearly"
STRIPE_ENTERPRISE_PRICE_ID="price_enterprise_monthly"
```

### 3. Database Migration

Run the database migration to create payment-related tables:

```bash
npm run db:push
```

### 4. Webhook Configuration

Set up webhooks in your Stripe Dashboard to point to:
```
https://yourdomain.com/webhooks/stripe
```

Enable these webhook events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.created`
- `invoice.finalized`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_method.attached`
- `payment_method.detached`
- `charge.dispute.created`

### 5. Create Stripe Products

Create products and prices in your Stripe Dashboard:

```javascript
// Pro Monthly
{
  "name": "BhashaGPT Pro",
  "description": "Unlimited AI conversations and advanced features",
  "price": 1999, // $19.99 in cents
  "currency": "usd",
  "interval": "month"
}

// Pro Yearly
{
  "name": "BhashaGPT Pro (Yearly)",
  "description": "Unlimited AI conversations and advanced features - 2 months free",
  "price": 19999, // $199.99 in cents
  "currency": "usd",
  "interval": "year"
}
```

## API Endpoints

### Subscription Management

#### Get Current Subscription
```http
GET /api/v1/subscription/current
Authorization: Bearer <token>
```

#### Create Subscription
```http
POST /api/v1/subscription/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "priceId": "price_pro_monthly",
  "paymentMethodId": "pm_1234567890" // optional
}
```

#### Update Subscription
```http
PUT /api/v1/subscription/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "priceId": "price_pro_yearly"
}
```

#### Cancel Subscription
```http
POST /api/v1/subscription/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "cancelAtPeriodEnd": true
}
```

### Usage Tracking

#### Check Usage Limits
```http
POST /api/v1/subscription/check-limits
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "message",
  "amount": 1
}
```

#### Record Usage
```http
POST /api/v1/subscription/record-usage
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": 1,
  "tokens": 150
}
```

### Payment Methods

#### Get Payment Methods
```http
GET /api/v1/subscription/payment-methods
Authorization: Bearer <token>
```

#### Add Payment Method
```http
POST /api/v1/subscription/payment-methods
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethodId": "pm_1234567890",
  "setAsDefault": true
}
```

### Invoices

#### Get Invoices
```http
GET /api/v1/subscription/invoices?limit=10&offset=0
Authorization: Bearer <token>
```

#### Download Invoice
```http
GET /api/v1/subscription/invoices/:invoiceId/download
Authorization: Bearer <token>
```

## Usage Tracking Middleware

The system includes middleware to automatically track and enforce usage limits:

```typescript
import { trackMessageUsage, trackTokenUsage } from '@/middleware/usage-tracking.middleware';

// Track message usage
router.post('/chat/completions', 
  authMiddleware,
  trackMessageUsage(1), // Track 1 message
  chatController.completion
);

// Track token usage
router.post('/chat/stream', 
  authMiddleware,
  trackTokenUsage(100), // Track estimated tokens
  chatController.stream
);
```

## Subscription Limits

### Free Tier
- 50 messages per day
- 100,000 tokens per month
- 10 minutes of voice per month
- 100 translations per month

### Pro Tier
- Unlimited messages
- Unlimited tokens
- Unlimited voice
- Unlimited translations

### Enterprise Tier
- Custom limits
- Priority support
- Advanced analytics

## Automated Tasks

The system includes automated cron jobs for:

### Daily Tasks
- Handle expired subscriptions
- Send expiry warnings (7, 3, 1 days before)
- Retry failed payments

### Weekly Tasks
- Clean up old usage records (90+ days)

### Monthly Tasks
- Generate usage reports
- Send usage analytics

To set up cron jobs:

```bash
npm run cron:setup
```

## Error Handling

The system includes comprehensive error handling:

- **Payment Failures**: Automatic retry logic and user notifications
- **Webhook Failures**: Proper error logging and alerting
- **Usage Limit Exceeded**: Graceful degradation with upgrade prompts
- **Invalid Requests**: Detailed validation error messages

## Security Considerations

- All webhook payloads are verified using Stripe signatures
- Payment data is never stored locally (only references to Stripe objects)
- Usage tracking includes rate limiting to prevent abuse
- All API endpoints require proper authentication
- Sensitive operations are logged for audit purposes

## Testing

### Test Mode
Use Stripe test keys for development:
- Test card: `4242424242424242`
- Test webhook events can be triggered from Stripe CLI

### Webhook Testing
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:5000/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

## Monitoring

Monitor these metrics:
- Subscription conversion rates
- Payment failure rates
- Usage patterns by tier
- Churn rates
- Revenue metrics

## Support

For issues with the payment system:
1. Check Stripe Dashboard for payment details
2. Review application logs for errors
3. Verify webhook delivery in Stripe Dashboard
4. Test with Stripe CLI for development issues

## Production Deployment

Before going live:
1. Switch to live Stripe keys
2. Update webhook endpoints to production URLs
3. Set up proper monitoring and alerting
4. Configure email service for notifications
5. Test all payment flows thoroughly
6. Set up backup and recovery procedures