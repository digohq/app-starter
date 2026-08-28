import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationInvitesService } from './organization-invites.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { TokenPayload, OrgRole } from '@app-starter/shared';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;

  const mockOrganizationsService = {
    createOrganization: jest.fn(),
    getUserOrganizations: jest.fn(),
    getUserRoleInOrganization: jest.fn(),
  };

  const mockOrganizationInvitesService = {
    createInvite: jest.fn(),
    getOrganizationInvites: jest.fn(),
    cancelInvite: jest.fn(),
  };

  const mockUser: TokenPayload = {
    sub: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: mockOrganizationsService,
        },
        {
          provide: OrganizationInvitesService,
          useValue: mockOrganizationInvitesService,
        },
      ],
    })
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      .overrideGuard(require('@nestjs/throttler').ThrottlerGuard)
      .useValue({ canActivate: () => true })
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      .overrideGuard(require('../auth/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      .overrideGuard(require('../auth/email-verified.guard').EmailVerifiedGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    const inputCreateOrganizationDto: CreateOrganizationDto = {
      name: 'Test Organization',
      description: 'Test Description',
      location: 'San Francisco',
      website: 'https://example.com',
    };

    const expectedOrganizationResponse = {
      id: 'organization-123',
      name: 'Test Organization',
      slug: 'test-organization',
      description: 'Test Description',
      location: 'San Francisco',
      website: 'https://example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      userRole: 'OWNER' as const,
    };

    it('should create a organization', async () => {
      mockOrganizationsService.createOrganization.mockResolvedValue(expectedOrganizationResponse);

      const req = { user: mockUser };
      const actualResult = await controller.createOrganization(req, inputCreateOrganizationDto);

      expect(actualResult).toEqual(expectedOrganizationResponse);
      expect(mockOrganizationsService.createOrganization).toHaveBeenCalledWith(
        mockUser.sub,
        inputCreateOrganizationDto,
      );
    });
  });

  describe('getUserOrganizations', () => {
    const expectedUserOrganizationsResponse = {
      organizations: [
        {
          id: 'organization-1',
          name: 'Organization 1',
          slug: 'organization-1',
          description: 'Description 1',
          location: 'Location 1',
          website: 'https://example1.com',
          createdAt: new Date(),
          updatedAt: new Date(),
          role: 'OWNER' as const,
        },
      ],
      hasOrganizations: true,
    };

    it('should return user organizations', async () => {
      mockOrganizationsService.getUserOrganizations.mockResolvedValue(
        expectedUserOrganizationsResponse,
      );

      const req = { user: mockUser };
      const actualResult = await controller.getUserOrganizations(req);

      expect(actualResult).toEqual(expectedUserOrganizationsResponse);
      expect(mockOrganizationsService.getUserOrganizations).toHaveBeenCalledWith(mockUser.sub);
    });
  });

  describe('createInvite', () => {
    const organizationId = 'organization-123';
    const inputCreateInviteDto: CreateInviteDto = {
      email: 'invitee@example.com',
      role: OrgRole.MEMBER,
    };

    const expectedInviteResponse = {
      id: 'invite-123',
      organizationId,
      token: 'test-token',
      inviteUrl: 'http://localhost:3000/invites/accept?token=test-token',
      email: 'invitee@example.com',
      role: OrgRole.MEMBER,
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: {
        id: mockUser.sub,
        name: 'Test User',
        email: mockUser.email,
      },
      status: 'PENDING' as const,
    };

    it('should create an invitation', async () => {
      mockOrganizationInvitesService.createInvite.mockResolvedValue(expectedInviteResponse);

      const req = { user: mockUser };
      const actualResult = await controller.createInvite(req, organizationId, inputCreateInviteDto);

      expect(actualResult).toEqual(expectedInviteResponse);
      expect(mockOrganizationInvitesService.createInvite).toHaveBeenCalledWith(
        organizationId,
        mockUser.sub,
        inputCreateInviteDto.email,
        inputCreateInviteDto.role,
      );
    });
  });

  describe('getOrganizationInvites', () => {
    const organizationId = 'organization-123';

    const expectedInvitesResponse = {
      invites: [
        {
          id: 'invite-1',
          token: 'token-1',
          inviteUrl: 'http://localhost:3000/invites/accept?token=token-1',
          email: 'user1@example.com',
          role: OrgRole.MEMBER,
          expiresAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: {
            id: mockUser.sub,
            name: null,
            email: '',
          },
          status: 'PENDING' as const,
        },
      ],
    };

    it('should return organization invitations', async () => {
      mockOrganizationInvitesService.getOrganizationInvites.mockResolvedValue(
        expectedInvitesResponse,
      );

      const req = { user: mockUser };
      const actualResult = await controller.getOrganizationInvites(req, organizationId, undefined);

      expect(actualResult).toEqual(expectedInvitesResponse);
      expect(mockOrganizationInvitesService.getOrganizationInvites).toHaveBeenCalledWith(
        organizationId,
        mockUser.sub,
        'all',
      );
    });
  });

  describe('cancelInvite', () => {
    const organizationId = 'organization-123';
    const inviteId = 'invite-123';

    const expectedCancelResponse = {
      id: inviteId,
      status: 'CANCELLED' as const,
      cancelledAt: new Date().toISOString(),
    };

    it('should cancel an invitation', async () => {
      mockOrganizationInvitesService.cancelInvite.mockResolvedValue(expectedCancelResponse);

      const req = { user: mockUser };
      const actualResult = await controller.cancelInvite(req, organizationId, inviteId);

      expect(actualResult).toEqual(expectedCancelResponse);
      expect(mockOrganizationInvitesService.cancelInvite).toHaveBeenCalledWith(
        organizationId,
        inviteId,
        mockUser.sub,
      );
    });
  });
});
