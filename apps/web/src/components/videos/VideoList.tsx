'use client';

import { Loader2 } from 'lucide-react';
import { VIDEO_FINAL_STATUSES } from '@app-starter/shared';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { VideoResponse, VideoStatus } from '@/lib/videos-api';

const STATUS_LABEL: Record<VideoStatus, string> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  TIMED_OUT: 'Timed out',
  TERMINATED: 'Terminated',
};

const STATUS_VARIANT: Record<VideoStatus, BadgeProps['variant']> = {
  PENDING: 'secondary',
  RUNNING: 'secondary',
  COMPLETED: 'teal',
  FAILED: 'destructive',
  TIMED_OUT: 'destructive',
  TERMINATED: 'destructive',
};

interface VideoListProps {
  videos: VideoResponse[];
}

export const VideoList = ({ videos }: VideoListProps) => {
  if (videos.length === 0) {
    return <p className="text-sm text-muted-foreground">No videos submitted yet.</p>;
  }

  return (
    // Statuses change while polling; announce them without moving focus.
    <ul className="divide-y" aria-live="polite">
      {videos.map((video) => (
        <VideoListItem key={video.id} video={video} />
      ))}
    </ul>
  );
};

const VideoListItem = ({ video }: { video: VideoResponse }) => {
  const isInProgress = !VIDEO_FINAL_STATUSES.includes(video.status);

  return (
    <li className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{video.name}</p>
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {video.url}
          </a>
        </div>
        <Badge variant={STATUS_VARIANT[video.status]} className="shrink-0 gap-1">
          {isInProgress && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
          {STATUS_LABEL[video.status]}
        </Badge>
      </div>

      {video.errorMessage && <p className="text-sm text-destructive">{video.errorMessage}</p>}

      {video.output && (
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify(video.output, null, 2)}
        </pre>
      )}
    </li>
  );
};
