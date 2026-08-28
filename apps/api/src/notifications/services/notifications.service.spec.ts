import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationDefinitionRegistryService } from './notification-definition-registry.service';
import { EmailChannelProvider } from '../providers/email-channel.provider';
import { PrismaService } from '../../prisma/prisma.service';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { emailBrandingStorage } from '../utils/email-branding-storage';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let registry: NotificationDefinitionRegistryService;
  let emailProvider: EmailChannelProvider;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationDefinitionRegistryService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: EmailChannelProvider,
          useValue: {
            send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-123' }),
            channel: 'EMAIL',
          },
        },
        {
          provide: PrismaService,
          useValue: {
            notification: {
              create: jest
                .fn()
                .mockImplementation((args) => Promise.resolve({ id: '123', ...args.data })),
            },
            user: {
              findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 'user@example.com' }),
            },
            notificationPreference: {
              findFirst: jest.fn(),
            },
            event: {
              findUnique: jest.fn(),
            },
            session: {
              findUnique: jest.fn(),
            },
            organization: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: InAppNotificationService,
          useValue: {
            createNotification: jest.fn(),
          },
        },
        {
          provide: NotificationPreferenceService,
          useValue: {
            shouldReceiveNotification: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    registry = module.get<NotificationDefinitionRegistryService>(
      NotificationDefinitionRegistryService,
    );
    emailProvider = module.get<EmailChannelProvider>(EmailChannelProvider);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification branding', () => {
    const mockTemplate = {
      render: jest.fn().mockImplementation(() => {
        const store = emailBrandingStorage.getStore();
        return {
          subject: store?.hasEmailBranding ? 'Branded' : 'Unbranded',
          htmlContent: `logoUrl:${store?.logoUrl || ''},logoAlt:${store?.logoAlt || ''},hasEmailBranding:${store?.hasEmailBranding || false}`,
          textContent: 'text',
        };
      }),
    };

    beforeEach(() => {
      registry.get = jest.fn().mockReturnValue({
        channels: ['EMAIL'],
        type: 'SYSTEM',
        name: 'test-definition',
        template: mockTemplate,
      });
    });

    it('propagates branding context when the organization has branding + logo', async () => {
      prisma.organization.findUnique = jest.fn().mockResolvedValue({
        id: 'organization-123',
        name: 'Testing Organization',
        logoUrl: 'http://my-logo.png',
        emailReplyTo: 'reply@testing.com',
        emailSenderName: 'Testing Sender',
      });

      const notifications = await service.sendNotification(
        'test-definition',
        { type: 'email', email: 'test@example.com' },
        {},
        'organization-123',
      );

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'organization-123' },
        select: {
          logoUrl: true,
          name: true,
          emailReplyTo: true,
          emailSenderName: true,
        },
      });

      expect(notifications[0].subject).toBe('Branded');
      expect(notifications[0].organizationId).toBe('organization-123');
      expect(emailProvider.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          htmlContent:
            'logoUrl:http://my-logo.png,logoAlt:Testing Organization Logo,hasEmailBranding:true',
        }),
        undefined,
      );
    });

    it('omits logoUrl when the organization has no email branding', async () => {
      prisma.organization.findUnique = jest.fn().mockResolvedValue({
        id: 'organization-456',
        name: 'Testing Organization 2',
        logoUrl: 'http://my-logo.png',
        emailReplyTo: null,
        emailSenderName: null,
      });

      const notifications = await service.sendNotification(
        'test-definition',
        { type: 'email', email: 'test@example.com' },
        {},
        'organization-456',
      );

      expect(notifications[0].subject).toBe('Unbranded');
      expect(notifications[0].organizationId).toBe('organization-456');
      expect(emailProvider.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          htmlContent: 'logoUrl:,logoAlt:,hasEmailBranding:false',
        }),
        undefined,
      );
    });
  });
});
