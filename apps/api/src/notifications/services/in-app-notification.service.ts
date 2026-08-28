import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationWebSocketGateway } from '../gateways/notification.gateway';
import { InAppNotification } from '@prisma/client';

export interface PaginatedInAppNotifications {
  notifications: InAppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
}

export interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: 'invitation' | 'acceptance' | 'system';
  since?: string;
}

@Injectable()
export class InAppNotificationService {
  constructor(
    private prisma: PrismaService,
    private websocketGateway: NotificationWebSocketGateway,
  ) {}

  async createNotification(
    userId: string,
    type: string, // 'invitation' | 'acceptance' | 'system'
    title: string,
    description: string,
    data: Record<string, any>,
  ): Promise<InAppNotification> {
    const notification = await this.prisma.inAppNotification.create({
      data: {
        userId,
        type,
        title,
        description,
        data,
      },
    });

    // Send real-time notification
    this.websocketGateway.sendNotificationToUser(userId, 'notification:new', {
      notification,
    });

    return notification;
  }

  async getNotifications(
    userId: string,
    options: GetNotificationsOptions,
  ): Promise<PaginatedInAppNotifications> {
    const { page = 1, limit = 20, unreadOnly, type, since } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      dismissed: false,
    };

    if (unreadOnly) {
      where.read = false;
    }

    if (type) {
      where.type = type;
    }

    if (since) {
      where.createdAt = {
        gte: new Date(since),
      };
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.inAppNotification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.inAppNotification.count({ where }),
      this.prisma.inAppNotification.count({
        where: {
          userId,
          dismissed: false,
          read: false,
        },
      }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    // Check ownership
    const notification = await this.prisma.inAppNotification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found or access denied');
    }

    if (notification.read) {
      return;
    }

    const updated = await this.prisma.inAppNotification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    // Notify via websocket about the update
    this.websocketGateway.sendNotificationToUser(userId, 'notification:updated', {
      notificationId,
      read: true,
      readAt: updated.readAt,
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.inAppNotification.updateMany({
      where: {
        userId,
        read: false,
        dismissed: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  async dismissNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.prisma.inAppNotification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found or access denied');
    }

    await this.prisma.inAppNotification.update({
      where: { id: notificationId },
      data: {
        dismissed: true,
        dismissedAt: new Date(),
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.inAppNotification.count({
      where: {
        userId,
        read: false,
        dismissed: false,
      },
    });
  }
}
