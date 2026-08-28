import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../types/notification.types';
import {
  NotificationTemplate,
  RenderedTemplateContent,
} from '../interfaces/notification-template.interface';
import { emailTemplateComponents } from './components/email-base.template';
import { htmlToText } from '../utils/html-to-text.util';
import { escapeHtml } from '../utils/escape-html.util';
import { branding } from '../../config/branding';

/**
 * Email Verification Template
 */
@Injectable()
export class EmailVerificationEmailTemplate implements NotificationTemplate {
  readonly variables = {
    firstName: {
      type: 'string' as const,
      required: true,
      description: 'User first name',
    },
    verificationUrl: {
      type: 'url' as const,
      required: true,
      description: 'URL to verify email',
    },
  };

  render(channel: NotificationChannel, variables: Record<string, any>): RenderedTemplateContent {
    if (channel !== NotificationChannel.EMAIL) {
      throw new Error('This template only supports EMAIL channel');
    }

    const { firstName, verificationUrl } = variables;

    if (!firstName || !verificationUrl) {
      throw new Error('Missing required variables for email verification template');
    }

    const subject = branding.emailSubjects.verification;

    const content = `
      <p>${branding.emailBody.verification.greeting(escapeHtml(firstName))}</p>
      
      <p>${branding.emailBody.verification.signupThanks} ${branding.emailBody.verification.verifyPrompt}</p>
      
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong>Important:</strong> This verification link will expire in 24 hours for security reasons.
      </div>
      
      <p>${branding.emailBody.verification.ignoreNotice}</p>
    `;

    const html = emailTemplateComponents.fullTemplate({
      subject,
      title: 'Verify Your Email Address',
      content,
      ctaUrl: verificationUrl,
      ctaText: 'Verify Email Address',
    });

    const text = htmlToText(html);

    return {
      subject,
      htmlContent: html,
      textContent: text,
    };
  }
}
