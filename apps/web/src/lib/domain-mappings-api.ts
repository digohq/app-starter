import { apiClient } from './api-client';

export interface DomainMappingResponse {
  id: string;
  organizationId: string;
  domain: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  verificationToken: string;
  verifiedAt: string | null;
  errorMessage: string | null;
  customLogoUrl: string | null;
  customFaviconUrl: string | null;
  logoHeight: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainResolutionResponse {
  organizationId: string;
  organizationSlug: string;
  domain: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  customLogoUrl: string | null;
  customFaviconUrl: string | null;
  logoHeight: number | null;
}

export const domainMappingsApi = {
  async create(organizationId: string, domain: string): Promise<DomainMappingResponse> {
    return apiClient.post<DomainMappingResponse>(
      `/api/organizations/${organizationId}/domain-mappings`,
      { domain },
    );
  },

  async list(
    organizationId: string,
  ): Promise<{ domainMappings: DomainMappingResponse[]; total: number }> {
    return apiClient.get<{ domainMappings: DomainMappingResponse[]; total: number }>(
      `/api/organizations/${organizationId}/domain-mappings`,
    );
  },

  async update(
    organizationId: string,
    mappingId: string,
    data: {
      customLogoUrl?: string | null;
      customFaviconUrl?: string | null;
      logoHeight?: number | null;
    },
  ): Promise<DomainMappingResponse> {
    return apiClient.patch<DomainMappingResponse>(
      `/api/organizations/${organizationId}/domain-mappings/${mappingId}`,
      data,
    );
  },

  async verify(organizationId: string, mappingId: string): Promise<DomainMappingResponse> {
    return apiClient.post<DomainMappingResponse>(
      `/api/organizations/${organizationId}/domain-mappings/${mappingId}/verify`,
      {},
    );
  },

  async delete(
    organizationId: string,
    mappingId: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/organizations/${organizationId}/domain-mappings/${mappingId}`,
    );
  },

  async resolve(domain: string): Promise<DomainResolutionResponse> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';
    const response = await fetch(`${apiUrl}/api/domain-mappings/resolve?domain=${domain}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      // In next 13+ fetch, this provides server-side caching
      next: { revalidate: 300 } as any,
    });

    if (!response.ok) {
      throw new Error('Failed to resolve domain');
    }

    return response.json();
  },
};
