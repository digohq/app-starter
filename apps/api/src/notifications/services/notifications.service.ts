import { Injectable, Logger } from '@nestjs/common';
import { Notification, NotificationStatus, $Enums } from '@prisma/client';
import {
  NotificationRecipient,
  NotificationChannel,
  NotificationType,
  NotificationFilters,
  PaginatedNotifications,
  NotificationContent,
} from '../types/notification.types';
import { NotificationDefinitionRegistryService } from './notification-definition-registry.service';
import { NotificationChannelProvider } from '../interfaces/notification-channel-provider.interface';
import { EmailChannelProvider } from '../providers/email-channel.provider';
import {
  RecipientResolutionException,
  NotificationDefinitionNotFoundException,
} from '../exceptions/notification.exceptions';
import { PrismaService } from '../../prisma/prisma.service';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { emailBrandingStorage } from '../utils/email-branding-storage';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private channelProviders: Map<NotificationChannel, NotificationChannelProvider>;

  constructor(
    private readonly definitionRegistry: NotificationDefinitionRegistryService,
    private readonly emailChannelProvider: EmailChannelProvider,
    private readonly prisma: PrismaService,
    private readonly inAppService: InAppNotificationService,
    private readonly preferenceService: NotificationPreferenceService,
  ) {
    this.channelProviders = new Map();
    this.channelProviders.set(NotificationChannel.EMAIL, emailChannelProvider);
  }

  /**
   * Send a notification using a definition name.
   * @param channelOptions - Optional per-channel options (e.g. email: { replyTo, fromName } for custom sender)
   */
  async sendNotification(
    definitionName: string,
    recipient: NotificationRecipient,
    variables: Record<string, any>,
    organizationId?: string,
    channelOptions?: { email?: { replyTo?: string; fromName?: string } },
  ): Promise<Notification[]> {
    const startTime = Date.now();
    const definition = this.definitionRegistry.get(definitionName);
    if (!definition) {
      this.logger.error(`Notification definition not found: ${definitionName}`);
      throw new NotificationDefinitionNotFoundException(definitionName);
    }

    const resolvedOrganizationId = organizationId;

    let organizationLogoUrl: string | undefined = undefined;
    let organizationName: string | undefined = undefined;
    let hasEmailBranding = false;

    if (resolvedOrganizationId) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: resolvedOrganizationId },
        select: {
          logoUrl: true,
          name: true,
          emailReplyTo: true,
          emailSenderName: true,
        },
      });

      if (organization) {
        organizationName = organization.name;
        hasEmailBranding = !!(organization.emailReplyTo || organization.emailSenderName);
        if (hasEmailBranding && organization.logoUrl) {
          organizationLogoUrl = organization.logoUrl;
        }
      }
    }

    this.logger.log(
      `Sending notification "${definitionName}" to ${recipient.type} recipient on channels: ${definition.channels.join(', ')}`,
    );

    const notifications: Notification[] = [];

    // Send through each channel supported by the definition
    for (const channel of definition.channels) {
      try {
        // Resolve recipient for this channel
        const resolvedRecipient = await this.resolveRecipient(
          recipient,
          channel,
          resolvedOrganizationId,
        );

        this.logger.debug(
          `Resolved recipient for ${definitionName} on ${channel}: ${resolvedRecipient}`,
        );

        // Check user preferences
        const userId = recipient.type === 'userId' ? recipient.userId : undefined;
        if (userId) {
          const shouldSend = await this.preferenceService.shouldReceiveNotification(
            userId,
            definitionName,
            channel,
            resolvedOrganizationId,
          );
          if (!shouldSend) {
            this.logger.log(
              `User ${userId} has disabled notifications for "${definitionName}" on ${channel} channel. Skipping.`,
            );
            continue; // Skip this channel
          }
        }

        // Render template for this channel
        const rendered = await emailBrandingStorage.run(
          {
            logoUrl: organizationLogoUrl,
            logoAlt: organizationLogoUrl ? `${organizationName} Logo` : undefined,
            hasEmailBranding,
          },
          async () => definition.template.render(channel, variables),
        );

        // Create notification content
        const content: NotificationContent = {
          subject: rendered.subject,
          htmlContent: rendered.htmlContent,
          textContent: rendered.textContent,
        };

        // Special handling for IN_APP channel
        if (channel === NotificationChannel.IN_APP) {
          const notificationType = definitionName.includes('invitation')
            ? definitionName.includes('accepted')
              ? 'acceptance'
              : 'invitation'
            : 'system';

          const inAppNotif = await this.inAppService.createNotification(
            resolvedRecipient, // userId
            notificationType,
            rendered.title || 'Notification',
            rendered.textContent || rendered.body || '',
            rendered.data || {},
          );

          // Log to main notification table as well
          // Using strict type casting to satisfy Prisma Enums
          const notification = await this.prisma.notification.create({
            data: {
              type: definition.type as $Enums.NotificationType,
              channel: channel as $Enums.NotificationChannel,
              definitionName: definition.name,
              recipient: recipient as any,
              userId: resolvedRecipient,
              subject: rendered.title,
              variables: variables as any,
              status: NotificationStatus.SENT,
              organizationId: resolvedOrganizationId,
              sentAt: new Date(),
              metadata: { inAppNotificationId: inAppNotif.id },
            },
          });
          notifications.push(notification);

          this.logger.log(
            `Successfully created in-app notification "${definitionName}" for user ${resolvedRecipient}`,
          );
          continue;
        }

        // Get channel provider
        const provider = this.channelProviders.get(channel);
        if (!provider) {
          this.logger.error(
            `No provider found for channel: ${channel}. Skipping notification "${definitionName}".`,
          );
          continue;
        }

        // Send notification (pass channel-specific options, e.g. replyTo for email)
        const channelStartTime = Date.now();
        const options =
          channel === NotificationChannel.EMAIL && channelOptions?.email
            ? channelOptions.email
            : undefined;
        const result = await provider.send(resolvedRecipient, content, options);
        const channelDuration = Date.now() - channelStartTime;

        if (result.success) {
          this.logger.log(
            `Successfully sent notification "${definitionName}" on ${channel} channel to ${resolvedRecipient} in ${channelDuration}ms`,
          );
        } else {
          this.logger.error(
            `Failed to send notification "${definitionName}" on ${channel} channel to ${resolvedRecipient}: ${result.error?.message || 'Unknown error'}`,
          );
        }

        // Determine recipient email/phone for storage
        let recipientEmail: string | null = null;
        let recipientPhone: string | null = null;
        let userIdForRecord: string | null = null;

        if (recipient.type === 'email') {
          recipientEmail = recipient.email;
        } else if (recipient.type === 'phoneNumber') {
          recipientPhone = recipient.phoneNumber;
        } else if (recipient.type === 'userId') {
          userIdForRecord = recipient.userId;
          // Resolved recipient should be email for EMAIL channel
          if (channel === NotificationChannel.EMAIL) {
            recipientEmail = resolvedRecipient;
          } else if (channel === NotificationChannel.SMS) {
            recipientPhone = resolvedRecipient;
          }
        }

        // Create notification record
        const notification = await this.prisma.notification.create({
          data: {
            type: definition.type as $Enums.NotificationType,
            channel: channel as $Enums.NotificationChannel,
            definitionName: definition.name,
            recipient: recipient as any, // Store as JSON
            recipientEmail,
            recipientPhone,
            userId: userIdForRecord,
            subject: rendered.subject,
            variables: variables as any, // Store as JSON
            status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
            providerMessageId: result.messageId,
            organizationId: resolvedOrganizationId,
            sentAt: result.success ? new Date() : null,
            failedAt: result.success ? null : new Date(),
            errorMessage: result.error?.message,
            errorCode: result.error?.code,
          },
        });

        notifications.push(notification);
      } catch (error) {
        if (error instanceof RecipientResolutionException) {
          // IN_APP channel: silently skip if the recipient email has no account yet
          // (expected for external/email-only invitees who haven't registered)
          if (channel === NotificationChannel.IN_APP) {
            this.logger.warn(
              `Skipping notification "${definitionName}" on ${channel} channel: ${error.message}`,
            );
            continue;
          }
          throw error;
        }
        this.logger.error(
          `Error sending notification "${definitionName}" on ${channel} channel: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }

    const totalDuration = Date.now() - startTime;
    this.logger.log(
      `Completed sending notification "${definitionName}" to ${recipient.type} recipient. Sent ${notifications.length} notification(s) in ${totalDuration}ms`,
    );

    return notifications;
  }

  /**
   * Send notification to multiple recipients
   */
  async sendBulkNotification(
    definitionName: string,
    recipients: NotificationRecipient[],
    sharedVariables: Record<string, any>,
    organizationId: string,
  ): Promise<Notification[]> {
    const startTime = Date.now();
    this.logger.log(
      `Starting bulk notification "${definitionName}" to ${recipients.length} recipient(s) for organization ${organizationId}`,
    );

    const allNotifications: Notification[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const recipient of recipients) {
      try {
        const notifications = await this.sendNotification(
          definitionName,
          recipient,
          sharedVariables,
          organizationId,
        );
        allNotifications.push(...notifications);
        successCount++;
      } catch (error) {
        failureCount++;
        this.logger.error(
          `Failed to send bulk notification "${definitionName}" to recipient ${recipient.type}: ${error.message}`,
          error.stack,
        );
        // Continue with other recipients even if one fails
      }
    }

    const totalDuration = Date.now() - startTime;
    this.logger.log(
      `Completed bulk notification "${definitionName}" to ${recipients.length} recipient(s). Success: ${successCount}, Failed: ${failureCount}, Total notifications: ${allNotifications.length}, Duration: ${totalDuration}ms`,
    );

    return allNotifications;
  }

  /**
   * Get notification status
   */
  async getNotificationStatus(notificationId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    return notification;
  }

  /**
   * List notifications with filters
   */
  async listNotifications(filters: NotificationFilters): Promise<PaginatedNotifications> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.channel) {
      where.channel = filters.channel;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.definitionName) {
      where.definitionName = filters.definitionName;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check if user has opted in to notification type
   */
  async checkNotificationPreference(
    userId: string,
    channel: NotificationChannel,
    type: NotificationType,
    organizationId?: string,
  ): Promise<boolean> {
    // First check organization-specific preference
    if (organizationId) {
      const organizationPreference = await this.prisma.notificationPreference.findFirst({
        where: {
          userId,
          organizationId,
          channel: channel as $Enums.NotificationChannel,
          type: type as $Enums.NotificationType,
        },
      });

      if (organizationPreference !== null) {
        return organizationPreference.enabled;
      }
    }

    // Check global preference (organizationId is null)
    const globalPreference = await this.prisma.notificationPreference.findFirst({
      where: {
        userId,
        organizationId: null,
        channel: channel as $Enums.NotificationChannel,
        type: type as $Enums.NotificationType,
      },
    });

    if (globalPreference !== null) {
      return globalPreference.enabled;
    }

    // Default to enabled if no preference is set
    return true;
  }

  /**
   * Update or create notification preference.
   * Uses findFirst + create/update because Prisma upsert does not support null in compound unique keys.
   */
  async updateNotificationPreference(
    userId: string,
    channel: NotificationChannel,
    type: NotificationType,
    enabled: boolean,
    organizationId: string | null,
  ) {
    const prismaChannel = channel as $Enums.NotificationChannel;
    const prismaType = type as $Enums.NotificationType;

    const existing = await this.prisma.notificationPreference.findFirst({
      where: {
        userId,
        organizationId: organizationId ?? null,
        channel: prismaChannel,
        type: prismaType,
        definitionName: null,
      },
    });

    if (existing) {
      return this.prisma.notificationPreference.update({
        where: { id: existing.id },
        data: { enabled },
      });
    }

    return this.prisma.notificationPreference.create({
      data: {
        userId,
        organizationId: organizationId ?? null,
        channel: prismaChannel,
        type: prismaType,
        enabled,
        definitionName: null,
      },
    });
  }

  /**
   * Get all notification preferences for a user
   */
  async getNotificationPreferences(userId: string, organizationId: string | null) {
    return this.prisma.notificationPreference.findMany({
      where: {
        userId,
        organizationId: organizationId || null,
      },
    });
  }

  /**
   * Get notification definition
   */
  getDefinition(name: string) {
    return this.definitionRegistry.get(name);
  }

  /**
   * Resolve recipient to actual contact information
   */
  async resolveRecipient(
    recipient: NotificationRecipient,
    channel: NotificationChannel,
    _organizationId?: string,
  ): Promise<string> {
    // Priority: userId > email > phoneNumber
    if (recipient.type === 'userId') {
      const user = await this.prisma.user.findUnique({
        where: { id: recipient.userId },
        select: {
          id: true,
          email: true,
          // phoneNumber: true, // Add when phone number is added to User model
        },
      });

      if (!user) {
        throw new RecipientResolutionException(
          recipient,
          `User with ID ${recipient.userId} not found`,
        );
      }

      // For EMAIL channel, require email
      if (channel === NotificationChannel.EMAIL) {
        if (!user.email) {
          throw new RecipientResolutionException(
            recipient,
            `User ${recipient.userId} does not have an email address`,
          );
        }
        return user.email;
      }

      // For SMS channel, require phone (not implemented yet)
      if (channel === NotificationChannel.SMS) {
        throw new RecipientResolutionException(recipient, 'SMS channel is not yet implemented');
      }

      if (channel === NotificationChannel.IN_APP) {
        return recipient.userId; // Return userId directly
      }

      throw new RecipientResolutionException(
        recipient,
        `Channel ${channel} is not supported for userId recipient`,
      );
    }

    if (recipient.type === 'email') {
      if (channel === NotificationChannel.IN_APP) {
        const user = await this.prisma.user.findUnique({
          where: { email: recipient.email },
          select: { id: true },
        });
        if (!user) {
          throw new RecipientResolutionException(
            recipient,
            `User with email ${recipient.email} not found for in-app notification`,
          );
        }
        return user.id;
      }

      if (channel !== NotificationChannel.EMAIL) {
        throw new RecipientResolutionException(
          recipient,
          `Email recipient can only be used with EMAIL channel, not ${channel}`,
        );
      }
      return recipient.email;
    }

    if (recipient.type === 'phoneNumber') {
      if (channel !== NotificationChannel.SMS) {
        throw new RecipientResolutionException(
          recipient,
          `Phone number recipient can only be used with SMS channel, not ${channel}`,
        );
      }
      // SMS not implemented yet
      throw new RecipientResolutionException(recipient, 'SMS channel is not yet implemented');
    }

    throw new RecipientResolutionException(recipient, 'Invalid recipient type');
  }
}
