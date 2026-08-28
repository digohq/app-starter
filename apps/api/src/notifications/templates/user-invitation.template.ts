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

import { emailBrandingStorage } from '../utils/email-branding-storage';

/**
 * User Invitation Email Template
 */
@Injectable()
export class UserInvitationEmailTemplate implements NotificationTemplate {
  readonly variables = {
    organizationName: {
      type: 'string' as const,
      required: true,
      description: 'Name of the organization',
    },
    inviterName: {
      type: 'string' as const,
      required: true,
      description: 'Name of the person sending the invitation',
    },
    invitationUrl: {
      type: 'url' as const,
      required: true,
      description: 'URL to accept the invitation',
    },
    roleName: {
      type: 'string' as const,
      required: true,
      description: 'Role name for the invitation',
    },
  };

  render(channel: NotificationChannel, variables: Record<string, any>): RenderedTemplateContent {
    if (channel !== NotificationChannel.EMAIL) {
      throw new Error('This template only supports EMAIL channel');
    }

    const { organizationName, inviterName, invitationUrl, roleName } = variables;

    // Validate required variables
    if (!organizationName || !inviterName || !invitationUrl || !roleName) {
      throw new Error('Missing required variables for user invitation template');
    }

    const hasEmailBranding = emailBrandingStorage.getStore()?.hasEmailBranding;
    const subject = hasEmailBranding
      ? `You're invited to join ${organizationName}`
      : branding.emailSubjects.userInvitation(organizationName);

    const content = `
      <p>Hello!</p>
      
      <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(organizationName)}</strong> on ${branding.appName} as a <strong>${escapeHtml(roleName)}</strong>.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Invitation Details:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
          <li><strong>Organization:</strong> ${escapeHtml(organizationName)}</li>
          <li><strong>Role:</strong> ${escapeHtml(roleName)}</li>
          <li><strong>Invited by:</strong> ${escapeHtml(inviterName)}</li>
        </ul>
      </div>
      
      <p>Click the button below to accept your invitation and join the organization:</p>
      
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong>Security Notice:</strong> This invitation link is unique to you. Do not share this link with others.
      </div>
      
      <p>If you have any questions about this invitation, please contact ${escapeHtml(inviterName)} or the organization administrators.</p>
      
      <p>${branding.emailBody.userInvitation.welcomeText}</p>
    `;

    const html = emailTemplateComponents.fullTemplate({
      subject,
      title: "You're Invited!",
      content,
      ctaUrl: invitationUrl,
      ctaText: 'Accept Invitation',
    });

    const text = htmlToText(html);

    return {
      subject,
      htmlContent: html,
      textContent: text,
    };
  }
}
