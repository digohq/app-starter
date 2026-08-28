import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsModule } from './notifications.module';
import { NotificationsService } from './services/notifications.service';
import { NotificationDefinitionRegistryService } from './services/notification-definition-registry.service';
import { EmailService } from '../email/email.service';
import { EmailModule } from '../email/email.module';
import {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
  NotificationRecipient,
} from './types/notification.types';
import {
  NotificationDefinitionNotFoundException,
  RecipientResolutionException,
} from './exceptions/notification.exceptions';

describe('NotificationsService Integration', () => {
  let service: NotificationsService;
  let prisma: PrismaService;
  let module: TestingModule;
  let app: INestApplication;
  let emailService: EmailService;
  let testUserId: string;
  let testUserEmail: string;
  let testOrganizationId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test.local', '.env.test'],
        }),
        PrismaModule,
        EmailModule,
        NotificationsModule,
      ],
    }).compile();

    // Trigger onModuleInit so notification definitions are registered
    app = module.createNestApplication();
    await app.init();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-notifications-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
    testUserId = testUser.id;
    testUserEmail = testUser.email;

    // Create a test organization
    const testOrganization = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        slug: `test-organization-${Date.now()}`,
        description: 'Test Description',
      },
    });
    testOrganizationId = testOrganization.id;
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
    } catch {
      // ignore
    }
    // Clean up test data
    try {
      if (prisma) {
        await prisma.notification.deleteMany({
          where: {
            recipientEmail: testUserEmail,
          },
        });
        await prisma.notificationPreference.deleteMany({
          where: {
            userId: testUserId,
          },
        });
        await prisma.organization.deleteMany({
          where: {
            id: testOrganizationId,
          },
        });
        await prisma.user.deleteMany({
          where: {
            id: testUserId,
          },
        });
        await prisma.$disconnect();
      }
      if (module) {
        await module.close();
      }
    } catch (error) {
      // Ignore cleanup errors
      console.error('Cleanup error:', error);
    }
  });

  describe('End-to-End Notification Sending', () => {
    it('should send OTP verification notification successfully', async () => {
      const recipient: NotificationRecipient = {
        type: 'email',
        email: testUserEmail,
      };

      const variables = {
        otp: '123456',
        firstName: 'Test',
      };

      const notifications = await service.sendNotification(
        'otp-verification',
        recipient,
        variables,
      );

      expect(notifications).toBeDefined();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].status).toBe(NotificationStatus.SENT);
      expect(notifications[0].channel).toBe(NotificationChannel.EMAIL);
      expect(notifications[0].definitionName).toBe('otp-verification');
      expect(notifications[0].recipientEmail).toBe(testUserEmail);
      expect(notifications[0].subject).toBeDefined();
      expect(notifications[0].sentAt).toBeDefined();

      // Verify notification is stored in database
      const storedNotification = await prisma.notification.findUnique({
        where: { id: notifications[0].id },
      });
      expect(storedNotification).toBeDefined();
      expect(storedNotification?.status).toBe(NotificationStatus.SENT);
    });

    it('should send password reset notification successfully', async () => {
      const recipient: NotificationRecipient = {
        type: 'email',
        email: testUserEmail,
      };

      const variables = {
        resetUrl: 'https://example.com/reset-password?token=abc123',
      };

      const notifications = await service.sendNotification('password-reset', recipient, variables);

      expect(notifications).toBeDefined();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].status).toBe(NotificationStatus.SENT);
      expect(notifications[0].definitionName).toBe('password-reset');
    });

    it('should send user invitation notification successfully', async () => {
      const recipient: NotificationRecipient = {
        type: 'email',
        email: testUserEmail,
      };

      const variables = {
        organizationName: 'Test Organization',
        inviterName: 'Admin User',
        invitationUrl: 'https://example.com/invite?token=xyz789',
        roleName: 'Member',
      };

      const notifications = await service.sendNotification(
        'user-invitation',
        recipient,
        variables,
        testOrganizationId,
      );

      expect(notifications).toBeDefined();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].status).toBe(NotificationStatus.SENT);
      expect(notifications[0].organizationId).toBe(testOrganizationId);
      expect(notifications[0].definitionName).toBe('user-invitation');
    });

    it('should send notification to userId recipient', async () => {
      const recipient: NotificationRecipient = {
        type: 'userId',
        userId: testUserId,
      };

      const variables = {
        otp: '654321',
        firstName: 'Test',
      };

      const notifications = await service.sendNotification(
        'otp-verification',
        recipient,
        variables,
      );

      expect(notifications).toBeDefined();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].userId).toBe(testUserId);
      expect(notifications[0].recipientEmail).toBe(testUserEmail);
      expect(notifications[0].status).toBe(NotificationStatus.SENT);
    });

    it('should throw error for non-existent notification definition', async () => {
      const recipient: NotificationRecipient = {
        type: 'email',
        email: testUserEmail,
      };

      await expect(
        service.sendNotification('non-existent-definition', recipient, {}),
      ).rejects.toThrow(NotificationDefinitionNotFoundException);
    });

    it('should handle missing required template variables gracefully', async () => {
      const recipient: NotificationRecipient = {
        type: 'email',
        email: testUserEmail,
      };

      // Missing required 'otp' variable
      await expect(service.sendNotification('otp-verification', recipient, {})).rejects.toThrow();
    });
  });

  describe('Recipient Resolution', () => {
    it('should resolve userId recipient to email for EMAIL channel', async () => {
      const recipient: NotificationRecipient = {
        type: 'userId',
        userId: testUserId,
      };

      const resolved = await service['resolveRecipient'](recipient, NotificationChannel.EMAIL);

      expect(resolved).toBe(testUserEmail);
    });

    it('should throw error when user does not exist', async () => {
      const recipient: NotificationRecipient = {
        type: 'userId',
        userId: 'non-existent-user-id',
      };

      await expect(
        service['resolveRecipient'](recipient, NotificationChannel.EMAIL),
      ).rejects.toThrow(RecipientResolutionException);
    });

    it('should throw error when user has no email for EMAIL channel', async () => {
      // User model requires email; use non-existent user to exercise recipient resolution failure.
      const recipient: NotificationRecipient = {
        type: 'userId',
        userId: 'definitely-does-not-exist-user-id',
      };

      await expect(
        service.sendNotification('otp-verification', recipient, {
          otp: '123456',
          firstName: 'Test',
        }),
      ).rejects.toThrow(RecipientResolutionException);
    });

    it('should resolve email recipient directly', async () => {
      const recipient: NotificationRecipient = {
        type: 'email',
        email: 'test@example.com',
      };

      const resolved = await service['resolveRecipient'](recipient, NotificationChannel.EMAIL);

      expect(resolved).toBe('test@example.com');
    });

    it('should throw error for email recipient with non-EMAIL channel', async () => {
      const recipient: NotificationRecipient = {
        type: 'email',
        email: 'test@example.com',
      };

      await expect(service['resolveRecipient'](recipient, NotificationChannel.SMS)).rejects.toThrow(
        RecipientResolutionException,
      );
    });
  });

  describe('Notification Preference Management', () => {
    it('should check notification preference (defaults to enabled)', async () => {
      const enabled = await service.checkNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.TRANSACTIONAL,
      );

      expect(enabled).toBe(true);
    });

    it('should create and update notification preference', async () => {
      // Create preference
      const preference = await service.updateNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.TRANSACTIONAL,
        false,
        null,
      );

      expect(preference).toBeDefined();
      expect(preference.enabled).toBe(false);
      expect(preference.userId).toBe(testUserId);
      expect(preference.organizationId).toBeNull();

      // Check preference is respected
      const isEnabled = await service.checkNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.TRANSACTIONAL,
      );
      expect(isEnabled).toBe(false);

      // Update preference
      const updated = await service.updateNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.TRANSACTIONAL,
        true,
        null,
      );

      expect(updated.enabled).toBe(true);

      // Verify preference is updated
      const isEnabledAfter = await service.checkNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.TRANSACTIONAL,
      );
      expect(isEnabledAfter).toBe(true);
    });

    it('should create organization-specific notification preference', async () => {
      const preference = await service.updateNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.TRANSACTIONAL,
        false,
        testOrganizationId,
      );

      expect(preference).toBeDefined();
      expect(preference.organizationId).toBe(testOrganizationId);
      expect(preference.enabled).toBe(false);

      // Check organization-specific preference
      const isEnabled = await service.checkNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.TRANSACTIONAL,
        testOrganizationId,
      );
      expect(isEnabled).toBe(false);

      // Global preference should still be enabled
      const globalEnabled = await service.checkNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.TRANSACTIONAL,
      );
      expect(globalEnabled).toBe(true);
    });

    it('should get all notification preferences for a user', async () => {
      // Create multiple preferences
      await service.updateNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.TRANSACTIONAL,
        false,
        null,
      );
      await service.updateNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.SYSTEM,
        true,
        null,
      );

      const preferences = await service.getNotificationPreferences(testUserId, null);

      expect(preferences).toBeDefined();
      expect(preferences.length).toBeGreaterThan(0);
      expect(
        preferences.some(
          (p) =>
            p.channel === NotificationChannel.EMAIL && p.type === NotificationType.TRANSACTIONAL,
        ),
      ).toBe(true);
    });

    it('should skip notification when user has disabled preference', async () => {
      // Disable preference
      await service.updateNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.TRANSACTIONAL,
        false,
        null,
      );

      const recipient: NotificationRecipient = {
        type: 'userId',
        userId: testUserId,
      };

      const notifications = await service.sendNotification('otp-verification', recipient, {
        otp: '123456',
        firstName: 'Test',
      });

      // Should not send notification (empty array or skipped)
      expect(notifications.length).toBe(0);

      // Re-enable for other tests
      await service.updateNotificationPreference(
        testUserId,
        NotificationChannel.EMAIL,
        NotificationType.TRANSACTIONAL,
        true,
        null,
      );
    });
  });

  describe('Bulk Notification Sending', () => {
    it('should send bulk notifications to multiple recipients', async () => {
      // Create additional test users
      const user1 = await prisma.user.create({
        data: {
          email: `bulk-test-1-${Date.now()}@example.com`,
          name: 'Bulk Test User 1',
        },
      });
      const user2 = await prisma.user.create({
        data: {
          email: `bulk-test-2-${Date.now()}@example.com`,
          name: 'Bulk Test User 2',
        },
      });

      const recipients: NotificationRecipient[] = [
        { type: 'email', email: user1.email },
        { type: 'email', email: user2.email },
        { type: 'userId', userId: testUserId },
      ];

      const sharedVariables = {
        otp: '999999',
        firstName: 'User',
      };

      const notifications = await service.sendBulkNotification(
        'otp-verification',
        recipients,
        sharedVariables,
        testOrganizationId,
      );

      expect(notifications).toBeDefined();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.length).toBeGreaterThanOrEqual(3); // At least one per recipient

      // Verify all recipients received notifications
      const recipientEmails = [user1.email, user2.email, testUserEmail];
      const sentEmails = notifications
        .map((n) => n.recipientEmail)
        .filter((e) => e !== null) as string[];

      recipientEmails.forEach((email) => {
        expect(sentEmails).toContain(email);
      });

      // Cleanup
      await prisma.notification.deleteMany({
        where: {
          recipientEmail: {
            in: [user1.email, user2.email],
          },
        },
      });
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [user1.id, user2.id],
          },
        },
      });
    });

    it('should continue sending even if one recipient fails', async () => {
      const recipients: NotificationRecipient[] = [
        { type: 'email', email: testUserEmail },
        { type: 'email', email: 'invalid-email-format' }, // Invalid email
        { type: 'userId', userId: 'non-existent-user' }, // Non-existent user
      ];

      const sharedVariables = {
        otp: '888888',
        firstName: 'Test',
      };

      // Should not throw, but may have some failures
      const notifications = await service.sendBulkNotification(
        'otp-verification',
        recipients,
        sharedVariables,
        testOrganizationId,
      );

      // At least one should succeed
      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  describe('Notification History and Queries', () => {
    it('should list notifications with filters', async () => {
      // Send a notification first
      await service.sendNotification(
        'otp-verification',
        { type: 'email', email: testUserEmail },
        { otp: '111111', firstName: 'Test' },
      );

      // Query notifications
      const result = await service.listNotifications({
        userId: testUserId,
        channel: NotificationChannel.EMAIL,
        type: NotificationType.TRANSACTIONAL,
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.notifications).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBeGreaterThan(0);
      expect(result.pagination.totalPages).toBeGreaterThan(0);
    });

    it('should filter notifications by status', async () => {
      const result = await service.listNotifications({
        status: NotificationStatus.SENT,
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      result.notifications.forEach((notification) => {
        expect(notification.status).toBe(NotificationStatus.SENT);
      });
    });

    it('should filter notifications by definition name', async () => {
      const result = await service.listNotifications({
        definitionName: 'otp-verification',
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      result.notifications.forEach((notification) => {
        expect(notification.definitionName).toBe('otp-verification');
      });
    });

    it('should filter notifications by date range', async () => {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 1);
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + 1);

      const result = await service.listNotifications({
        startDate,
        endDate,
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      result.notifications.forEach((notification) => {
        const createdAt = new Date(notification.createdAt);
        expect(createdAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(createdAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should get notification status by ID', async () => {
      // Send a notification
      const notifications = await service.sendNotification(
        'otp-verification',
        { type: 'email', email: testUserEmail },
        { otp: '222222', firstName: 'Test' },
      );

      const notificationId = notifications[0].id;

      // Get notification status
      const notification = await service.getNotificationStatus(notificationId);

      expect(notification).toBeDefined();
      expect(notification.id).toBe(notificationId);
      expect(notification.status).toBe(NotificationStatus.SENT);
    });

    it('should throw error for non-existent notification ID', async () => {
      await expect(service.getNotificationStatus('non-existent-id')).rejects.toThrow();
    });
  });

  describe('Notification Definition Registry', () => {
    it('should have all expected notification definitions registered', async () => {
      const registry = module.get<NotificationDefinitionRegistryService>(
        NotificationDefinitionRegistryService,
      );

      const expectedDefinitions = [
        'user-invitation',
        'invitation-accepted',
        'email-verification',
        'password-reset',
        'password-reset-confirmation',
        'otp-verification',
      ];

      expectedDefinitions.forEach((name) => {
        const definition = registry.get(name);
        expect(definition).toBeDefined();
        expect(definition?.name).toBe(name);
      });
    });

    it('should get notification definition from service', () => {
      const definition = service.getDefinition('otp-verification');

      expect(definition).toBeDefined();
      expect(definition?.name).toBe('otp-verification');
      expect(definition?.channels).toContain(NotificationChannel.EMAIL);
      expect(definition?.type).toBe(NotificationType.TRANSACTIONAL);
    });
  });

  describe('Error Handling', () => {
    it('should handle email sending failures gracefully', async () => {
      // Mock email service to fail
      const originalSend = emailService.sendEmail;
      emailService.sendEmail = jest.fn().mockRejectedValue(new Error('SMTP Error'));

      const recipient: NotificationRecipient = {
        type: 'email',
        email: testUserEmail,
      };

      const notifications = await service.sendNotification('otp-verification', recipient, {
        otp: '333333',
        firstName: 'Test',
      });

      // Should still create notification record with FAILED status
      expect(notifications).toBeDefined();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].status).toBe(NotificationStatus.FAILED);
      expect(notifications[0].errorMessage).toBeDefined();

      // Restore original method
      emailService.sendEmail = originalSend;
    });
  });
});
