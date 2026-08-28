import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationsController } from './in-app-notifications.controller';
import { InAppNotificationService } from './services/in-app-notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('InAppNotificationsController', () => {
  let controller: InAppNotificationsController;
  let service: InAppNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InAppNotificationsController],
      providers: [
        {
          provide: InAppNotificationService,
          useValue: {
            getNotifications: jest.fn(),
            getUnreadCount: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            dismissNotification: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<InAppNotificationsController>(InAppNotificationsController);
    service = module.get<InAppNotificationService>(InAppNotificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should call service.getNotifications', async () => {
      await controller.getNotifications({ user: { sub: 'user-1' } } as any, '1', '10');
      expect(service.getNotifications).toHaveBeenCalledWith('user-1', {
        page: 1,
        limit: 10,
        unreadOnly: false,
        type: undefined,
        since: undefined,
      });
    });
  });

  // Add other tests
});
