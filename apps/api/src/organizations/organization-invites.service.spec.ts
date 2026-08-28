import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrganizationInvitesService } from './organization-invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from './organizations.service';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { InviteStatus, OrgRole as PrismaOrganizationRole } from '@prisma/client';
import { OrgRole } from '@app-starter/shared';
import {
  InviteExpiredException,
  InviteCancelledException,
  EmailVerificationNotFoundException,
  EmailVerificationExpiredException,
} from './exceptions/invites.exceptions';

describe('OrganizationInvitesService', () => {
  let service: OrganizationInvitesService;

  const mockPrismaService = {
    organizationInvite: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    inviteEmailVerification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockOrganizationsService = {
    getUserRoleInOrganization: jest.fn(),
  };

  const mockAuthService = {
    generateTokens: jest.fn(),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        FRONTEND_URL: 'http://localhost:3000',
        SMTP_FROM_EMAIL: 'noreply@app-starter.local',
        SMTP_FROM_NAME: 'App Starter',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationInvitesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OrganizationsService,
          useValue: mockOrganizationsService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<OrganizationInvitesService>(OrganizationInvitesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvite', () => {
    const organizationId = 'organization-123';
    const userId = 'user-123';
    const mockOrganization = {
      id: organizationId,
      name: 'Test Organization',
      slug: 'test-organization',
    };

    const mockCreator = {
      id: userId,
      name: 'Test User',
      email: 'test@example.com',
    };

    beforeEach(() => {
      mockOrganizationsService.getUserRoleInOrganization.mockResolvedValue(OrgRole.OWNER);
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaService.user.findUnique.mockResolvedValue(mockCreator);
      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationInvite.findFirst.mockResolvedValue(null);
    });

    it('should create invitation without email', async () => {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      const mockInvite = {
        id: 'invite-123',
        organizationId,
        token: 'test-token',
        email: null,
        invitedRole: PrismaOrganizationRole.MEMBER,
        isReusable: false,
        expiresAt,
        status: InviteStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        organization: mockOrganization,
      };

      mockPrismaService.organizationInvite.create.mockResolvedValue(mockInvite);

      const result = await service.createInvite(organizationId, userId, undefined, OrgRole.MEMBER);

      expect(result).toMatchObject({
        id: mockInvite.id,
        organizationId: mockInvite.organizationId,
        token: mockInvite.token,
        email: null,
        status: InviteStatus.PENDING,
      });
      expect(result.inviteUrl).toContain('http://localhost:3000/invites/accept?token=');
      expect(mockPrismaService.organizationInvite.create).toHaveBeenCalled();
      expect(mockNotificationsService.sendNotification).not.toHaveBeenCalled();
    });

    it('should create invitation with email and send email', async () => {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      const mockInvite = {
        id: 'invite-123',
        organizationId,
        token: 'test-token',
        email: 'invitee@example.com',
        invitedRole: PrismaOrganizationRole.MEMBER,
        isReusable: false,
        expiresAt,
        status: InviteStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        organization: mockOrganization,
      };

      mockPrismaService.organizationInvite.create.mockResolvedValue(mockInvite);
      mockNotificationsService.sendNotification.mockResolvedValue(undefined);

      const result = await service.createInvite(
        organizationId,
        userId,
        'invitee@example.com',
        OrgRole.MEMBER,
      );

      expect(result.email).toBe('invitee@example.com');
      expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
    });

    it('should allow MEMBER to create invitation', async () => {
      mockOrganizationsService.getUserRoleInOrganization.mockResolvedValue(OrgRole.MEMBER);
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      const mockInvite = {
        id: 'invite-123',
        organizationId,
        token: 'test-token',
        email: null,
        invitedRole: PrismaOrganizationRole.MEMBER,
        isReusable: false,
        expiresAt,
        status: InviteStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        organization: mockOrganization,
      };

      mockPrismaService.organizationInvite.create.mockResolvedValue(mockInvite);

      const result = await service.createInvite(organizationId, userId, undefined, OrgRole.MEMBER);

      expect(result).toMatchObject({
        id: mockInvite.id,
        organizationId: mockInvite.organizationId,
        token: mockInvite.token,
      });
      expect(mockPrismaService.organizationInvite.create).toHaveBeenCalled();
    });

    it('should throw error if organization does not exist', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvite(organizationId, userId, undefined, OrgRole.MEMBER),
      ).rejects.toThrow();
    });
  });

  describe('getOrganizationInvites', () => {
    const organizationId = 'organization-123';
    const userId = 'user-123';

    beforeEach(() => {
      mockOrganizationsService.getUserRoleInOrganization.mockResolvedValue(OrgRole.OWNER);
      mockPrismaService.organization.findUnique.mockResolvedValue({ id: organizationId });
      mockPrismaService.organizationInvite.findFirst.mockResolvedValue(null);
    });

    it('should return all invitations for a organization', async () => {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      const mockInvites = [
        {
          id: 'invite-1',
          organizationId,
          token: 'token-1',
          email: 'user1@example.com',
          invitedRole: PrismaOrganizationRole.ADMIN,
          isReusable: false,
          expiresAt,
          status: InviteStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          organization: {
            id: organizationId,
            name: 'Test Organization',
            slug: 'test-organization',
          },
        },
        {
          id: 'invite-2',
          organizationId,
          token: 'token-2',
          email: null,
          invitedRole: PrismaOrganizationRole.MEMBER,
          isReusable: true,
          expiresAt,
          status: InviteStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          organization: {
            id: organizationId,
            name: 'Test Organization',
            slug: 'test-organization',
          },
        },
      ];

      mockPrismaService.organizationInvite.findMany.mockResolvedValue(mockInvites);

      const result = await service.getOrganizationInvites(organizationId, userId, 'all');

      expect(result.invites).toHaveLength(2);
      expect(result.invites[0].id).toBe('invite-1');
      expect(result.invites[1].id).toBe('invite-2');
    });

    it('should mark expired invitations as EXPIRED', async () => {
      const expiredDate = new Date();
      expiredDate.setMonth(expiredDate.getMonth() - 1); // 1 month ago

      const mockInvites = [
        {
          id: 'invite-1',
          organizationId,
          token: 'token-1',
          email: null,
          invitedRole: PrismaOrganizationRole.MEMBER,
          isReusable: false,
          expiresAt: expiredDate,
          status: InviteStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          organization: {
            id: organizationId,
            name: 'Test Organization',
            slug: 'test-organization',
          },
        },
      ];

      mockPrismaService.organizationInvite.findMany.mockResolvedValue(mockInvites);

      const result = await service.getOrganizationInvites(organizationId, userId, 'all');

      expect(result.invites[0].status).toBe(InviteStatus.EXPIRED);
    });
  });

  describe('cancelInvite', () => {
    const organizationId = 'organization-123';
    const inviteId = 'invite-123';
    const userId = 'user-123';

    beforeEach(() => {
      mockOrganizationsService.getUserRoleInOrganization.mockResolvedValue(OrgRole.OWNER);
    });

    it('should cancel an invitation', async () => {
      const mockInvite = {
        id: inviteId,
        organizationId,
        token: 'test-token',
        email: null,
        isReusable: false,
        expiresAt: new Date(),
        status: InviteStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      };

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrismaService.organizationInvite.update.mockResolvedValue({
        ...mockInvite,
        status: InviteStatus.CANCELLED,
      });

      const result = await service.cancelInvite(organizationId, inviteId, userId);

      expect(result.status).toBe(InviteStatus.CANCELLED);
      expect(mockPrismaService.organizationInvite.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: inviteId },
          data: { status: InviteStatus.CANCELLED },
        }),
      );
    });

    it('should throw error if invitation does not exist', async () => {
      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(null);

      await expect(service.cancelInvite(organizationId, inviteId, userId)).rejects.toThrow();
    });
  });

  describe('acceptInvite', () => {
    const token = 'test-token';
    const userId = 'user-123';
    const organizationId = 'organization-123';

    const createMockInvite = (overrides = {}) => ({
      id: 'invite-123',
      organizationId,
      token,
      email: null,
      invitedRole: PrismaOrganizationRole.MEMBER,
      isReusable: false,
      expiresAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months from now
      status: InviteStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'creator-123',
      ...overrides,
    });

    it('should accept invitation and add user to organization', async () => {
      const mockInvite = createMockInvite();
      const mockOrganization = {
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-organization',
        description: 'Test Description',
      };

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationMember.create.mockResolvedValue({});
      mockPrismaService.organizationInvite.update.mockResolvedValue({
        ...mockInvite,
        status: InviteStatus.ACCEPTED,
      });

      const result = await service.acceptInvite(token, userId);

      expect(result.organization.id).toBe(organizationId);
      expect(result.role).toBe(OrgRole.MEMBER);
      expect(result.message).toBe('You have been added to the organization');
      expect(mockPrismaService.organizationMember.create).toHaveBeenCalled();
      expect(mockPrismaService.organizationInvite.update).toHaveBeenCalled();
    });

    it('should handle existing organization membership gracefully', async () => {
      const mockInvite = createMockInvite();
      const mockOrganization = {
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-organization',
        description: 'Test Description',
      };

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'gu-123',
        userId,
        organizationId,
        role: PrismaOrganizationRole.MEMBER,
      });

      const result = await service.acceptInvite(token, userId);

      expect(result.message).toBe('You are already a member of this organization');
      expect(mockPrismaService.organizationMember.create).not.toHaveBeenCalled();
    });

    it('should throw error if invitation is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setMonth(expiredDate.getMonth() - 1);
      const mockInvite = createMockInvite({ expiresAt: expiredDate });

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(mockInvite);

      await expect(service.acceptInvite(token, userId)).rejects.toThrow(InviteExpiredException);
    });

    it('should throw error if invitation is cancelled', async () => {
      const mockInvite = createMockInvite({ status: InviteStatus.CANCELLED });

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(mockInvite);

      await expect(service.acceptInvite(token, userId)).rejects.toThrow(InviteCancelledException);
    });
  });

  describe('submitEmailForInvite', () => {
    const token = 'test-token';
    const organizationId = 'organization-123';

    const createMockInvite = () => ({
      id: 'invite-123',
      organizationId,
      token,
      email: null,
      isReusable: false,
      expiresAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
      status: InviteStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'creator-123',
    });

    it('should submit email and create verification', async () => {
      const mockInvite = createMockInvite();
      const mockOrganization = { id: organizationId, name: 'Test Organization' };

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaService.inviteEmailVerification.findUnique.mockResolvedValue(null);
      mockPrismaService.inviteEmailVerification.create.mockResolvedValue({
        id: 'verify-123',
        inviteId: mockInvite.id,
        token: 'verify-token',
        email: 'test@example.com',
        name: 'Test User',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });
      mockNotificationsService.sendNotification.mockResolvedValue(undefined);

      const result = await service.submitEmailForInvite(token, {
        name: 'Test User',
        email: 'test@example.com',
        confirmEmail: 'test@example.com',
      });

      expect(result.email).toBe('test@example.com');
      expect(mockPrismaService.inviteEmailVerification.create).toHaveBeenCalled();
      expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
    });

    it('should throw error if emails do not match', async () => {
      const mockInvite = createMockInvite();
      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(mockInvite);

      await expect(
        service.submitEmailForInvite(token, {
          name: 'Test User',
          email: 'test@example.com',
          confirmEmail: 'different@example.com',
        }),
      ).rejects.toThrow();
    });
  });

  describe('verifyAndAcceptInvite', () => {
    const inviteToken = 'invite-token';
    const verifyToken = 'verify-token';
    const organizationId = 'organization-123';

    const createMockInvite = () => ({
      id: 'invite-123',
      organizationId,
      token: inviteToken,
      email: null,
      isReusable: false,
      expiresAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
      status: InviteStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'creator-123',
    });

    const createMockVerification = () => ({
      id: 'verify-123',
      inviteId: 'invite-123',
      token: verifyToken,
      email: 'test@example.com',
      name: 'Test User',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      usedAt: null,
      createdAt: new Date(),
    });

    it('should verify and create new user', async () => {
      const mockInvite = createMockInvite();
      const mockVerification = createMockVerification();
      const mockOrganization = {
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-organization',
      };

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrismaService.inviteEmailVerification.findUnique.mockResolvedValue(mockVerification);
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const mockNewUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerifiedAt: new Date(),
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue(mockNewUser),
          },
          organizationMember: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
          inviteEmailVerification: {
            update: jest.fn().mockResolvedValue({ ...mockVerification, usedAt: new Date() }),
          },
          organizationInvite: {
            update: jest.fn().mockResolvedValue({ ...mockInvite, status: InviteStatus.ACCEPTED }),
          },
        };
        return callback(tx);
      });

      mockAuthService.generateTokens.mockResolvedValue({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      });

      const result = await service.verifyAndAcceptInvite(inviteToken, verifyToken);

      expect(result.isNewUser).toBe(true);
      expect(result.user.email).toBe('test@example.com');
      expect(result.authToken).toBe('test-access-token');
      expect(result.message).toBe('Account created and added to organization');
    });

    it('should verify and add existing user to organization', async () => {
      const mockInvite = createMockInvite();
      const mockVerification = createMockVerification();
      const mockOrganization = {
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-organization',
      };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrismaService.inviteEmailVerification.findUnique.mockResolvedValue(mockVerification);
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
            upsert: jest.fn().mockResolvedValue(mockUser),
          },
          organizationMember: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
          inviteEmailVerification: {
            update: jest.fn().mockResolvedValue({ ...mockVerification, usedAt: new Date() }),
          },
          organizationInvite: {
            update: jest.fn().mockResolvedValue({ ...mockInvite, status: InviteStatus.ACCEPTED }),
          },
        };
        return callback(tx);
      });

      mockAuthService.generateTokens.mockResolvedValue({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      });

      const result = await service.verifyAndAcceptInvite(inviteToken, verifyToken);

      expect(result.isNewUser).toBe(false);
      expect(result.message).toBe('Added to organization');
    });

    it('should throw error if verification is expired', async () => {
      const mockInvite = createMockInvite();
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25);
      const mockVerification = createMockVerification();
      mockVerification.expiresAt = expiredDate;

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrismaService.inviteEmailVerification.findUnique.mockResolvedValue(mockVerification);

      await expect(service.verifyAndAcceptInvite(inviteToken, verifyToken)).rejects.toThrow(
        EmailVerificationExpiredException,
      );
    });

    it('should throw error if verification token is invalid', async () => {
      const mockInvite = createMockInvite();
      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrismaService.inviteEmailVerification.findUnique.mockResolvedValue(null);

      await expect(service.verifyAndAcceptInvite(inviteToken, verifyToken)).rejects.toThrow(
        EmailVerificationNotFoundException,
      );
    });
  });
});
