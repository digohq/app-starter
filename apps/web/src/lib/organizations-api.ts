import {
  OrganizationResponse,
  UserOrganization,
  UserOrganizationsResponse,
  OrganizationRoleResponse,
  OrgRole,
} from '@app-starter/shared';
import { apiClient, ApiError } from './api-client';

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  location?: string;
  website?: string;
  logoUrl?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  location?: string;
  website?: string;
  logoUrl?: string;
}

export interface UpdateOrganizationEmailSettingsRequest {
  emailReplyTo?: string | null;
  emailSenderName?: string | null;
}

// Re-export types from shared package
export type {
  OrganizationResponse,
  UserOrganization,
  UserOrganizationsResponse,
  OrganizationRoleResponse,
};
export { OrgRole } from '@app-starter/shared';

export interface CreateInviteRequest {
  email?: string;
  role: OrgRole;
}

export interface InviteResponse {
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

export interface OrganizationInvitesResponse {
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

export interface AcceptInviteRequest {
  token: string;
}

export interface AcceptInviteResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  role: OrgRole;
  message: string;
}

export interface SubmitEmailForInviteRequest {
  name: string;
  email: string;
  confirmEmail: string;
}

export interface SubmitEmailResponse {
  message: string;
  email: string;
}

export interface VerifyInviteRequest {
  inviteToken: string;
  verifyToken: string;
}

export interface VerifyInviteResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  role: OrgRole;
  authToken: string;
  message: string;
  isNewUser: boolean;
}

export class OrganizationsApi {
  async getOrganization(organizationId: string): Promise<OrganizationResponse> {
    return apiClient.get<OrganizationResponse>(`/api/organizations/${organizationId}`);
  }

  async createOrganization(data: CreateOrganizationRequest): Promise<OrganizationResponse> {
    return apiClient.post<OrganizationResponse>('/api/organizations', data);
  }

  async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationRequest,
  ): Promise<OrganizationResponse> {
    return apiClient.put<OrganizationResponse>(`/api/organizations/${organizationId}`, data);
  }

  async deleteOrganization(organizationId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/organizations/${organizationId}`,
    );
  }

  async updateEmailSettings(
    organizationId: string,
    data: UpdateOrganizationEmailSettingsRequest,
  ): Promise<OrganizationResponse> {
    return apiClient.patch<OrganizationResponse>(
      `/api/organizations/${organizationId}/email-settings`,
      data,
    );
  }

  async getUserOrganizations(): Promise<UserOrganizationsResponse> {
    return apiClient.get<UserOrganizationsResponse>('/api/organizations/user');
  }

  async getUserRoleInOrganization(organizationId: string): Promise<OrganizationRoleResponse> {
    return apiClient.get<OrganizationRoleResponse>(`/api/organizations/${organizationId}/role`);
  }

  async createInvite(organizationId: string, data: CreateInviteRequest): Promise<InviteResponse> {
    return apiClient.post<InviteResponse>(`/api/organizations/${organizationId}/invites`, data);
  }

  async getOrganizationInvites(
    organizationId: string,
    opts?: { status?: 'pending' | 'all' },
  ): Promise<OrganizationInvitesResponse> {
    const q = opts?.status === 'pending' ? '?status=pending' : '';
    return apiClient.get<OrganizationInvitesResponse>(
      `/api/organizations/${organizationId}/invites${q}`,
    );
  }

  async resendOrganizationInvite(
    organizationId: string,
    inviteId: string,
  ): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(
      `/api/organizations/${organizationId}/invites/${inviteId}/resend`,
      {},
    );
  }

  async cancelInvite(
    organizationId: string,
    inviteId: string,
  ): Promise<{ id: string; status: 'CANCELLED'; cancelledAt: string }> {
    return apiClient.delete(`/api/organizations/${organizationId}/invites/${inviteId}`);
  }

  async acceptInvite(data: AcceptInviteRequest): Promise<AcceptInviteResponse> {
    return apiClient.post<AcceptInviteResponse>('/api/invites/accept', data);
  }

  async submitEmailForInvite(
    token: string,
    data: SubmitEmailForInviteRequest,
  ): Promise<SubmitEmailResponse> {
    return apiClient.post<SubmitEmailResponse>(`/api/invites/${token}/submit-email`, data);
  }

  async verifyAndAcceptInvite(data: VerifyInviteRequest): Promise<VerifyInviteResponse> {
    return apiClient.post<VerifyInviteResponse>('/api/invites/verify', data);
  }

  async getPublicOrganizationProfile(slug: string): Promise<PublicOrganizationResponse> {
    return apiClient.get<PublicOrganizationResponse>(`/api/organizations/slug/${slug}`);
  }

  async getInviteByToken(token: string): Promise<{
    email: string | null;
    organization: { id: string; name: string; slug: string };
    expiresAt: string;
  }> {
    return apiClient.get(`/api/invites/${token}`);
  }

  async getOrganizationUsers(organizationId: string): Promise<OrganizationUsersResponse> {
    return apiClient.get<OrganizationUsersResponse>(`/api/organizations/${organizationId}/users`);
  }

  async updateOrganizationUserRole(
    organizationId: string,
    userId: string,
    role: 'OWNER' | 'ADMIN' | 'MEMBER',
  ): Promise<OrganizationUser> {
    return apiClient.patch(`/api/organizations/${organizationId}/users/${userId}/role`, { role });
  }

  async removeOrganizationUser(
    organizationId: string,
    userId: string,
  ): Promise<{ message: string; userId: string; organizationId: string }> {
    return apiClient.delete(`/api/organizations/${organizationId}/users/${userId}`);
  }
}

export interface PublicOrganizationResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  location: string | null;
  logoUrl: string | null;
  domainMappings: Array<{
    domain: string;
    verificationStatus: string;
  }>;
}

export interface OrganizationUser {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    email: string;
    name: string | null;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
    createdAt: string;
  };
  createdAt: string;
}

export interface OrganizationUsersResponse {
  users: OrganizationUser[];
  total: number;
}

export const organizationsApi = new OrganizationsApi();
// Re-export ApiError from shared package (already imported from api-client)
export type { ApiError };
