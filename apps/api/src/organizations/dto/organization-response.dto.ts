import { OrganizationResponse, OrgRole } from '@app-starter/shared';

/**
 * Organization response DTO implementing shared OrganizationResponse interface
 * Note: Dates are Date objects internally but serialize to strings in JSON
 */
export class OrganizationResponseDto implements Omit<
  OrganizationResponse,
  'createdAt' | 'updatedAt'
> {
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
  userRole: OrgRole;
}
