import { logger } from '../utils/logger';

export interface InvoiceEmailData {
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: Date;
  invoiceUrl: string;
}

export interface PaymentEmailData {
  amount: number;
  currency: string;
  invoiceNumber: string;
  receiptUrl: string;
}

export interface PaymentFailedEmailData {
  amount: number;
  currency: string;
  invoiceNumber: string;
  retryUrl: string;
}

export class EmailService {
  // Send subscription welcome email
  static async sendSubscriptionWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      // In a real implementation, you would use a service like SendGrid, AWS SES, etc.
      logger.info('Sending subscription welcome email', { email, name });
      
      // Mock email sending
      const emailContent = {
        to: email,
        subject: 'Welcome to BhashaGPT Pro!',
        html: `
          <h1>Welcome to BhashaGPT Pro, ${name}!</h1>
          <p>Thank you for subscribing to BhashaGPT Pro. You now have access to unlimited conversations and advanced features.</p>
          <p>Start learning languages with AI-powered conversations today!</p>
          <a href="https://bhashagpt.com/chat">Start Chatting</a>
        `,
      };

      // Here you would actually send the email
      // await emailProvider.send(emailContent);
      
      logger.info('Subscription welcome email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send subscription welcome email', { error, email, name });
      // Don't throw error to avoid breaking the webhook flow
    }
  }

  // Send subscription canceled email
  static async sendSubscriptionCanceledEmail(email: string, name: string): Promise<void> {
    try {
      logger.info('Sending subscription canceled email', { email, name });
      
      const emailContent = {
        to: email,
        subject: 'Your BhashaGPT Pro subscription has been canceled',
        html: `
          <h1>Subscription Canceled</h1>
          <p>Hi ${name},</p>
          <p>Your BhashaGPT Pro subscription has been canceled. You'll continue to have access to Pro features until the end of your current billing period.</p>
          <p>We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime.</p>
          <a href="https://bhashagpt.com/subscription">Reactivate Subscription</a>
        `,
      };

      logger.info('Subscription canceled email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send subscription canceled email', { error, email, name });
    }
  }

  // Send invoice email
  static async sendInvoiceEmail(email: string, name: string, invoiceData: InvoiceEmailData): Promise<void> {
    try {
      logger.info('Sending invoice email', { email, name, invoiceNumber: invoiceData.invoiceNumber });
      
      const emailContent = {
        to: email,
        subject: `Invoice ${invoiceData.invoiceNumber} from BhashaGPT Pro`,
        html: `
          <h1>New Invoice</h1>
          <p>Hi ${name},</p>
          <p>Your invoice for BhashaGPT Pro is ready.</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
            <p><strong>Amount:</strong> ${invoiceData.currency.toUpperCase()} ${invoiceData.amount}</p>
            <p><strong>Due Date:</strong> ${invoiceData.dueDate.toLocaleDateString()}</p>
          </div>
          <a href="${invoiceData.invoiceUrl}" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none;">View Invoice</a>
        `,
      };

      logger.info('Invoice email sent successfully', { email, invoiceNumber: invoiceData.invoiceNumber });
    } catch (error) {
      logger.error('Failed to send invoice email', { error, email, invoiceData });
    }
  }

  // Send payment success email
  static async sendPaymentSuccessEmail(email: string, name: string, paymentData: PaymentEmailData): Promise<void> {
    try {
      logger.info('Sending payment success email', { email, name, invoiceNumber: paymentData.invoiceNumber });
      
      const emailContent = {
        to: email,
        subject: 'Payment Received - BhashaGPT Pro',
        html: `
          <h1>Payment Received</h1>
          <p>Hi ${name},</p>
          <p>Thank you! We've successfully received your payment.</p>
          <div style="background: #f0f8f0; padding: 20px; margin: 20px 0;">
            <h3>Payment Details</h3>
            <p><strong>Amount:</strong> ${paymentData.currency.toUpperCase()} ${paymentData.amount}</p>
            <p><strong>Invoice:</strong> ${paymentData.invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          ${paymentData.receiptUrl ? `<a href="${paymentData.receiptUrl}">Download Receipt</a>` : ''}
          <p>Your subscription is now active. Enjoy unlimited access to BhashaGPT Pro!</p>
        `,
      };

      logger.info('Payment success email sent successfully', { email, invoiceNumber: paymentData.invoiceNumber });
    } catch (error) {
      logger.error('Failed to send payment success email', { error, email, paymentData });
    }
  }

  // Send payment failed email
  static async sendPaymentFailedEmail(email: string, name: string, paymentData: PaymentFailedEmailData): Promise<void> {
    try {
      logger.info('Sending payment failed email', { email, name, invoiceNumber: paymentData.invoiceNumber });
      
      const emailContent = {
        to: email,
        subject: 'Payment Failed - BhashaGPT Pro',
        html: `
          <h1>Payment Failed</h1>
          <p>Hi ${name},</p>
          <p>We were unable to process your payment for BhashaGPT Pro.</p>
          <div style="background: #fff0f0; padding: 20px; margin: 20px 0;">
            <h3>Payment Details</h3>
            <p><strong>Amount:</strong> ${paymentData.currency.toUpperCase()} ${paymentData.amount}</p>
            <p><strong>Invoice:</strong> ${paymentData.invoiceNumber}</p>
          </div>
          <p>Please update your payment method or try again to continue enjoying Pro features.</p>
          <a href="${paymentData.retryUrl}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none;">Retry Payment</a>
        `,
      };

      logger.info('Payment failed email sent successfully', { email, invoiceNumber: paymentData.invoiceNumber });
    } catch (error) {
      logger.error('Failed to send payment failed email', { error, email, paymentData });
    }
  }

  // Send usage limit warning email
  static async sendUsageLimitWarningEmail(email: string, name: string, usagePercentage: number): Promise<void> {
    try {
      logger.info('Sending usage limit warning email', { email, name, usagePercentage });
      
      const emailContent = {
        to: email,
        subject: 'Usage Limit Warning - BhashaGPT',
        html: `
          <h1>Usage Limit Warning</h1>
          <p>Hi ${name},</p>
          <p>You've used ${usagePercentage}% of your daily message limit.</p>
          <p>Upgrade to Pro for unlimited messages and advanced features!</p>
          <a href="https://bhashagpt.com/subscription" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none;">Upgrade to Pro</a>
        `,
      };

      logger.info('Usage limit warning email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send usage limit warning email', { error, email, name });
    }
  }

  // Send subscription expiry warning email
  static async sendSubscriptionExpiryWarningEmail(email: string, name: string, daysUntilExpiry: number): Promise<void> {
    try {
      logger.info('Sending subscription expiry warning email', { email, name, daysUntilExpiry });
      
      const emailContent = {
        to: email,
        subject: 'Your BhashaGPT Pro subscription expires soon',
        html: `
          <h1>Subscription Expiring Soon</h1>
          <p>Hi ${name},</p>
          <p>Your BhashaGPT Pro subscription will expire in ${daysUntilExpiry} days.</p>
          <p>Renew now to continue enjoying unlimited conversations and advanced features.</p>
          <a href="https://bhashagpt.com/subscription" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none;">Renew Subscription</a>
        `,
      };

      logger.info('Subscription expiry warning email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send subscription expiry warning email', { error, email, name });
    }
  }
}