'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { VIDEO_FINAL_STATUSES } from '@app-starter/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { videosApi, type VideoListResponse } from '@/lib/videos-api';
import { VideoForm, type VideoFormData } from './VideoForm';
import { VideoList } from './VideoList';

const POLL_INTERVAL_MS = 3000;

/**
 * Poll while any video is still in progress, and stop once every one has a
 * final status. The API refreshes running videos from Orkes on each read.
 */
export const getVideoPollInterval = (data: VideoListResponse | undefined): number | false => {
  const hasVideoInProgress = data?.items.some(
    (video) => !VIDEO_FINAL_STATUSES.includes(video.status),
  );

  return hasVideoInProgress ? POLL_INTERVAL_MS : false;
};

interface ProjectVideosSectionProps {
  organizationId: string;
  projectId: string;
}

export const ProjectVideosSection = ({ organizationId, projectId }: ProjectVideosSectionProps) => {
  const queryClient = useQueryClient();
  const queryKey = ['videos', organizationId, projectId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => videosApi.list(organizationId, projectId),
    refetchInterval: (query) => getVideoPollInterval(query.state.data),
  });

  const handleCreate = async (formData: VideoFormData) => {
    try {
      const video = await videosApi.create(organizationId, projectId, formData);
      queryClient.invalidateQueries({ queryKey });

      if (video.status === 'FAILED') {
        toast.error(video.errorMessage || 'The video was saved, but its workflow did not start.');
        return;
      }

      toast.success('Video submitted');
    } catch (error) {
      toast.error((error as { message?: string }).message || 'Could not submit the video.');
      throw error;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Videos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <VideoForm onSubmit={handleCreate} />

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2
              className="h-5 w-5 animate-spin text-muted-foreground"
              aria-label="Loading videos"
            />
          </div>
        ) : (
          <VideoList videos={data?.items ?? []} />
        )}
      </CardContent>
    </Card>
  );
};
