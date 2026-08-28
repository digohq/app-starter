import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../types/notification.types';
import { NotificationChannelProvider } from '../interfaces/notification-channel-provider.interface';
import {
  NotificationContent,
  NotificationOptions,
  NotificationResult,
} from '../types/notification.types';
import { EmailService } from '../../email/email.service';
import { unescapeHtml } from '../utils/escape-html.util';

/**
 * Email channel provider that wraps the existing EmailService
 * This allows the notifications system to send emails through the existing email infrastructure
 */
@Injectable()
export class EmailChannelProvider implements NotificationChannelProvider {
  private readonly logger = new Logger(EmailChannelProvider.name);
  readonly channel = NotificationChannel.EMAIL;

  constructor(private readonly emailService: EmailService) {}

  /**
   * Send notification through email channel
   */
  async send(
    recipient: string, // Email address
    content: NotificationContent,
    options?: NotificationOptions,
  ): Promise<NotificationResult> {
    try {
      if (!content.subject) {
        throw new Error('Email subject is required');
      }

      if (!content.htmlContent && !content.textContent) {
        throw new Error('Email content (HTML or text) is required');
      }

      // Use the existing EmailService to send the email (with optional replyTo and fromName)
      const replyTo = options?.replyTo;
      const fromName = options?.fromName;
      await this.emailService.sendEmail(
        recipient,
        unescapeHtml(content.subject),
        content.htmlContent || '',
        content.textContent || '',
        { replyTo, fromName },
      );

      // Generate a simple message ID (in production, this would come from the email provider)
      const messageId = `email-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipient}: ${error.message}`, error.stack);
      return {
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: error.message,
        },
      };
    }
  }

  /**
   * Check health/status of email provider
   */
  async checkHealth(): Promise<{ status: string; message: string }> {
    try {
      // EmailService doesn't have a health check method yet
      // For now, return healthy status
      // In the future, we could check the email provider's health
      return {
        status: 'healthy',
        message: 'Email channel provider is operational',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Email channel provider health check failed: ${error.message}`,
      };
    }
  }
}
