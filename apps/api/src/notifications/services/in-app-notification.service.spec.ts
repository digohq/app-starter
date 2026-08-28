import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationService } from './in-app-notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationWebSocketGateway } from '../gateways/notification.gateway';

describe('InAppNotificationService', () => {
  let service: InAppNotificationService;
  let prisma: PrismaService;
  let gateway: NotificationWebSocketGateway;

  const mockNotification = {
    id: '123',
    userId: 'user-1',
    type: 'invitation',
    title: 'Test Notification',
    description: 'Description',
    data: {},
    read: false,
    dismissed: false,
    createdAt: new Date(),
    readAt: null,
    dismissedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationService,
        {
          provide: PrismaService,
          useValue: {
            inAppNotification: {
              create: jest.fn().mockResolvedValue(mockNotification),
              findMany: jest.fn().mockResolvedValue([mockNotification]),
              count: jest.fn().mockResolvedValue(1),
              findFirst: jest.fn().mockResolvedValue(mockNotification),
              update: jest
                .fn()
                .mockResolvedValue({ ...mockNotification, read: true, readAt: new Date() }),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          },
        },
        {
          provide: NotificationWebSocketGateway,
          useValue: {
            sendNotificationToUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InAppNotificationService>(InAppNotificationService);
    prisma = module.get<PrismaService>(PrismaService);
    gateway = module.get<NotificationWebSocketGateway>(NotificationWebSocketGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification and send it via websocket', async () => {
      const result = await service.createNotification(
        'user-1',
        'invitation',
        'Test Notification',
        'Description',
        {},
      );

      expect(prisma.inAppNotification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'invitation',
          title: 'Test Notification',
          description: 'Description',
          data: {},
        },
      });
      expect(gateway.sendNotificationToUser).toHaveBeenCalledWith('user-1', 'notification:new', {
        notification: result,
      });
      expect(result).toEqual(mockNotification);
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      const result = await service.getNotifications('user-1', { page: 1, limit: 10 });

      expect(prisma.inAppNotification.findMany).toHaveBeenCalled();
      expect(prisma.inAppNotification.count).toHaveBeenCalledTimes(2); // total and unread
      expect(result.notifications).toEqual([mockNotification]);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and notify user', async () => {
      await service.markAsRead('123', 'user-1');

      expect(prisma.inAppNotification.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { read: true, readAt: expect.any(Date) },
      });
      expect(gateway.sendNotificationToUser).toHaveBeenCalledWith(
        'user-1',
        'notification:updated',
        expect.objectContaining({
          notificationId: '123',
          read: true,
        }),
      );
    });
  });
});
