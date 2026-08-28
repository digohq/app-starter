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
 * Invitation Accepted Template
 */
@Injectable()
export class InvitationAcceptedEmailTemplate implements NotificationTemplate {
  readonly variables = {
    organizationName: {
      type: 'string' as const,
      required: true,
      description: 'Name of the organization',
    },
    roleName: {
      type: 'string' as const,
      required: true,
      description: 'Role name',
    },
    userName: {
      type: 'string' as const,
      required: true,
      description: 'Name of the user who accepted',
    },
  };

  render(channel: NotificationChannel, variables: Record<string, any>): RenderedTemplateContent {
    if (channel !== NotificationChannel.EMAIL) {
      throw new Error('This template only supports EMAIL channel');
    }

    const { organizationName, roleName, userName } = variables;

    if (!organizationName || !roleName || !userName) {
      throw new Error('Missing required variables for invitation accepted template');
    }

    const subject = branding.emailSubjects.invitationAccepted(organizationName);

    const content = `
      <p>${branding.emailBody.invitationAccepted.welcomeText(
        escapeHtml(organizationName),
        escapeHtml(roleName),
      )}</p>
      
      <p>You can now start using ${branding.appName} to manage your events and sessions.</p>
      
      <p>Welcome aboard!</p>
    `;

    const html = emailTemplateComponents.fullTemplate({
      subject,
      title: 'Welcome!',
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
