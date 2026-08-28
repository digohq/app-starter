/**
 * Organization-related types
 */

import { OrgRole } from '../enums/org-role.enum';

/**
 * Organization response from API
 * Note: Dates are strings in JSON responses
 */
export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  website: string | null;
  logoUrl: string | null;
  /** Used for session/event cards when the entity has no cover image */
  emailReplyTo?: string | null;
  emailSenderName?: string | null;
  createdAt: string;
  updatedAt: string;
  userRole: OrgRole;
}

/**
 * User organization information (includes role)
 */
export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  website: string | null;
  logoUrl: string | null;
  emailReplyTo?: string | null;
  emailSenderName?: string | null;
  createdAt: string;
  updatedAt: string;
  role: OrgRole;
}

/**
 * Response containing list of user's organizations
 */
export interface UserOrganizationsResponse {
  organizations: UserOrganization[];
  hasOrganizations: boolean;
}

/**
 * Organization role and access information
 */
export interface OrganizationRoleResponse {
  hasAccess: boolean;
  role: OrgRole | null;
}
