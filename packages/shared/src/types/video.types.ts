/**
 * Video types shared by the API and the web app.
 *
 * A video is submitted inside a project and processed by an Orkes workflow;
 * `status` mirrors that workflow run.
 */

export type VideoStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'TERMINATED';

/** Statuses after which the workflow will not change again, so polling can stop. */
export const VIDEO_FINAL_STATUSES: readonly VideoStatus[] = [
  'COMPLETED',
  'FAILED',
  'TIMED_OUT',
  'TERMINATED',
] as const;

export interface CreateVideoRequest {
  name: string;
  url: string;
}

/**
 * Video response from API
 * Note: Dates are strings in JSON responses
 */
export interface VideoResponse {
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

export interface VideoListResponse {
  items: VideoResponse[];
  total: number;
}
