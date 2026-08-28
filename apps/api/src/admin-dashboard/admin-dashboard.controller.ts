import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { TokenPayload } from '@app-starter/shared';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminImpersonationService } from '../admin-impersonation/admin-impersonation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GlobalAdminGuard } from '../auth/global-admin.guard';
import { AdminUsersListResponseDto } from './dto/admin-users-list-response.dto';
import { AdminQuarantineUserDto } from './dto/admin-quarantine-user.dto';
import { AdminImpersonateResponseDto } from '../admin-impersonation/dto/admin-impersonate-response.dto';
import { AdminDashboardImpersonateDto } from './dto/admin-dashboard-impersonate.dto';

@ApiTags('admin-dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, GlobalAdminGuard)
export class AdminDashboardController {
  constructor(
    private readonly adminDashboardService: AdminDashboardService,
    private readonly adminImpersonationService: AdminImpersonationService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'List platform users' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async getUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('quarantinedOnly') quarantinedOnly?: string,
  ): Promise<AdminUsersListResponseDto> {
    return this.adminDashboardService.getUsers(
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
      search,
      quarantinedOnly === 'true',
    );
  }

  @Patch('users/:id/quarantine')
  @ApiOperation({ summary: 'Quarantine or unquarantine a user' })
  @ApiResponse({ status: 200, description: 'User quarantine status updated' })
  async quarantineUser(
    @Req() req: Request & { user: TokenPayload },
    @Param('id') id: string,
    @Body() data: AdminQuarantineUserDto,
  ): Promise<void> {
    return this.adminDashboardService.quarantineUser(req.user.sub, id, data);
  }

  @Post('impersonate')
  @ApiOperation({
    summary: 'Mint short-lived token as target user (for web admin impersonation)',
    description:
      'Global admin only. Returns a token and optional redirectUrl to open in a new tab as the target user. ' +
      'Records actor, target, reason, IP, and user agent in audit log.',
  })
  @ApiResponse({ status: 201, type: AdminImpersonateResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 403, description: 'Forbidden (not a global admin)' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  async impersonate(
    @Body() dto: AdminDashboardImpersonateDto,
    @Req() req: Request & { user?: TokenPayload },
  ): Promise<AdminImpersonateResponseDto & { redirectUrl?: string }> {
    const actor = req.user?.email ?? req.user?.sub ?? 'admin-dashboard';
    const reason =
      dto.reason?.trim() && dto.reason.trim().length >= 3 ? dto.reason.trim() : 'Admin dashboard';
    const result = await this.adminImpersonationService.impersonate(
      { targetUserId: dto.targetUserId, reason, actor },
      { ip: this.getIp(req), userAgent: req.headers['user-agent'] },
    );
    const webOrigin =
      process.env.WEB_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${webOrigin}/impersonate?token=${encodeURIComponent(result.accessToken)}`;
    return { ...result, redirectUrl };
  }

  private getIp(req: Request): string | undefined {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
      return xForwardedFor.split(',')[0].trim();
    }
    return req.ip;
  }
}
