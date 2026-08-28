import { Test, TestingModule } from '@nestjs/testing';
import { InvitesController } from './invites.controller';
import { OrganizationInvitesService } from './organization-invites.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { SubmitEmailForInviteDto } from './dto/submit-email-for-invite.dto';
import { VerifyInviteDto } from './dto/verify-invite.dto';
import { TokenPayload } from '@app-starter/shared';

describe('InvitesController', () => {
  let controller: InvitesController;

  const mockOrganizationInvitesService = {
    acceptInvite: jest.fn(),
    submitEmailForInvite: jest.fn(),
    verifyAndAcceptInvite: jest.fn(),
  };

  const mockUser: TokenPayload = {
    sub: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitesController],
      providers: [
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
      .compile();

    controller = module.get<InvitesController>(InvitesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('acceptInvite', () => {
    const inputAcceptInviteDto: AcceptInviteDto = {
      token: 'test-token',
    };

    const expectedAcceptResponse = {
      organization: {
        id: 'organization-123',
        name: 'Test Organization',
        slug: 'test-organization',
        description: 'Test Description',
      },
      role: 'MEMBER' as const,
      message: 'You have been added to the organization',
    };

    it('should accept an invitation', async () => {
      mockOrganizationInvitesService.acceptInvite.mockResolvedValue(expectedAcceptResponse);

      const req = { user: mockUser };
      const actualResult = await controller.acceptInvite(req, inputAcceptInviteDto);

      expect(actualResult).toEqual(expectedAcceptResponse);
      expect(mockOrganizationInvitesService.acceptInvite).toHaveBeenCalledWith(
        inputAcceptInviteDto.token,
        mockUser.sub,
      );
    });
  });

  describe('submitEmailForInvite', () => {
    const token = 'test-token';
    const inputSubmitEmailDto: SubmitEmailForInviteDto = {
      name: 'Test User',
      email: 'test@example.com',
      confirmEmail: 'test@example.com',
    };

    const expectedSubmitResponse = {
      message: 'Verification email sent to test@example.com',
      email: 'test@example.com',
    };

    it('should submit email for invitation', async () => {
      mockOrganizationInvitesService.submitEmailForInvite.mockResolvedValue(expectedSubmitResponse);

      const actualResult = await controller.submitEmailForInvite(token, inputSubmitEmailDto);

      expect(actualResult).toEqual(expectedSubmitResponse);
      expect(mockOrganizationInvitesService.submitEmailForInvite).toHaveBeenCalledWith(
        token,
        inputSubmitEmailDto,
      );
    });
  });

  describe('verifyAndAcceptInvite', () => {
    const inputVerifyInviteDto: VerifyInviteDto = {
      inviteToken: 'invite-token',
      verifyToken: 'verify-token',
    };

    const expectedVerifyResponse = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
      organization: {
        id: 'organization-123',
        name: 'Test Organization',
        slug: 'test-organization',
      },
      role: 'MEMBER' as const,
      authToken: 'test-access-token',
      message: 'Account created and added to organization',
      isNewUser: true,
    };

    it('should verify and accept invitation', async () => {
      mockOrganizationInvitesService.verifyAndAcceptInvite.mockResolvedValue(
        expectedVerifyResponse,
      );

      const actualResult = await controller.verifyAndAcceptInvite(inputVerifyInviteDto);

      expect(actualResult).toEqual(expectedVerifyResponse);
      expect(mockOrganizationInvitesService.verifyAndAcceptInvite).toHaveBeenCalledWith(
        inputVerifyInviteDto.inviteToken,
        inputVerifyInviteDto.verifyToken,
      );
    });
  });
});
