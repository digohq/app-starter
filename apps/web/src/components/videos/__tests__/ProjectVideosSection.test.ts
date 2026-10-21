import type { VideoResponse, VideoStatus } from '@/lib/videos-api';
import { getVideoPollInterval } from '../ProjectVideosSection';

const buildVideo = (status: VideoStatus): VideoResponse => ({
  id: `video-${status}`,
  organizationId: 'org-1',
  projectId: 'proj-1',
  createdById: 'user-1',
  name: 'Launch demo',
  url: 'https://example.com/demo.mp4',
  workflowId: 'wf-1',
  status,
  output: null,
  errorMessage: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

describe('getVideoPollInterval', () => {
  it('polls while any video is still running', () => {
    const inputData = { items: [buildVideo('COMPLETED'), buildVideo('RUNNING')], total: 2 };

    const actualInterval = getVideoPollInterval(inputData);

    expect(actualInterval).toBe(3000);
  });

  it('stops polling once every video has a final status', () => {
    const inputData = {
      items: [buildVideo('COMPLETED'), buildVideo('FAILED'), buildVideo('TIMED_OUT')],
      total: 3,
    };

    const actualInterval = getVideoPollInterval(inputData);

    expect(actualInterval).toBe(false);
  });

  it('does not poll before the first response has arrived', () => {
    const actualInterval = getVideoPollInterval(undefined);

    expect(actualInterval).toBe(false);
  });
});
