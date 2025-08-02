import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { StripeService } from './stripe.service';
import { EmailService } from './email.service';

const prisma = new PrismaClient();

export class WebhookService {
  // Handle Stripe webhook events
  static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    logger.info('Processing Stripe webhook event', { type: event.type, id: event.id });

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.created':
          await this.handleInvoiceCreated(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.finalized':
          await this.handleInvoiceFinalized(event.data.object as Stripe.Invoice);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
          break;

        case 'charge.dispute.created':
          await this.handleChargeDisputeCreated(event.data.object as Stripe.Dispute);
          break;

        default:
          logger.info('Unhandled webhook event type', { type: event.type });
      }
    } catch (error) {
      logger.error('Failed to process webhook event', { error, eventType: event.type, eventId: event.id });
      throw error;
    }
  }

  // Subscription Events
  private static async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata.userId;
      if (!userId) {
        logger.warn('Subscription created without userId in metadata', { subscriptionId: subscription.id });
        return;
      }

      // Subscription should already be created by StripeService, just update status
      await prisma.subscription.updateMany({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          status: subscription.status,
          updatedAt: new Date(),
        },
      });

      // Send welcome email
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await EmailService.sendSubscriptionWelcomeEmail(user.email, user.name || 'User');
      }

      logger.info('Subscription created webhook processed', { subscriptionId: subscription.id, userId });
    } catch (error) {
      logger.error('Failed to handle subscription created', { error, subscriptionId: subscription.id });
      throw error;
    }
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const planType = this.getPlanTypeFromPriceId(subscription.items.data[0].price.id);
      
      const dbSubscription = await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          planType,
          status: subscription.status,
          stripePriceId: subscription.items.data[0].price.id,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
          trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          updatedAt: new Date(),
        },
      });

      // Update user subscription tier
      await prisma.user.update({
        where: { id: dbSubscription.userId },
        data: { subscriptionTier: planType },
      });

      logger.info('Subscription updated webhook processed', { subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Failed to handle subscription updated', { error, subscriptionId: subscription.id });
      throw error;
    }
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const dbSubscription = await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
          expiresAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Downgrade user to free tier
      await prisma.user.update({
        where: { id: dbSubscription.userId },
        data: { subscriptionTier: 'FREE' },
      });

      // Send cancellation email
      const user = await prisma.user.findUnique({ where: { id: dbSubscription.userId } });
      if (user) {
        await EmailService.sendSubscriptionCanceledEmail(user.email, user.name || 'User');
      }

      logger.info('Subscription deleted webhook processed', { subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Failed to handle subscription deleted', { error, subscriptionId: subscription.id });
      throw error;
    }
  }

  // Invoice Events
  private static async handleInvoiceCreated(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: invoice.subscription as string },
      });

      if (!subscription) {
        logger.warn('Invoice created for unknown subscription', { invoiceId: invoice.id });
        return;
      }

      await prisma.invoice.create({
        data: {
          subscriptionId: subscription.id,
          stripeInvoiceId: invoice.id,
          invoiceNumber: invoice.number,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: invoice.status || 'draft',
          description: invoice.description,
          invoiceUrl: invoice.hosted_invoice_url,
          pdfUrl: invoice.invoice_pdf,
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
          metadata: JSON.stringify(invoice.metadata),
        },
      });

      logger.info('Invoice created webhook processed', { invoiceId: invoice.id });
    } catch (error) {
      logger.error('Failed to handle invoice created', { error, invoiceId: invoice.id });
      throw error;
    }
  }

  private static async handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
    try {
      await prisma.invoice.update({
        where: { stripeInvoiceId: invoice.id },
        data: {
          status: invoice.status || 'open',
          invoiceUrl: invoice.hosted_invoice_url,
          pdfUrl: invoice.invoice_pdf,
          updatedAt: new Date(),
        },
      });

      // Send invoice email
      const dbInvoice = await prisma.invoice.findUnique({
        where: { stripeInvoiceId: invoice.id },
        include: { subscription: { include: { user: true } } },
      });

      if (dbInvoice && dbInvoice.subscription.user) {
        await EmailService.sendInvoiceEmail(
          dbInvoice.subscription.user.email,
          dbInvoice.subscription.user.name || 'User',
          {
            invoiceNumber: invoice.number || 'N/A',
            amount: invoice.amount_due / 100,
            currency: invoice.currency.toUpperCase(),
            dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : new Date(),
            invoiceUrl: invoice.hosted_invoice_url || '',
          }
        );
      }

      logger.info('Invoice finalized webhook processed', { invoiceId: invoice.id });
    } catch (error) {
      logger.error('Failed to handle invoice finalized', { error, invoiceId: invoice.id });
      throw error;
    }
  }

  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      await prisma.invoice.update({
        where: { stripeInvoiceId: invoice.id },
        data: {
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create payment record
      if (invoice.payment_intent) {
        const subscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: invoice.subscription as string },
        });

        if (subscription) {
          await prisma.payment.create({
            data: {
              subscriptionId: subscription.id,
              stripePaymentId: invoice.payment_intent as string,
              stripeInvoiceId: invoice.id,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              status: 'succeeded',
              description: invoice.description,
              receiptUrl: invoice.receipt_number ? `https://pay.stripe.com/receipts/${invoice.receipt_number}` : null,
            },
          });
        }
      }

      // Send payment confirmation email
      const dbInvoice = await prisma.invoice.findUnique({
        where: { stripeInvoiceId: invoice.id },
        include: { subscription: { include: { user: true } } },
      });

      if (dbInvoice && dbInvoice.subscription.user) {
        await EmailService.sendPaymentSuccessEmail(
          dbInvoice.subscription.user.email,
          dbInvoice.subscription.user.name || 'User',
          {
            amount: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            invoiceNumber: invoice.number || 'N/A',
            receiptUrl: invoice.receipt_number ? `https://pay.stripe.com/receipts/${invoice.receipt_number}` : '',
          }
        );
      }

      logger.info('Invoice payment succeeded webhook processed', { invoiceId: invoice.id });
    } catch (error) {
      logger.error('Failed to handle invoice payment succeeded', { error, invoiceId: invoice.id });
      throw error;
    }
  }

  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      await prisma.invoice.update({
        where: { stripeInvoiceId: invoice.id },
        data: {
          status: 'payment_failed',
          updatedAt: new Date(),
        },
      });

      // Send payment failed email
      const dbInvoice = await prisma.invoice.findUnique({
        where: { stripeInvoiceId: invoice.id },
        include: { subscription: { include: { user: true } } },
      });

      if (dbInvoice && dbInvoice.subscription.user) {
        await EmailService.sendPaymentFailedEmail(
          dbInvoice.subscription.user.email,
          dbInvoice.subscription.user.name || 'User',
          {
            amount: invoice.amount_due / 100,
            currency: invoice.currency.toUpperCase(),
            invoiceNumber: invoice.number || 'N/A',
            retryUrl: invoice.hosted_invoice_url || '',
          }
        );
      }

      logger.info('Invoice payment failed webhook processed', { invoiceId: invoice.id });
    } catch (error) {
      logger.error('Failed to handle invoice payment failed', { error, invoiceId: invoice.id });
      throw error;
    }
  }

  // Payment Events
  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Update payment record if exists
      await prisma.payment.updateMany({
        where: { stripePaymentId: paymentIntent.id },
        data: {
          status: 'succeeded',
          receiptUrl: (paymentIntent as any).charges?.data[0]?.receipt_url,
          updatedAt: new Date(),
        },
      });

      logger.info('Payment succeeded webhook processed', { paymentIntentId: paymentIntent.id });
    } catch (error) {
      logger.error('Failed to handle payment succeeded', { error, paymentIntentId: paymentIntent.id });
      throw error;
    }
  }

  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Update payment record if exists
      await prisma.payment.updateMany({
        where: { stripePaymentId: paymentIntent.id },
        data: {
          status: 'failed',
          failureReason: paymentIntent.last_payment_error?.message,
          updatedAt: new Date(),
        },
      });

      logger.info('Payment failed webhook processed', { paymentIntentId: paymentIntent.id });
    } catch (error) {
      logger.error('Failed to handle payment failed', { error, paymentIntentId: paymentIntent.id });
      throw error;
    }
  }

  // Payment Method Events
  private static async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    try {
      if (!paymentMethod.customer) return;

      // Find user by customer ID
      const subscription = await prisma.subscription.findFirst({
        where: { stripeCustomerId: paymentMethod.customer as string },
      });

      if (!subscription) return;

      // Save payment method to database
      await prisma.paymentMethod.create({
        data: {
          userId: subscription.userId,
          stripePaymentMethodId: paymentMethod.id,
          type: paymentMethod.type,
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
          expiryMonth: paymentMethod.card?.exp_month,
          expiryYear: paymentMethod.card?.exp_year,
          metadata: JSON.stringify(paymentMethod.metadata),
        },
      });

      logger.info('Payment method attached webhook processed', { paymentMethodId: paymentMethod.id });
    } catch (error) {
      logger.error('Failed to handle payment method attached', { error, paymentMethodId: paymentMethod.id });
      throw error;
    }
  }

  private static async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    try {
      await prisma.paymentMethod.update({
        where: { stripePaymentMethodId: paymentMethod.id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      logger.info('Payment method detached webhook processed', { paymentMethodId: paymentMethod.id });
    } catch (error) {
      logger.error('Failed to handle payment method detached', { error, paymentMethodId: paymentMethod.id });
      throw error;
    }
  }

  // Dispute Events
  private static async handleChargeDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    try {
      // Log dispute for manual review
      logger.warn('Charge dispute created', {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        amount: dispute.amount,
        reason: dispute.reason,
        status: dispute.status,
      });

      // You might want to send an alert email to admin
      // await EmailService.sendDisputeAlertEmail(dispute);

      logger.info('Charge dispute created webhook processed', { disputeId: dispute.id });
    } catch (error) {
      logger.error('Failed to handle charge dispute created', { error, disputeId: dispute.id });
      throw error;
    }
  }

  // Helper methods
  private static getPlanTypeFromPriceId(priceId: string): string {
    // This should match the mapping in StripeService
    const priceMapping: Record<string, string> = {
      'price_pro_monthly': 'PRO',
      'price_pro_yearly': 'PRO',
      'price_enterprise_monthly': 'ENTERPRISE',
      'price_enterprise_yearly': 'ENTERPRISE',
    };

    return priceMapping[priceId] || 'FREE';
  }
}