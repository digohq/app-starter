import { Controller, Get, Put, Delete, Param, Query, Request, UseGuards } from '@nestjs/common';
import { InAppNotificationService } from './services/in-app-notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TokenPayload } from '@app-starter/shared';

@Controller('notifications/in-app')
@UseGuards(JwtAuthGuard)
export class InAppNotificationsController {
  constructor(private readonly inAppService: InAppNotificationService) {}

  @Get()
  async getNotifications(
    @Request() req: { user: TokenPayload },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: string,
    @Query('since') since?: string,
  ) {
    return this.inAppService.getNotifications(req.user.sub, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      unreadOnly: unreadOnly === 'true',
      type: type as any,
      since,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: { user: TokenPayload }) {
    const count = await this.inAppService.getUnreadCount(req.user.sub);
    return { count };
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: { user: TokenPayload }) {
    await this.inAppService.markAsRead(id, req.user.sub);
    return { success: true };
  }

  @Put('read-all')
  async markAllAsRead(@Request() req: { user: TokenPayload }) {
    const count = await this.inAppService.markAllAsRead(req.user.sub);
    return { success: true, updatedCount: count };
  }

  @Delete(':id')
  async dismissNotification(@Param('id') id: string, @Request() req: { user: TokenPayload }) {
    await this.inAppService.dismissNotification(id, req.user.sub);
    return { success: true };
  }
}
