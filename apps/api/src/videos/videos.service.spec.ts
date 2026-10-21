import { Test, TestingModule } from '@nestjs/testing';
import { VideoStatus } from '@prisma/client';
import { VideosService } from './videos.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { OrkesService } from '../orkes/orkes.service';
import { OrkesRequestFailedException } from '../orkes/exceptions/orkes.exceptions';
import {
  ProjectAccessDeniedException,
  ProjectNotFoundException,
} from '../projects/exceptions/projects.exceptions';
import { VideoNotFoundException } from './exceptions/videos.exceptions';

describe('VideosService', () => {
  let service: VideosService;
  let prisma: any;
  let mockProjects: { findOne: jest.Mock };
  let mockOrkes: { startWorkflow: jest.Mock; getWorkflow: jest.Mock };

  const ORG = 'org-1';
  const PROJECT = 'proj-1';
  const USER = 'user-1';
  const inputDto = { name: 'Launch demo', url: 'https://example.com/demo.mp4' };

  const buildVideo = (overrides: Record<string, unknown> = {}) => ({
    id: 'video-1',
    organizationId: ORG,
    projectId: PROJECT,
    createdById: USER,
    name: 'Launch demo',
    url: 'https://example.com/demo.mp4',
    workflowId: null,
    status: VideoStatus.PENDING,
    output: null,
    errorMessage: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      video: {
        create: jest.fn().mockImplementation(({ data }) => buildVideo(data)),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => buildVideo(data)),
      },
    };
    mockProjects = { findOne: jest.fn().mockResolvedValue({ id: PROJECT }) };
    mockOrkes = {
      startWorkflow: jest.fn().mockResolvedValue('wf-123'),
      getWorkflow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProjectsService, useValue: mockProjects },
        { provide: OrkesService, useValue: mockOrkes },
      ],
    }).compile();

    service = module.get<VideosService>(VideosService);
  });

  describe('create', () => {
    it('starts the workflow with the video URL and stores the workflow id as RUNNING', async () => {
      const actual = await service.create(USER, ORG, PROJECT, inputDto);

      expect(mockOrkes.startWorkflow).toHaveBeenCalledWith({ videoUrl: inputDto.url });
      expect(prisma.video.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: ORG,
          projectId: PROJECT,
          createdById: USER,
        }),
      });
      expect(actual.workflowId).toBe('wf-123');
      expect(actual.status).toBe(VideoStatus.RUNNING);
    });

    it('records the video as FAILED with the reason when Orkes rejects the start', async () => {
      mockOrkes.startWorkflow.mockRejectedValue(
        new OrkesRequestFailedException('start workflow', 403),
      );

      const actual = await service.create(USER, ORG, PROJECT, inputDto);

      expect(actual.status).toBe(VideoStatus.FAILED);
      expect(actual.errorMessage).toBe('Orkes request to start workflow failed with status 403');
    });

    it('rejects a caller without access to the project before saving or starting anything', async () => {
      mockProjects.findOne.mockRejectedValue(new ProjectAccessDeniedException('view'));

      await expect(service.create(USER, ORG, PROJECT, inputDto)).rejects.toBeInstanceOf(
        ProjectAccessDeniedException,
      );
      expect(prisma.video.create).not.toHaveBeenCalled();
      expect(mockOrkes.startWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('lists only videos scoped to the organization and project', async () => {
      prisma.video.findMany.mockResolvedValue([buildVideo({ status: VideoStatus.COMPLETED })]);

      const actual = await service.list(USER, ORG, PROJECT);

      expect(prisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: ORG, projectId: PROJECT } }),
      );
      expect(actual.total).toBe(1);
    });

    it('rejects a project from another organization as not found', async () => {
      mockProjects.findOne.mockRejectedValue(new ProjectNotFoundException(PROJECT));

      await expect(service.list(USER, 'other-org', PROJECT)).rejects.toBeInstanceOf(
        ProjectNotFoundException,
      );
      expect(prisma.video.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws VideoNotFoundException for a video outside the organization and project', async () => {
      prisma.video.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER, ORG, PROJECT, 'video-1')).rejects.toBeInstanceOf(
        VideoNotFoundException,
      );
      expect(prisma.video.findFirst).toHaveBeenCalledWith({
        where: { id: 'video-1', projectId: PROJECT, organizationId: ORG },
      });
    });

    it('stores the output when a running workflow has completed', async () => {
      prisma.video.findFirst.mockResolvedValue(
        buildVideo({ status: VideoStatus.RUNNING, workflowId: 'wf-123' }),
      );
      mockOrkes.getWorkflow.mockResolvedValue({
        workflowId: 'wf-123',
        status: 'COMPLETED',
        output: { summary: 'done' },
        reasonForIncompletion: null,
      });

      const actual = await service.findOne(USER, ORG, PROJECT, 'video-1');

      expect(actual.status).toBe(VideoStatus.COMPLETED);
      expect(actual.output).toEqual({ summary: 'done' });
    });

    it('does not write when the workflow is still running or paused', async () => {
      prisma.video.findFirst.mockResolvedValue(
        buildVideo({ status: VideoStatus.RUNNING, workflowId: 'wf-123' }),
      );
      mockOrkes.getWorkflow.mockResolvedValue({
        workflowId: 'wf-123',
        status: 'PAUSED',
        output: null,
        reasonForIncompletion: null,
      });

      const actual = await service.findOne(USER, ORG, PROJECT, 'video-1');

      expect(actual.status).toBe(VideoStatus.RUNNING);
      expect(prisma.video.update).not.toHaveBeenCalled();
    });

    it('does not call Orkes again once the video has a final status', async () => {
      prisma.video.findFirst.mockResolvedValue(
        buildVideo({ status: VideoStatus.COMPLETED, workflowId: 'wf-123' }),
      );

      await service.findOne(USER, ORG, PROJECT, 'video-1');

      expect(mockOrkes.getWorkflow).not.toHaveBeenCalled();
    });

    it('returns the stored video when Orkes is unreachable during a refresh', async () => {
      prisma.video.findFirst.mockResolvedValue(
        buildVideo({ status: VideoStatus.RUNNING, workflowId: 'wf-123' }),
      );
      mockOrkes.getWorkflow.mockRejectedValue(new OrkesRequestFailedException('get workflow', 503));

      const actual = await service.findOne(USER, ORG, PROJECT, 'video-1');

      expect(actual.status).toBe(VideoStatus.RUNNING);
      expect(prisma.video.update).not.toHaveBeenCalled();
    });
  });
});
