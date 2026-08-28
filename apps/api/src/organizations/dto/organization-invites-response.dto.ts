import { OrgRole } from '@app-starter/shared';

export interface OrganizationInvitesResponseDto {
  invites: Array<{
    id: string;
    token: string;
    inviteUrl: string;
    email: string | null;
    role: OrgRole;
    expiresAt: string;
    createdAt: string;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
    };
    status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';
  }>;
}
