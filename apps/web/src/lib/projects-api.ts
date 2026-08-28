import { apiClient } from './api-client';

export type ProjectVisibility = 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';

export interface Project {
  id: string;
  organizationId: string;
  createdById: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: ProjectVisibility;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  visibility?: ProjectVisibility;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  visibility?: ProjectVisibility;
  archived?: boolean;
}

export class ProjectsApi {
  async list(organizationId: string, includeArchived = false): Promise<ProjectListResponse> {
    const query = includeArchived ? '?includeArchived=true' : '';
    return apiClient.get<ProjectListResponse>(
      `/api/organizations/${organizationId}/projects${query}`,
    );
  }

  async get(organizationId: string, projectId: string): Promise<Project> {
    return apiClient.get<Project>(`/api/organizations/${organizationId}/projects/${projectId}`);
  }

  async create(organizationId: string, data: CreateProjectRequest): Promise<Project> {
    return apiClient.post<Project>(`/api/organizations/${organizationId}/projects`, data);
  }

  async update(
    organizationId: string,
    projectId: string,
    data: UpdateProjectRequest,
  ): Promise<Project> {
    return apiClient.patch<Project>(
      `/api/organizations/${organizationId}/projects/${projectId}`,
      data,
    );
  }

  async remove(organizationId: string, projectId: string): Promise<void> {
    return apiClient.delete(`/api/organizations/${organizationId}/projects/${projectId}`);
  }
}

export const projectsApi = new ProjectsApi();
