import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrgRole } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const mockPrismaService = {
    organization: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    const inputUserId = 'user-123';
    const inputData = {
      name: 'Test Organization',
      description: 'Test Description',
      location: 'San Francisco',
      website: 'https://example.com',
    };

    const mockOrganization = {
      id: 'organization-123',
      name: 'Test Organization',
      slug: 'test-organization',
      description: 'Test Description',
      location: 'San Francisco',
      website: 'https://example.com',
      logoUrl: undefined,
      emailReplyTo: null,
      emailSenderName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a organization and assign owner role', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          organization: {
            create: jest.fn().mockResolvedValue(mockOrganization),
          },
          organizationMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const expectedResult = {
        id: mockOrganization.id,
        name: mockOrganization.name,
        slug: mockOrganization.slug,
        description: mockOrganization.description,
        location: mockOrganization.location,
        website: mockOrganization.website,
        logoUrl: undefined,
        emailReplyTo: null,
        emailSenderName: null,
        createdAt: mockOrganization.createdAt,
        updatedAt: mockOrganization.updatedAt,
        userRole: 'OWNER' as const,
      };

      const actualResult = await service.createOrganization(inputUserId, inputData);

      expect(actualResult).toEqual(expectedResult);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle optional fields as null', async () => {
      const inputDataWithoutOptional = {
        name: 'Test Organization',
        description: 'Test Description',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          organization: {
            create: jest.fn().mockResolvedValue({
              ...mockOrganization,
              location: null,
              website: null,
            }),
          },
          organizationMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const actualResult = await service.createOrganization(inputUserId, inputDataWithoutOptional);

      expect(actualResult.location).toBeNull();
      expect(actualResult.website).toBeNull();
    });

    it('should generate unique slug when duplicate exists', async () => {
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // First check finds existing
        .mockResolvedValueOnce(null); // Second check finds available

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          organization: {
            create: jest.fn().mockResolvedValue({
              ...mockOrganization,
              slug: 'test-organization-1',
            }),
          },
          organizationMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const actualResult = await service.createOrganization(inputUserId, inputData);

      expect(actualResult.slug).toBe('test-organization-1');
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserOrganizations', () => {
    const inputUserId = 'user-123';

    it('should return organizations for user', async () => {
      const mockOrganizationUsers = [
        {
          id: 'gu-1',
          userId: inputUserId,
          organizationId: 'organization-1',
          role: OrgRole.OWNER,
          organization: {
            id: 'organization-1',
            name: 'Organization 1',
            slug: 'organization-1',
            description: 'Description 1',
            location: 'Location 1',
            website: 'https://example1.com',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        },
        {
          id: 'gu-2',
          userId: inputUserId,
          organizationId: 'organization-2',
          role: OrgRole.MEMBER,
          organization: {
            id: 'organization-2',
            name: 'Organization 2',
            slug: 'organization-2',
            description: 'Description 2',
            location: null,
            website: null,
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-02'),
          },
        },
      ];

      mockPrismaService.organizationMember.findMany.mockResolvedValue(mockOrganizationUsers);

      const actualResult = await service.getUserOrganizations(inputUserId);

      expect(actualResult.hasOrganizations).toBe(true);
      expect(actualResult.organizations).toHaveLength(2);
      expect(actualResult.organizations[0].role).toBe('OWNER');
      expect(actualResult.organizations[1].role).toBe('MEMBER');
    });

    it('should return empty array when user has no organizations', async () => {
      mockPrismaService.organizationMember.findMany.mockResolvedValue([]);

      const actualResult = await service.getUserOrganizations(inputUserId);

      expect(actualResult.hasOrganizations).toBe(false);
      expect(actualResult.organizations).toHaveLength(0);
    });
  });

  describe('userHasOrganizations', () => {
    const inputUserId = 'user-123';

    it('should return true when user has organizations', async () => {
      mockPrismaService.organizationMember.count.mockResolvedValue(2);

      const actualResult = await service.userHasOrganizations(inputUserId);

      expect(actualResult).toBe(true);
    });

    it('should return false when user has no organizations', async () => {
      mockPrismaService.organizationMember.count.mockResolvedValue(0);

      const actualResult = await service.userHasOrganizations(inputUserId);

      expect(actualResult).toBe(false);
    });
  });

  describe('slug generation', () => {
    it('should generate correct slug from name', async () => {
      const testCases = [
        { name: 'My Organization', expected: 'my-organization' },
        { name: 'Tech Meetup 2024', expected: 'tech-meetup-2024' },
        {
          name: 'Organization with Special!@# Characters',
          expected: 'organization-with-special-characters',
        },
        { name: '  Trimmed  Organization  ', expected: 'trimmed-organization' },
        { name: 'Multiple---Hyphens', expected: 'multiple-hyphens' },
      ];

      for (const testCase of testCases) {
        mockPrismaService.organization.findUnique.mockResolvedValue(null);
        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          return callback({
            organization: {
              create: jest.fn().mockResolvedValue({
                id: 'organization-123',
                name: testCase.name,
                slug: testCase.expected,
                description: 'Test',
                location: null,
                website: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
            },
            organizationMember: {
              create: jest.fn().mockResolvedValue({}),
            },
          });
        });

        const result = await service.createOrganization('user-123', {
          name: testCase.name,
          description: 'Test',
        });

        expect(result.slug).toBe(testCase.expected);
      }
    });
  });

  describe('updateOrganizationUserRole', () => {
    const organizationId = 'organization-123';
    const targetUserId = 'target-user-123';
    const requesterUserId = 'requester-user-123';
    const mockOrganization = {
      id: organizationId,
      name: 'Test Organization',
      slug: 'test-organization',
      description: 'Test Description',
      location: null,
      website: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockUser = {
      id: targetUserId,
      email: 'target@example.com',
      name: 'Target User',
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);
    });

    it('should update user role when requester is OWNER', async () => {
      jest.spyOn(service, 'getUserRoleInOrganization').mockResolvedValue('OWNER' as any);

      const mockOrganizationUser = {
        id: 'organization-user-123',
        userId: targetUserId,
        organizationId,
        role: OrgRole.MEMBER,
        createdAt: new Date(),
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(mockOrganizationUser);
      mockPrismaService.organizationMember.count.mockResolvedValue(2); // Multiple owners
      mockPrismaService.organizationMember.update.mockResolvedValue({
        ...mockOrganizationUser,
        role: OrgRole.ADMIN,
        user: mockUser,
      });

      const result = await service.updateOrganizationUserRole(
        organizationId,
        targetUserId,
        'ADMIN' as any,
        requesterUserId,
      );

      expect(result.role).toBe('ADMIN');
      expect(mockPrismaService.organizationMember.update).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId,
          },
        },
        data: {
          role: OrgRole.ADMIN,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              emailVerifiedAt: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
        },
      });
    });

    it('should update user role when requester is ADMIN', async () => {
      jest.spyOn(service, 'getUserRoleInOrganization').mockResolvedValue('ADMIN' as any);

      const mockOrganizationUser = {
        id: 'organization-user-123',
        userId: targetUserId,
        organizationId,
        role: OrgRole.MEMBER,
        createdAt: new Date(),
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(mockOrganizationUser);
      mockPrismaService.organizationMember.count.mockResolvedValue(2);
      mockPrismaService.organizationMember.update.mockResolvedValue({
        ...mockOrganizationUser,
        role: OrgRole.MEMBER,
        user: mockUser,
      });

      const result = await service.updateOrganizationUserRole(
        organizationId,
        targetUserId,
        'MEMBER' as any,
        requesterUserId,
      );

      expect(result.role).toBe('MEMBER');
    });

    it('should throw ForbiddenException when requester is MEMBER', async () => {
      jest.spyOn(service, 'getUserRoleInOrganization').mockResolvedValue('MEMBER' as any);

      await expect(
        service.updateOrganizationUserRole(
          organizationId,
          targetUserId,
          'ADMIN' as any,
          requesterUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when target user is not in organization', async () => {
      jest.spyOn(service, 'getUserRoleInOrganization').mockResolvedValue('OWNER' as any);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrganizationUserRole(
          organizationId,
          targetUserId,
          'ADMIN' as any,
          requesterUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when trying to change any owner role', async () => {
      jest.spyOn(service, 'getUserRoleInOrganization').mockResolvedValue('OWNER' as any);

      const mockOrganizationUser = {
        id: 'organization-user-123',
        userId: targetUserId,
        organizationId,
        role: OrgRole.OWNER,
        createdAt: new Date(),
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(mockOrganizationUser);

      await expect(
        service.updateOrganizationUserRole(
          organizationId,
          targetUserId,
          'ADMIN' as any,
          requesterUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when ADMIN tries to change owner role', async () => {
      jest.spyOn(service, 'getUserRoleInOrganization').mockResolvedValue('ADMIN' as any);

      const mockOrganizationUser = {
        id: 'organization-user-123',
        userId: targetUserId,
        organizationId,
        role: OrgRole.OWNER,
        createdAt: new Date(),
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(mockOrganizationUser);

      await expect(
        service.updateOrganizationUserRole(
          organizationId,
          targetUserId,
          'ADMIN' as any,
          requesterUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when ADMIN tries to promote to OWNER', async () => {
      jest.spyOn(service, 'getUserRoleInOrganization').mockResolvedValue('ADMIN' as any);

      const mockOrganizationUser = {
        id: 'organization-user-123',
        userId: targetUserId,
        organizationId,
        role: OrgRole.MEMBER,
        createdAt: new Date(),
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(mockOrganizationUser);
      mockPrismaService.organizationMember.count.mockResolvedValue(2);

      await expect(
        service.updateOrganizationUserRole(
          organizationId,
          targetUserId,
          'OWNER' as any,
          requesterUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateOrganization', () => {});
});
