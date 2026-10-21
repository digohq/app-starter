import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TokenPayload } from '@app-starter/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { VideoListResponseDto, VideoResponseDto } from './dto/video-response.dto';

/**
 * Videos within a project. Nested under the organization and project so that
 * both ids are always present for tenant scoping.
 */
@ApiTags('videos')
@Controller('organizations/:organizationId/projects/:projectId/videos')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a video and start its Orkes workflow' })
  @ApiResponse({
    status: 201,
    description: 'Video saved; status is RUNNING, or FAILED with a reason',
  })
  async create(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Body() data: CreateVideoDto,
  ): Promise<VideoResponseDto> {
    return this.videosService.create(req.user.sub, organizationId, projectId, data);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List videos in a project, refreshing any still running' })
  async list(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
  ): Promise<VideoListResponseDto> {
    return this.videosService.list(req.user.sub, organizationId, projectId);
  }

  @Get(':videoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a video, refreshing its workflow status if still running' })
  async findOne(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('videoId') videoId: string,
  ): Promise<VideoResponseDto> {
    return this.videosService.findOne(req.user.sub, organizationId, projectId, videoId);
  }
}
