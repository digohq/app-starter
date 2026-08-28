import { OrganizationRoleResponse, OrgRole } from '@app-starter/shared';

/**
 * Organization role response DTO implementing shared OrganizationRoleResponse interface
 */
export class OrganizationRoleResponseDto implements OrganizationRoleResponse {
  hasAccess: boolean;
  role: OrgRole | null;
}
