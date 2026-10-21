import { VideoListResponse, VideoResponse, VideoStatus } from '@app-starter/shared';

export class VideoResponseDto implements VideoResponse {
  id: string;
  organizationId: string;
  projectId: string;
  createdById: string;
  name: string;
  url: string;
  workflowId: string | null;
  status: VideoStatus;
  output: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export class VideoListResponseDto implements VideoListResponse {
  items: VideoResponseDto[];
  total: number;
}
