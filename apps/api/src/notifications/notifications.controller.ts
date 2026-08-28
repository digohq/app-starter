import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import {
  UpdateNotificationPreferencesDto,
  BulkUpdateNotificationPreferencesDto,
} from './dto/notification-preferences.dto';
import {
  NotificationFilters,
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from './types/notification.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TokenPayload } from '@app-starter/shared';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferenceService: NotificationPreferenceService,
  ) {}

  /**
   * Send a notification
   */
  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  async sendNotification(
    @Body() dto: SendNotificationDto,
    @Request() _req: { user: TokenPayload },
  ): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationsService.sendNotification(
      dto.definitionName,
      dto.recipient,
      dto.variables,
      dto.organizationId,
    );

    return notifications.map(this.mapNotificationToDto);
  }

  /**
   * List notifications with filters
   */
  @Get()
  async listNotifications(
    @Request() req: { user: TokenPayload },
    @Query('userId') userId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('channel') channel?: NotificationChannel,
    @Query('type') type?: NotificationType,
    @Query('status') status?: NotificationStatus,
    @Query('definitionName') definitionName?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: NotificationFilters = {
      userId: userId || req.user.sub,
      organizationId,
      channel,
      type,
      status,
      definitionName,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const result = await this.notificationsService.listNotifications(filters);

    return {
      notifications: result.notifications.map(this.mapNotificationToDto),
      pagination: result.pagination,
    };
  }

  /**
   * Get notification preferences
   */
  @Get('preferences')
  async getNotificationPreferences(
    @Request() req: { user: TokenPayload },
    @Query('organizationId') organizationId?: string,
    @Query('includeDefaults') includeDefaults?: string,
  ) {
    const preferences = await this.preferenceService.getUserPreferences(
      req.user.sub,
      organizationId,
      includeDefaults !== 'false',
    );

    return { preferences };
  }

  /**
   * Get notification categories
   */
  @Get('preferences/categories')
  async getNotificationCategories() {
    const categories = await this.preferenceService.getNotificationCategories();
    return { categories };
  }

  /**
   * Update notification preferences
   */
  @Put('preferences')
  async updateNotificationPreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @Request() req: { user: TokenPayload },
  ) {
    return this.preferenceService.updateUserPreferences(
      req.user.sub,
      dto.preferences,
      dto.organizationId,
    );
  }

  /**
   * Bulk update notification preferences
   */
  @Put('preferences/bulk')
  async bulkUpdatePreferences(
    @Body() dto: BulkUpdateNotificationPreferencesDto,
    @Request() req: { user: TokenPayload },
  ) {
    return this.preferenceService.bulkUpdatePreferences(req.user.sub, dto.action, {
      category: dto.category,
      channels: dto.channels,
      enabled: dto.enabled,
      organizationId: dto.organizationId,
    });
  }

  /**
   * Get notification status
   */
  @Get(':id')
  async getNotificationStatus(@Param('id') id: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.getNotificationStatus(id);
    return this.mapNotificationToDto(notification);
  }

  /**
   * Map notification to DTO
   */
  private mapNotificationToDto(notification: any): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type as NotificationType,
      channel: notification.channel as NotificationChannel,
      status: notification.status as NotificationStatus,
      definitionName: notification.definitionName,
      subject: notification.subject,
      recipientEmail: notification.recipientEmail,
      recipientPhone: notification.recipientPhone,
      sentAt: notification.sentAt?.toISOString() || null,
      failedAt: notification.failedAt?.toISOString() || null,
      errorMessage: notification.errorMessage,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    };
  }
}
