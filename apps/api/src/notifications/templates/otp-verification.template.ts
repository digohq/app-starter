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
 * OTP Verification Template
 */
@Injectable()
export class OtpVerificationEmailTemplate implements NotificationTemplate {
  readonly variables = {
    otp: {
      type: 'string' as const,
      required: true,
      description: 'OTP verification code',
    },
    firstName: {
      type: 'string' as const,
      required: false,
      description: 'User first name (optional)',
    },
  };

  render(channel: NotificationChannel, variables: Record<string, any>): RenderedTemplateContent {
    if (channel !== NotificationChannel.EMAIL) {
      throw new Error('This template only supports EMAIL channel');
    }

    const { otp, firstName } = variables;

    if (!otp) {
      throw new Error('Missing required variables for OTP verification template');
    }

    const subject = branding.emailSubjects.otpVerification;
    const greeting = firstName
      ? branding.emailBody.verification.greeting(escapeHtml(firstName))
      : 'Hello!';

    const content = `
      <p>${greeting}</p>
      
      <p>${branding.emailBody.otpVerification.codePrompt}</p>
      
      <div style="background-color: #fff; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0; border: 2px solid #2563eb;">
        <h2 style="color: #1f2937; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${escapeHtml(otp)}</h2>
      </div>
      
      <p>This code will expire in 10 minutes.</p>
      
      <p>If you didn't request this code, you can safely ignore this email.</p>
    `;

    const html = emailTemplateComponents.fullTemplate({
      subject,
      title: 'Your Verification Code',
      content,
    });

    const text = htmlToText(html);

    return {
      subject,
      htmlContent: html,
      textContent: text,
    };
  }
}
