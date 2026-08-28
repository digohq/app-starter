import { Test, TestingModule } from '@nestjs/testing';
import { OrgRole, ProjectVisibility } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import {
  ProjectAccessDeniedException,
  ProjectNotFoundException,
} from './exceptions/projects.exceptions';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: any;
  let organizations: { getUserRoleInOrganization: jest.Mock };

  const ORG = 'org-1';
  const USER = 'user-1';

  const buildProject = (overrides: Record<string, unknown> = {}) => ({
    id: 'proj-1',
    organizationId: ORG,
    createdById: USER,
    name: 'Website redesign',
    slug: 'website-redesign',
    description: null,
    visibility: ProjectVisibility.ORGANIZATION,
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      project: {
        create: jest.fn().mockImplementation(({ data }) => buildProject(data)),
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => buildProject(data)),
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    organizations = { getUserRoleInOrganization: jest.fn().mockResolvedValue(OrgRole.MEMBER) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrganizationsService, useValue: organizations },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('create', () => {
    it('rejects a caller with no role in the organization', async () => {
      organizations.getUserRoleInOrganization.mockResolvedValue(null);

      await expect(service.create(USER, ORG, { name: 'X' })).rejects.toThrow(
        ProjectAccessDeniedException,
      );
    });

    it('defaults visibility to ORGANIZATION', async () => {
      await service.create(USER, ORG, { name: 'X' });

      expect(prisma.project.create.mock.calls[0][0].data.visibility).toBe(
        ProjectVisibility.ORGANIZATION,
      );
    });
  });

  describe('list', () => {
    it('scopes the query to the organization and hides other members private work', async () => {
      await service.list(USER, ORG);

      const where = prisma.project.findMany.mock.calls[0][0].where;
      expect(where.organizationId).toBe(ORG);
      expect(where.archivedAt).toBeNull();
      expect(where.OR).toEqual([
        { visibility: { in: [ProjectVisibility.ORGANIZATION, ProjectVisibility.PUBLIC] } },
        { visibility: ProjectVisibility.PRIVATE, createdById: USER },
      ]);
    });

    it('includes archived projects when asked', async () => {
      await service.list(USER, ORG, true);

      expect(prisma.project.findMany.mock.calls[0][0].where.archivedAt).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('reads a project from another organization as not found', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER, ORG, 'proj-from-other-org')).rejects.toThrow(
        ProjectNotFoundException,
      );
      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'proj-from-other-org', organizationId: ORG },
      });
    });

    it('hides a PRIVATE project from a member who did not create it', async () => {
      prisma.project.findFirst.mockResolvedValue(
        buildProject({ visibility: ProjectVisibility.PRIVATE, createdById: 'someone-else' }),
      );

      await expect(service.findOne(USER, ORG, 'proj-1')).rejects.toThrow(
        ProjectAccessDeniedException,
      );
    });

    it('shows a PRIVATE project to its creator', async () => {
      prisma.project.findFirst.mockResolvedValue(
        buildProject({ visibility: ProjectVisibility.PRIVATE, createdById: USER }),
      );

      const actual = await service.findOne(USER, ORG, 'proj-1');

      expect(actual.id).toBe('proj-1');
    });
  });

  describe('update', () => {
    it('lets the creator edit their own project', async () => {
      prisma.project.findFirst.mockResolvedValue(buildProject({ createdById: USER }));

      await expect(service.update(USER, ORG, 'proj-1', { name: 'New' })).resolves.toBeDefined();
    });

    it("lets an ADMIN edit another member's project", async () => {
      prisma.project.findFirst.mockResolvedValue(buildProject({ createdById: 'someone-else' }));
      organizations.getUserRoleInOrganization.mockResolvedValue(OrgRole.ADMIN);

      await expect(service.update(USER, ORG, 'proj-1', { name: 'New' })).resolves.toBeDefined();
    });

    it("stops a MEMBER editing another member's project", async () => {
      prisma.project.findFirst.mockResolvedValue(buildProject({ createdById: 'someone-else' }));
      organizations.getUserRoleInOrganization.mockResolvedValue(OrgRole.MEMBER);

      await expect(service.update(USER, ORG, 'proj-1', { name: 'New' })).rejects.toThrow(
        ProjectAccessDeniedException,
      );
    });

    it('sets archivedAt when archiving and clears it when restoring', async () => {
      prisma.project.findFirst.mockResolvedValue(buildProject());

      await service.update(USER, ORG, 'proj-1', { archived: true });
      expect(prisma.project.update.mock.calls[0][0].data.archivedAt).toBeInstanceOf(Date);

      await service.update(USER, ORG, 'proj-1', { archived: false });
      expect(prisma.project.update.mock.calls[1][0].data.archivedAt).toBeNull();
    });

    it('leaves fields untouched when they are absent from the payload', async () => {
      prisma.project.findFirst.mockResolvedValue(buildProject());

      await service.update(USER, ORG, 'proj-1', { name: 'New' });

      expect(prisma.project.update.mock.calls[0][0].data).toEqual({ name: 'New' });
    });
  });

  describe('remove', () => {
    it('stops a MEMBER deleting a project they created', async () => {
      prisma.project.findFirst.mockResolvedValue(buildProject({ createdById: USER }));
      organizations.getUserRoleInOrganization.mockResolvedValue(OrgRole.MEMBER);

      await expect(service.remove(USER, ORG, 'proj-1')).rejects.toThrow(
        ProjectAccessDeniedException,
      );
      expect(prisma.project.delete).not.toHaveBeenCalled();
    });

    it('lets an OWNER delete any project', async () => {
      prisma.project.findFirst.mockResolvedValue(buildProject({ createdById: 'someone-else' }));
      organizations.getUserRoleInOrganization.mockResolvedValue(OrgRole.OWNER);

      await service.remove(USER, ORG, 'proj-1');

      expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 'proj-1' } });
    });
  });
});
