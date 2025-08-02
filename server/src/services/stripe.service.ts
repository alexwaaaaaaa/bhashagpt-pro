import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

const prisma = new PrismaClient();
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
});

export interface CreateCustomerData {
  email: string;
  name?: string;
  userId: string;
}

export interface CreateSubscriptionData {
  customerId: string;
  priceId: string;
  userId: string;
  trialDays?: number;
}

export interface UpdateSubscriptionData {
  subscriptionId: string;
  priceId: string;
}

export class StripeService {
  // Customer Management
  static async createCustomer(data: CreateCustomerData): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email: data.email,
        name: data.name,
        metadata: {
          userId: data.userId,
        },
      });

      logger.info('Stripe customer created', { customerId: customer.id, userId: data.userId });
      return customer;
    } catch (error) {
      logger.error('Failed to create Stripe customer', { error, data });
      throw new Error('Failed to create customer');
    }
  }

  static async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      return customer;
    } catch (error) {
      logger.error('Failed to retrieve Stripe customer', { error, customerId });
      throw new Error('Failed to retrieve customer');
    }
  }

  static async updateCustomer(customerId: string, data: Partial<CreateCustomerData>): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.update(customerId, {
        email: data.email,
        name: data.name,
      });

      logger.info('Stripe customer updated', { customerId });
      return customer;
    } catch (error) {
      logger.error('Failed to update Stripe customer', { error, customerId, data });
      throw new Error('Failed to update customer');
    }
  }

  // Subscription Management
  static async createSubscription(data: CreateSubscriptionData): Promise<Stripe.Subscription> {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: data.customerId,
        items: [{ price: data.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: data.userId,
        },
      };

      if (data.trialDays && data.trialDays > 0) {
        subscriptionData.trial_period_days = data.trialDays;
      }

      const subscription = await stripe.subscriptions.create(subscriptionData);

      // Save subscription to database
      await this.saveSubscriptionToDatabase(subscription, data.userId);

      logger.info('Stripe subscription created', { 
        subscriptionId: subscription.id, 
        userId: data.userId 
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create Stripe subscription', { error, data });
      throw new Error('Failed to create subscription');
    }
  }

  static async updateSubscription(data: UpdateSubscriptionData): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(data.subscriptionId, {
        items: [{
          id: (await stripe.subscriptions.retrieve(data.subscriptionId)).items.data[0].id,
          price: data.priceId,
        }],
        proration_behavior: 'create_prorations',
      });

      // Update subscription in database
      await this.updateSubscriptionInDatabase(subscription);

      logger.info('Stripe subscription updated', { subscriptionId: data.subscriptionId });
      return subscription;
    } catch (error) {
      logger.error('Failed to update Stripe subscription', { error, data });
      throw new Error('Failed to update subscription');
    }
  }

  static async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });

      // Update subscription in database
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          cancelAtPeriodEnd,
          canceledAt: cancelAtPeriodEnd ? new Date() : null,
          updatedAt: new Date(),
        },
      });

      logger.info('Stripe subscription canceled', { subscriptionId, cancelAtPeriodEnd });
      return subscription;
    } catch (error) {
      logger.error('Failed to cancel Stripe subscription', { error, subscriptionId });
      throw new Error('Failed to cancel subscription');
    }
  }

  static async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      // Update subscription in database
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          cancelAtPeriodEnd: false,
          canceledAt: null,
          updatedAt: new Date(),
        },
      });

      logger.info('Stripe subscription reactivated', { subscriptionId });
      return subscription;
    } catch (error) {
      logger.error('Failed to reactivate Stripe subscription', { error, subscriptionId });
      throw new Error('Failed to reactivate subscription');
    }
  }

  // Payment Method Management
  static async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      logger.info('Payment method attached', { paymentMethodId, customerId });
      return paymentMethod;
    } catch (error) {
      logger.error('Failed to attach payment method', { error, paymentMethodId, customerId });
      throw new Error('Failed to attach payment method');
    }
  }

  static async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);

      // Update payment method in database
      await prisma.paymentMethod.update({
        where: { stripePaymentMethodId: paymentMethodId },
        data: { isActive: false, updatedAt: new Date() },
      });

      logger.info('Payment method detached', { paymentMethodId });
      return paymentMethod;
    } catch (error) {
      logger.error('Failed to detach payment method', { error, paymentMethodId });
      throw new Error('Failed to detach payment method');
    }
  }

  static async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Update payment methods in database
      await prisma.paymentMethod.updateMany({
        where: { userId: (await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } }))?.userId },
        data: { isDefault: false },
      });

      await prisma.paymentMethod.update({
        where: { stripePaymentMethodId: paymentMethodId },
        data: { isDefault: true, updatedAt: new Date() },
      });

      logger.info('Default payment method set', { customerId, paymentMethodId });
      return customer;
    } catch (error) {
      logger.error('Failed to set default payment method', { error, customerId, paymentMethodId });
      throw new Error('Failed to set default payment method');
    }
  }

  // Invoice Management
  static async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error) {
      logger.error('Failed to retrieve invoice', { error, invoiceId });
      throw new Error('Failed to retrieve invoice');
    }
  }

  static async sendInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await stripe.invoices.sendInvoice(invoiceId);

      // Update invoice in database
      await prisma.invoice.update({
        where: { stripeInvoiceId: invoiceId },
        data: {
          emailSent: true,
          emailSentAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Invoice sent', { invoiceId });
      return invoice;
    } catch (error) {
      logger.error('Failed to send invoice', { error, invoiceId });
      throw new Error('Failed to send invoice');
    }
  }

  // Refund Management
  static async createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<Stripe.Refund> {
    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: reason as Stripe.RefundCreateParams.Reason,
      };

      if (amount) {
        refundData.amount = amount;
      }

      const refund = await stripe.refunds.create(refundData);

      // Save refund to database
      await this.saveRefundToDatabase(refund);

      logger.info('Refund created', { refundId: refund.id, paymentIntentId, amount });
      return refund;
    } catch (error) {
      logger.error('Failed to create refund', { error, paymentIntentId, amount });
      throw new Error('Failed to create refund');
    }
  }

  // Webhook Helpers
  static constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );
    } catch (error) {
      logger.error('Failed to construct webhook event', { error });
      throw new Error('Invalid webhook signature');
    }
  }

  // Database Helpers
  private static async saveSubscriptionToDatabase(subscription: Stripe.Subscription, userId: string): Promise<void> {
    try {
      const planType = this.getPlanTypeFromPriceId(subscription.items.data[0].price.id);
      
      await prisma.subscription.create({
        data: {
          userId,
          planType,
          status: subscription.status,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          metadata: JSON.stringify(subscription.metadata),
        },
      });

      // Update user subscription tier
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionTier: planType },
      });
    } catch (error) {
      logger.error('Failed to save subscription to database', { error, subscriptionId: subscription.id });
      throw error;
    }
  }

  private static async updateSubscriptionInDatabase(subscription: Stripe.Subscription): Promise<void> {
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
          metadata: JSON.stringify(subscription.metadata),
          updatedAt: new Date(),
        },
      });

      // Update user subscription tier
      await prisma.user.update({
        where: { id: dbSubscription.userId },
        data: { subscriptionTier: planType },
      });
    } catch (error) {
      logger.error('Failed to update subscription in database', { error, subscriptionId: subscription.id });
      throw error;
    }
  }

  private static async saveRefundToDatabase(refund: Stripe.Refund): Promise<void> {
    try {
      // Find the payment record
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentId: refund.payment_intent as string },
      });

      if (payment) {
        await prisma.refund.create({
          data: {
            paymentId: payment.id,
            stripeRefundId: refund.id,
            amount: refund.amount,
            currency: refund.currency,
            reason: refund.reason,
            status: refund.status || 'pending',
            receiptNumber: refund.receipt_number,
            metadata: JSON.stringify(refund.metadata),
          },
        });

        // Update payment record
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            refundedAmount: payment.refundedAmount + refund.amount,
            isRefunded: payment.refundedAmount + refund.amount >= payment.amount,
            updatedAt: new Date(),
          },
        });
      }
    } catch (error) {
      logger.error('Failed to save refund to database', { error, refundId: refund.id });
      throw error;
    }
  }

  private static getPlanTypeFromPriceId(priceId: string): string {
    // Map Stripe price IDs to plan types
    const priceMapping: Record<string, string> = {
      'price_pro_monthly': 'PRO',
      'price_pro_yearly': 'PRO',
      'price_enterprise_monthly': 'ENTERPRISE',
      'price_enterprise_yearly': 'ENTERPRISE',
    };

    return priceMapping[priceId] || 'FREE';
  }
}