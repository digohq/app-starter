import { Injectable } from '@nestjs/common';
import { OrgRole, Project, ProjectVisibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { ensureUniqueSlug, generateSlugFromName } from '../common/utils/slug.util';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectListResponseDto, ProjectResponseDto } from './dto/project-response.dto';
import {
  ProjectAccessDeniedException,
  ProjectNotFoundException,
} from './exceptions/projects.exceptions';

/**
 * Reference implementation of an organization-scoped resource.
 *
 * Every query is filtered by `organizationId` rather than trusting an
 * unguessable id, and every mutation resolves the caller's `OrgRole` first.
 * Copy this shape when adding a real vertical.
 */
@Injectable()
export class ProjectsService {
  private static readonly WRITE_ROLES: OrgRole[] = [OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER];

  private static readonly MANAGE_ROLES: OrgRole[] = [OrgRole.OWNER, OrgRole.ADMIN];

  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    data: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    await this.requireRole(userId, organizationId, ProjectsService.WRITE_ROLES, 'create');

    const slug = await ensureUniqueSlug(
      async (candidate) => {
        const existing = await this.prisma.project.findUnique({
          where: { organizationId_slug: { organizationId, slug: candidate } },
          select: { id: true },
        });
        return existing !== null;
      },
      100,
      () => generateSlugFromName(data.name),
    );

    const project = await this.prisma.project.create({
      data: {
        organizationId,
        createdById: userId,
        name: data.name,
        slug,
        description: data.description ?? null,
        visibility: data.visibility ?? ProjectVisibility.ORGANIZATION,
      },
    });

    return this.toResponse(project);
  }

  /**
   * List projects visible to the caller within one organization.
   *
   * PRIVATE projects are visible only to their creator; ORGANIZATION and
   * PUBLIC projects are visible to every member.
   */
  async list(
    userId: string,
    organizationId: string,
    includeArchived = false,
  ): Promise<ProjectListResponseDto> {
    await this.requireRole(userId, organizationId, ProjectsService.WRITE_ROLES, 'view projects in');

    const projects = await this.prisma.project.findMany({
      where: {
        organizationId,
        ...(includeArchived ? {} : { archivedAt: null }),
        OR: [
          { visibility: { in: [ProjectVisibility.ORGANIZATION, ProjectVisibility.PUBLIC] } },
          { visibility: ProjectVisibility.PRIVATE, createdById: userId },
        ],
      },
      orderBy: [{ archivedAt: 'asc' }, { updatedAt: 'desc' }],
    });

    return {
      items: projects.map((project) => this.toResponse(project)),
      total: projects.length,
    };
  }

  async findOne(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.loadScoped(organizationId, projectId);
    const role = await this.organizationsService.getUserRoleInOrganization(userId, organizationId);

    if (!role) {
      throw new ProjectAccessDeniedException('view');
    }

    if (project.visibility === ProjectVisibility.PRIVATE && project.createdById !== userId) {
      throw new ProjectAccessDeniedException('view');
    }

    return this.toResponse(project);
  }

  /**
   * Update a project. The creator may edit their own; OWNER and ADMIN may
   * edit any project in the organization.
   */
  async update(
    userId: string,
    organizationId: string,
    projectId: string,
    data: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.loadScoped(organizationId, projectId);
    await this.requireCreatorOrManager(userId, organizationId, project, 'edit');

    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
        ...(data.archived !== undefined ? { archivedAt: data.archived ? new Date() : null } : {}),
      },
    });

    return this.toResponse(updated);
  }

  async remove(userId: string, organizationId: string, projectId: string): Promise<void> {
    const project = await this.loadScoped(organizationId, projectId);
    await this.requireRole(
      userId,
      organizationId,
      ProjectsService.MANAGE_ROLES,
      'delete projects in',
    );

    await this.prisma.project.delete({ where: { id: project.id } });
  }

  /**
   * Load a project by id *and* organization so that a valid id from another
   * tenant reads as "not found" rather than leaking its existence.
   */
  private async loadScoped(organizationId: string, projectId: string): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new ProjectNotFoundException(projectId);
    }

    return project;
  }

  private async requireRole(
    userId: string,
    organizationId: string,
    allowed: OrgRole[],
    action: string,
  ): Promise<OrgRole> {
    const role = await this.organizationsService.getUserRoleInOrganization(userId, organizationId);

    if (!role || !allowed.includes(role)) {
      throw new ProjectAccessDeniedException(action);
    }

    return role;
  }

  private async requireCreatorOrManager(
    userId: string,
    organizationId: string,
    project: Project,
    action: string,
  ): Promise<void> {
    const role = await this.organizationsService.getUserRoleInOrganization(userId, organizationId);

    if (!role) {
      throw new ProjectAccessDeniedException(action);
    }

    const isCreator = project.createdById === userId;
    const isManager = ProjectsService.MANAGE_ROLES.includes(role);

    if (!isCreator && !isManager) {
      throw new ProjectAccessDeniedException(action);
    }
  }

  private toResponse(project: Project): ProjectResponseDto {
    return {
      id: project.id,
      organizationId: project.organizationId,
      createdById: project.createdById,
      name: project.name,
      slug: project.slug,
      description: project.description,
      visibility: project.visibility,
      archivedAt: project.archivedAt?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }
}
