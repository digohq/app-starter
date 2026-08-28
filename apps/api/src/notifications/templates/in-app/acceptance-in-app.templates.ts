import {
  NotificationTemplate,
  RenderedTemplateContent,
} from '../../interfaces/notification-template.interface';
import { NotificationChannel } from '../../types/notification.types';

export class OrganizationInvitationAcceptedInAppTemplate implements NotificationTemplate {
  readonly variables = {
    inviteeName: { type: 'string', required: true } as const,
    organizationName: { type: 'string', required: true } as const,
    organizationId: { type: 'string', required: true } as const,
  };

  render(channel: NotificationChannel, variables: Record<string, any>): RenderedTemplateContent {
    if (channel !== NotificationChannel.IN_APP) {
      throw new Error(`Channel ${channel} not supported`);
    }

    return {
      title: `Invitation Accepted by ${variables.inviteeName}`,
      body: `${variables.inviteeName} has accepted your invitation to join "${variables.organizationName}"`,
      textContent: `${variables.inviteeName} has accepted your invitation to join "${variables.organizationName}"`,
      data: {
        invitationType: 'organization',
        organizationId: variables.organizationId,
        inviteeName: variables.inviteeName,
        entityName: variables.organizationName,
        actionUrl: `/organizations/${variables.organizationId}/users`,
      },
    };
  }
}
