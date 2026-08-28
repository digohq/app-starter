import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TokenPayload } from '@app-starter/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectListResponseDto, ProjectResponseDto } from './dto/project-response.dto';

/**
 * Organization-scoped project routes.
 *
 * The organization id sits in the path rather than the body so that tenant
 * scoping is visible at the route level and cannot be omitted by a caller.
 */
@ApiTags('projects')
@Controller('organizations/:organizationId/projects')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a project in an organization' })
  @ApiResponse({ status: 201, description: 'Project created' })
  async create(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Body() data: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(req.user.sub, organizationId, data);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List projects visible to the caller' })
  async list(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<ProjectListResponseDto> {
    return this.projectsService.list(req.user.sub, organizationId, includeArchived === 'true');
  }

  @Get(':projectId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single project' })
  async findOne(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(req.user.sub, organizationId, projectId);
  }

  @Patch(':projectId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update, archive, or restore a project' })
  async update(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Body() data: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(req.user.sub, organizationId, projectId, data);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a project (OWNER or ADMIN)' })
  async remove(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
  ): Promise<void> {
    await this.projectsService.remove(req.user.sub, organizationId, projectId);
  }
}
