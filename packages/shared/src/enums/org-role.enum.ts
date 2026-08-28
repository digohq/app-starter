/**
 * Organization role enum matching the Prisma schema.
 * Defines a user's permissions within an organization.
 */
export enum OrgRole {
  OWNER = 'OWNER', // Full control incl. billing and deletion; assigned to creator
  ADMIN = 'ADMIN', // Can manage members, settings, and invites
  MEMBER = 'MEMBER', // Default role for invitees
}

/**
 * Type alias for OrgRole values (useful for type checking)
 */
export type OrgRoleType = OrgRole | 'OWNER' | 'ADMIN' | 'MEMBER';
