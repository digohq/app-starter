import {
  NotificationTemplate,
  RenderedTemplateContent,
} from '../../interfaces/notification-template.interface';
import { NotificationChannel } from '../../types/notification.types';

export class OrganizationInvitationInAppTemplate implements NotificationTemplate {
  readonly variables = {
    inviterName: { type: 'string', required: true } as const,
    organizationName: { type: 'string', required: true } as const,
    invitationId: { type: 'string', required: true } as const,
    organizationId: { type: 'string', required: true } as const,
  };

  render(channel: NotificationChannel, variables: Record<string, any>): RenderedTemplateContent {
    if (channel !== NotificationChannel.IN_APP) {
      throw new Error(`Channel ${channel} not supported by OrganizationInvitationInAppTemplate`);
    }

    return {
      title: `Organization Invitation from ${variables.inviterName}`,
      body: `You've been invited to join the organization "${variables.organizationName}"`,
      textContent: `You've been invited to join the organization "${variables.organizationName}"`,
      data: {
        invitationType: 'organization',
        invitationId: variables.invitationId,
        organizationId: variables.organizationId,
        inviterName: variables.inviterName,
        entityName: variables.organizationName,
        actionUrl: `/invites/accept?token=${variables.invitationId}`,
      },
    };
  }
}
