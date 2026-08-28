import { UserOrganization, OrgRole } from '@app-starter/shared';

/**
 * User organization DTO implementing shared UserOrganization interface
 * Note: Dates are Date objects internally but serialize to strings in JSON
 */
export class UserOrganizationDto implements Omit<UserOrganization, 'createdAt' | 'updatedAt'> {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  website: string | null;
  logoUrl: string | null;
  emailReplyTo?: string | null;
  emailSenderName?: string | null;
  createdAt: Date; // Serializes to string in JSON
  updatedAt: Date; // Serializes to string in JSON
  role: OrgRole;
}

/**
 * User organizations response DTO
 * Note: This doesn't directly implement UserOrganizationsResponse because DTOs use Date
 * objects internally, but they serialize to strings matching the shared interface
 */
export class UserOrganizationsResponseDto {
  organizations: UserOrganizationDto[];
  hasOrganizations: boolean;
}
