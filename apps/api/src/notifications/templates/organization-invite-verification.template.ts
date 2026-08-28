import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../types/notification.types';
import {
  NotificationTemplate,
  RenderedTemplateContent,
} from '../interfaces/notification-template.interface';
import { emailTemplateComponents } from './components/email-base.template';
import { htmlToText } from '../utils/html-to-text.util';
import { escapeHtml } from '../utils/escape-html.util';

/**
 * Organization Invite Verification Template
 */
@Injectable()
export class OrganizationInviteVerificationEmailTemplate implements NotificationTemplate {
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
    organizationName: {
      type: 'string' as const,
      required: true,
      description: 'Name of the organization',
    },
  };

  render(channel: NotificationChannel, variables: Record<string, any>): RenderedTemplateContent {
    if (channel !== NotificationChannel.EMAIL) {
      throw new Error('This template only supports EMAIL channel');
    }

    const { firstName, verificationUrl, organizationName } = variables;

    if (!firstName || !verificationUrl || !organizationName) {
      throw new Error('Missing required variables for organization invite verification template');
    }

    const subject = `Verify your email to join ${organizationName}`;

    const content = `
      <p>Hi ${escapeHtml(firstName)},</p>
      
      <p>You've requested to join <strong>${escapeHtml(organizationName)}</strong>. Please verify your email address by clicking the button below:</p>
      
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong>Important:</strong> This verification link will expire in 24 hours.
      </div>
      
      <p>If you didn't request to join this organization, you can safely ignore this email.</p>
    `;

    const html = emailTemplateComponents.fullTemplate({
      subject,
      title: 'Verify Your Email',
      content,
      ctaUrl: verificationUrl,
      ctaText: 'Verify Email',
    });

    const text = htmlToText(html);

    return {
      subject,
      htmlContent: html,
      textContent: text,
    };
  }
}
