import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminImpersonationService } from '../admin-impersonation/admin-impersonation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GlobalAdminGuard } from '../auth/global-admin.guard';

describe('AdminDashboardController', () => {
  let controller: AdminDashboardController;
  let adminImpersonationService: jest.Mocked<AdminImpersonationService>;

  const mockAdminImpersonationService = {
    impersonate: jest.fn(),
  };

  const mockCanActivate = () => true;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [
        { provide: AdminDashboardService, useValue: {} },
        { provide: AdminImpersonationService, useValue: mockAdminImpersonationService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: mockCanActivate })
      .overrideGuard(GlobalAdminGuard)
      .useValue({ canActivate: mockCanActivate })
      .compile();

    controller = module.get<AdminDashboardController>(AdminDashboardController);
    adminImpersonationService = module.get(AdminImpersonationService);
    jest.clearAllMocks();
  });

  describe('impersonate', () => {
    it('passes actor from req.user.email and request metadata to AdminImpersonationService', async () => {
      mockAdminImpersonationService.impersonate.mockResolvedValue({
        accessToken: 'token',
        expiresIn: 600,
        tokenType: 'Bearer',
      });

      const req = {
        user: { sub: 'admin-id', email: 'admin@example.com' },
        headers: { 'user-agent': 'TestAgent' },
        ip: '127.0.0.1',
      } as any;

      await controller.impersonate({ targetUserId: 'target-uuid', reason: 'Support ticket' }, req);

      expect(adminImpersonationService.impersonate).toHaveBeenCalledTimes(1);
      expect(adminImpersonationService.impersonate).toHaveBeenCalledWith(
        {
          targetUserId: 'target-uuid',
          reason: 'Support ticket',
          actor: 'admin@example.com',
        },
        { ip: '127.0.0.1', userAgent: 'TestAgent' },
      );
    });

    it('uses default reason when reason is omitted or too short', async () => {
      mockAdminImpersonationService.impersonate.mockResolvedValue({
        accessToken: 'token',
        expiresIn: 600,
        tokenType: 'Bearer',
      });

      const req = {
        user: { sub: 'admin-id', email: 'admin@example.com' },
        headers: {},
        ip: undefined,
      } as any;

      await controller.impersonate({ targetUserId: 'target-uuid' }, req);

      expect(adminImpersonationService.impersonate).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'Admin dashboard' }),
        expect.any(Object),
      );
    });
  });
});
