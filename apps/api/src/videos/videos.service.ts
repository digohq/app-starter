import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Video, VideoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { OrkesService, OrkesWorkflowStatus } from '../orkes/orkes.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { VideoListResponseDto, VideoResponseDto } from './dto/video-response.dto';
import { VideoNotFoundException } from './exceptions/videos.exceptions';

/**
 * Videos submitted within a project, each processed by one Orkes workflow run.
 *
 * Results come back by polling: while a video is RUNNING, every read asks
 * Orkes for the latest state and stores it. Once the run reaches a final
 * status, reads are served from the database and Orkes is not called again.
 */
@Injectable()
export class VideosService {
  private static readonly ORKES_STATUS_MAP: Record<OrkesWorkflowStatus, VideoStatus> = {
    RUNNING: VideoStatus.RUNNING,
    // A paused run will resume, so to the user it is still in progress.
    PAUSED: VideoStatus.RUNNING,
    COMPLETED: VideoStatus.COMPLETED,
    FAILED: VideoStatus.FAILED,
    TIMED_OUT: VideoStatus.TIMED_OUT,
    TERMINATED: VideoStatus.TERMINATED,
  };

  private readonly logger = new Logger(VideosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly orkesService: OrkesService,
  ) {}

  /**
   * Save the video, then start its workflow. The row is written first so a
   * failed start is recorded as FAILED with a reason, rather than lost.
   */
  async create(
    userId: string,
    organizationId: string,
    projectId: string,
    data: CreateVideoDto,
  ): Promise<VideoResponseDto> {
    await this.projectsService.findOne(userId, organizationId, projectId);

    const video = await this.prisma.video.create({
      data: {
        organizationId,
        projectId,
        createdById: userId,
        name: data.name,
        url: data.url,
      },
    });

    try {
      const workflowId = await this.orkesService.startWorkflow({ videoUrl: data.url });
      const started = await this.prisma.video.update({
        where: { id: video.id },
        data: { workflowId, status: VideoStatus.RUNNING },
      });
      return this.toResponse(started);
    } catch (error) {
      this.logger.error(`Could not start workflow for video ${video.id}`, error);
      const failed = await this.prisma.video.update({
        where: { id: video.id },
        data: { status: VideoStatus.FAILED, errorMessage: this.describeError(error) },
      });
      return this.toResponse(failed);
    }
  }

  async list(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<VideoListResponseDto> {
    await this.projectsService.findOne(userId, organizationId, projectId);

    const videos = await this.prisma.video.findMany({
      where: { organizationId, projectId },
      orderBy: { createdAt: 'desc' },
    });
    const refreshed = await Promise.all(videos.map((video) => this.refreshIfRunning(video)));

    return {
      items: refreshed.map((video) => this.toResponse(video)),
      total: refreshed.length,
    };
  }

  async findOne(
    userId: string,
    organizationId: string,
    projectId: string,
    videoId: string,
  ): Promise<VideoResponseDto> {
    await this.projectsService.findOne(userId, organizationId, projectId);

    const video = await this.loadScoped(organizationId, projectId, videoId);

    return this.toResponse(await this.refreshIfRunning(video));
  }

  /**
   * Load a video by id, project, *and* organization so that a valid id from
   * another tenant or project reads as "not found".
   */
  private async loadScoped(
    organizationId: string,
    projectId: string,
    videoId: string,
  ): Promise<Video> {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, projectId, organizationId },
    });

    if (!video) {
      throw new VideoNotFoundException(videoId);
    }

    return video;
  }

  /**
   * Pull the latest state from Orkes for a run still in progress. An Orkes
   * outage returns the stored row instead of failing the read; the next poll
   * tries again.
   */
  private async refreshIfRunning(video: Video): Promise<Video> {
    if (video.status !== VideoStatus.RUNNING || !video.workflowId) {
      return video;
    }

    try {
      const snapshot = await this.orkesService.getWorkflow(video.workflowId);
      const status = VideosService.ORKES_STATUS_MAP[snapshot.status] ?? VideoStatus.RUNNING;

      if (status === VideoStatus.RUNNING) {
        return video;
      }

      return await this.prisma.video.update({
        where: { id: video.id },
        data: {
          status,
          output: (snapshot.output ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          errorMessage: snapshot.reasonForIncompletion,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Could not refresh workflow ${video.workflowId}: ${this.describeError(error)}`,
      );
      return video;
    }
  }

  private describeError(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private toResponse(video: Video): VideoResponseDto {
    return {
      id: video.id,
      organizationId: video.organizationId,
      projectId: video.projectId,
      createdById: video.createdById,
      name: video.name,
      url: video.url,
      workflowId: video.workflowId,
      status: video.status,
      output: (video.output as Record<string, unknown> | null) ?? null,
      errorMessage: video.errorMessage,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
    };
  }
}
