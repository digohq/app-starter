import { OrgRole } from '@app-starter/shared';

export interface OrganizationUserDto {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
  user: {
    id: string;
    email: string;
    name: string | null;
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
  };
  createdAt: Date;
}

export interface OrganizationUsersResponseDto {
  users: OrganizationUserDto[];
  total: number;
}
