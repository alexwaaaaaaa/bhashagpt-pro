import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from '../services/subscription.service';
import { StripeService } from '../services/stripe.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types/auth';

const prisma = new PrismaClient();

export class SubscriptionController {
    // Get current subscription
    static async getCurrentSubscription(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const subscription = await SubscriptionService.getUserSubscription(userId);

            res.status(StatusCodes.OK).json({
                success: true,
                data: subscription,
            });
        } catch (error) {
            logger.error('Failed to get current subscription', { error, userId: req.user?.userId });
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve subscription',
            });
        }
    }

    // Get subscription analytics
    static async getSubscriptionAnalytics(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const analytics = await SubscriptionService.getSubscriptionAnalytics(userId);

            res.status(StatusCodes.OK).json({
                success: true,
                data: analytics,
            });
        } catch (error) {
            logger.error('Failed to get subscription analytics', { error, userId: req.user?.userId });
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve analytics',
            });
        }
    }

    // Get available plans
    static async getAvailablePlans(req: Request, res: Response): Promise<void> {
        try {
            const plans = [
                {
                    id: 'free',
                    name: 'Free',
                    price: 0,
                    currency: 'usd',
                    interval: 'month',
                    features: [
                        '50 messages per day',
                        'Basic language support',
                        'Standard response time',
                    ],
                    limits: {
                        dailyMessages: 50,
                        monthlyTokens: 100000,
                        voiceMinutes: 10,
                        translations: 100,
                    },
                },
                {
                    id: 'pro',
                    name: 'Pro',
                    price: 19.99,
                    currency: 'usd',
                    interval: 'month',
                    priceId: 'price_pro_monthly',
                    features: [
                        'Unlimited messages',
                        'All languages supported',
                        'Priority response time',
                        'Voice conversations',
                        'Advanced AI models',
                    ],
                    limits: {
                        dailyMessages: -1,
                        monthlyTokens: -1,
                        voiceMinutes: -1,
                        translations: -1,
                    },
                },
                {
                    id: 'pro_yearly',
                    name: 'Pro (Yearly)',
                    price: 199.99,
                    currency: 'usd',
                    interval: 'year',
                    priceId: 'price_pro_yearly',
                    features: [
                        'Unlimited messages',
                        'All languages supported',
                        'Priority response time',
                        'Voice conversations',
                        'Advanced AI models',
                        '2 months free',
                    ],
                    limits: {
                        dailyMessages: -1,
                        monthlyTokens: -1,
                        voiceMinutes: -1,
                        translations: -1,
                    },
                },
            ];

            res.status(StatusCodes.OK).json({
                success: true,
                data: plans,
            });
        } catch (error) {
            logger.error('Failed to get available plans', { error });
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve plans',
            });
        }
    }

    // Create subscription
    static async createSubscription(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { priceId, paymentMethodId } = req.body;

            const subscription = await SubscriptionService.createSubscription(
                userId,
                priceId,
                paymentMethodId
            );

            res.status(StatusCodes.CREATED).json({
                success: true,
                data: {
                    subscriptionId: subscription.id,
                    clientSecret: (subscription as any).latest_invoice?.payment_intent?.client_secret || null,
                    status: subscription.status,
                },
            });
        } catch (error) {
            logger.error('Failed to create subscription', { error, userId: req.user?.userId });
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create subscription',
            });
        }
    }

    // Update subscription
    static async updateSubscription(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { priceId } = req.body;

            const subscription = await SubscriptionService.changeSubscription(userId, priceId);

            res.status(StatusCodes.OK).json({
                success: true,
                data: subscription,
            });
        } catch (error) {
            logger.error('Failed to update subscription', { error, userId: req.user?.userId });
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update subscription',
            });
        }
    }

    // Cancel subscription
    static async cancelSubscription(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { cancelAtPeriodEnd = true } = req.body;

            const subscription = await SubscriptionService.cancelSubscription(userId, cancelAtPeriodEnd);

            res.status(StatusCodes.OK).json({
                success: true,
                data: subscription,
            });
        } catch (error) {
            logger.error('Failed to cancel subscription', { error, userId: req.user?.userId });
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to cancel subscription',
            });
        }
    }

    // Reactivate subscription
    static async reactivateSubscription(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;

            const subscription = await SubscriptionService.reactivateSubscription(userId);

            res.status(StatusCodes.OK).json({
                success: true,
                data: subscription,
            });
        } catch (error) {
            logger.error('Failed to reactivate subscription', { error, userId: req.user?.userId });
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to reactivate subscription',
            });
        }
    }

    // Get usage stats
    static async getUsageStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { date } = req.query;

            const targetDate = date ? new Date(date as string) : undefined;
            const usage = await SubscriptionService.getUserUsage(userId, targetDate);

            res.status(StatusCodes.OK).json({
                success: true,
                data: usage,
            });
        } catch (error) {
            logger.error('Failed to get usage stats', { error, userId: req.user?.userId });
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve usage stats',
            });
        }
    }

    // Check usage limits
    static async checkUsageLimits(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { action, amount = 1 } = req.body;

            const result = await SubscriptionService.canPerformAction(userId, action, amount);

            res.status(StatusCodes.OK).json({
                success: true,
                data: result,
            });
        } catch (error) {
            logger.error('Failed to check usage limits', { error, userId: req.user?.userId });
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to check usage limits',
            });
        }
    }

    // Record usage
    static async recordUsage(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { messages, tokens, voiceMinutes, translations } = req.body;

            await SubscriptionService.recordUsage(userId, {
                messages,
                tokens,
                voiceMinutes,
                translations,
            });

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Usage recorded successfully',
            });
        } catch (error) {
            logger.error('Failed to record usage', { error, userId: req.user?.userId });
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to record usage',
            });
        }
    }

    // Get payment methods
    static async getPaymentMethods(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;

            const paymentMethods = await prisma.paymentMethod.findMany({
                where: {
                    userId,
                    isActive: true,
                },
                orderBy: [
                    { isDefault: 'desc' },
                    { createdAt: 'desc' },
                ],
            });

            res.status(StatusCodes.OK).json({
                success: true,
                data: paymentMethods,
            });
        } catch (error) {
            logger.error('Failed to get payment methods', { error, userId: req.user?.userId });
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve payment methods',
            });
        }
    }

    // Add payment method
    static async addPaymentMethod(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { paymentMethodId, setAsDefault = false } = req.body;

            // Get user's Stripe customer ID
            const subscription = await prisma.subscription.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });

            if (!subscription?.stripeCustomerId) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'No customer found. Please create a subscription first.',
                });
                return;
            }

            // Attach payment method to customer
            await StripeService.attachPaymentMethod(paymentMethodId, subscription.stripeCustomerId);

            // Set as default if requested
            if (setAsDefault) {
                await StripeService.setDefaultPaymentMethod(subscription.stripeCustomerId, paymentMethodId);
            }

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Payment method added successfully',
            });
        } catch (error) {
            logger.error('Failed to add payment method', { error, userId: req.user?.userId });
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to add payment method',
            });
        }
    }

    // Remove payment method
    static async removePaymentMethod(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { paymentMethodId } = req.params;

            // Verify payment method belongs to user
            const paymentMethod = await prisma.paymentMethod.findFirst({
                where: {
                    userId,
                    stripePaymentMethodId: paymentMethodId,
                    isActive: true,
                },
            });

            if (!paymentMethod) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Payment method not found',
                });
                return;
            }

            // Detach from Stripe
            await StripeService.detachPaymentMethod(paymentMethodId);

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Payment method removed successfully',
            });
        } catch (error) {
            logger.error('Failed to remove payment method', { error, userId: req.user?.userId });
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to remove payment method',
            });
        }
    }

    // Set default payment method
    static async setDefaultPaymentMethod(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { paymentMethodId } = req.params;

            // Get user's Stripe customer ID
            const subscription = await prisma.subscription.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });

            if (!subscription?.stripeCustomerId) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'No customer found',
                });
                return;
            }

            await StripeService.setDefaultPaymentMethod(subscription.stripeCustomerId, paymentMethodId);

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Default payment method updated successfully',
            });
        } catch (error) {
            logger.error('Failed to set default payment method', { error, userId: req.user?.userId });
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to set default payment method',
            });
        }
    }

    // Get invoices
    static async getInvoices(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const limit = parseInt(req.query.limit as string) || 10;
            const offset = parseInt(req.query.offset as string) || 0;

            const invoices = await prisma.invoice.findMany({
                where: {
                    subscription: { userId },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    subscription: {
                        select: { planType: true },
                    },
                },
            });

            const total = await prisma.invoice.count({
                where: {
                    subscription: { userId },
                },
            });

            res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    invoices,
                    pagination: {
                        total,
                        limit,
                        offset,
                        hasMore: offset + limit < total,
                    },
                },
            });
        } catch (error) {
            logger.error('Failed to get invoices', { error, userId: req.user?.userId });
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve invoices',
            });
        }
    }

    // Get specific invoice
    static async getInvoice(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { invoiceId } = req.params;

            const invoice = await prisma.invoice.findFirst({
                where: {
                    id: invoiceId,
                    subscription: { userId },
                },
                include: {
                    subscription: {
                        select: { planType: true, user: { select: { name: true, email: true } } },
                    },
                },
            });

            if (!invoice) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Invoice not found',
                });
                return;
            }

            res.status(StatusCodes.OK).json({
                success: true,
                data: invoice,
            });
        } catch (error) {
            logger.error('Failed to get invoice', { error, userId: req.user?.userId });
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve invoice',
            });
        }
    }

    // Download invoice
    static async downloadInvoice(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { invoiceId } = req.params;

            const invoice = await prisma.invoice.findFirst({
                where: {
                    id: invoiceId,
                    subscription: { userId },
                },
            });

            if (!invoice) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Invoice not found',
                });
                return;
            }

            if (!invoice.pdfUrl) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Invoice PDF not available',
                });
                return;
            }

            res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    downloadUrl: invoice.pdfUrl,
                },
            });
        } catch (error) {
            logger.error('Failed to download invoice', { error, userId: req.user?.userId });
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to download invoice',
            });
        }
    }

    // Request refund
    static async requestRefund(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { paymentId, amount, reason } = req.body;

            // Verify payment belongs to user
            const payment = await prisma.payment.findFirst({
                where: {
                    id: paymentId,
                    subscription: { userId },
                },
            });

            if (!payment) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Payment not found',
                });
                return;
            }

            if (payment.isRefunded) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Payment already refunded',
                });
                return;
            }

            const refund = await StripeService.createRefund(
                payment.stripePaymentId,
                amount,
                reason
            );

            res.status(StatusCodes.OK).json({
                success: true,
                data: refund,
            });
        } catch (error) {
            logger.error('Failed to request refund', { error, userId: req.user?.userId });
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to process refund',
            });
        }
    }
}