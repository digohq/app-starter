import type { CreateVideoRequest, VideoListResponse, VideoResponse } from '@app-starter/shared';
import { apiClient } from './api-client';

export type {
  CreateVideoRequest,
  VideoListResponse,
  VideoResponse,
  VideoStatus,
} from '@app-starter/shared';

export class VideosApi {
  async list(organizationId: string, projectId: string): Promise<VideoListResponse> {
    return apiClient.get<VideoListResponse>(this.basePath(organizationId, projectId));
  }

  async get(organizationId: string, projectId: string, videoId: string): Promise<VideoResponse> {
    return apiClient.get<VideoResponse>(`${this.basePath(organizationId, projectId)}/${videoId}`);
  }

  async create(
    organizationId: string,
    projectId: string,
    data: CreateVideoRequest,
  ): Promise<VideoResponse> {
    return apiClient.post<VideoResponse>(this.basePath(organizationId, projectId), data);
  }

  private basePath(organizationId: string, projectId: string): string {
    return `/api/organizations/${organizationId}/projects/${projectId}/videos`;
  }
}

export const videosApi = new VideosApi();
