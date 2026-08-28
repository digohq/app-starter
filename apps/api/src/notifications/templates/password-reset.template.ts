import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../types/notification.types';
import {
  NotificationTemplate,
  RenderedTemplateContent,
} from '../interfaces/notification-template.interface';
import { emailTemplateComponents } from './components/email-base.template';
import { htmlToText } from '../utils/html-to-text.util';
import { branding } from '../../config/branding';

/**
 * Password Reset Template
 */
@Injectable()
export class PasswordResetEmailTemplate implements NotificationTemplate {
  readonly variables = {
    resetUrl: {
      type: 'url' as const,
      required: true,
      description: 'URL to reset password',
    },
  };

  render(channel: NotificationChannel, variables: Record<string, any>): RenderedTemplateContent {
    if (channel !== NotificationChannel.EMAIL) {
      throw new Error('This template only supports EMAIL channel');
    }

    const { resetUrl } = variables;

    if (!resetUrl) {
      throw new Error('Missing required variables for password reset template');
    }

    const subject = branding.emailSubjects.passwordReset;

    const content = `
      <p>${branding.emailBody.passwordReset.resetPrompt}</p>
      
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong>Security Notice:</strong> This password reset link will expire in 1 hour for security reasons.
      </div>
      
      <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
    `;

    const html = emailTemplateComponents.fullTemplate({
      subject,
      title: 'Reset Your Password',
      content,
      ctaUrl: resetUrl,
      ctaText: 'Reset Password',
    });

    const text = htmlToText(html);

    return {
      subject,
      htmlContent: html,
      textContent: text,
    };
  }
}
