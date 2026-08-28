import { OrgRole } from '@app-starter/shared';

export interface InviteResponseDto {
  id: string;
  organizationId: string;
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
}
