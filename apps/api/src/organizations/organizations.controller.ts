import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';

import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { OrganizationsService } from './organizations.service';
import { OrganizationInvitesService } from './organization-invites.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrganizationEmailSettingsDto } from './dto/update-organization-email-settings.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { UserOrganizationsResponseDto } from './dto/user-organizations-response.dto';
import { OrganizationRoleResponseDto } from './dto/organization-role-response.dto';
import { OrganizationUsersResponseDto } from './dto/organization-users-response.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { OrganizationInvitesResponseDto } from './dto/organization-invites-response.dto';
import { CancelInviteResponseDto } from './dto/cancel-invite-response.dto';

import { TokenPayload } from '@app-starter/shared';
import { PublicOrganizationDto } from './dto/public-organization.dto';

@Controller('organizations')
@ApiTags('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly organizationInvitesService: OrganizationInvitesService,
  ) {}

  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  async getPublicOrganizationProfile(@Param('slug') slug: string): Promise<PublicOrganizationDto> {
    return this.organizationsService.getPublicOrganizationProfile(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(
    @Request() req: { user: TokenPayload },
    @Body() createOrganizationDto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const userId = req.user.sub;
    return this.organizationsService.createOrganization(userId, createOrganizationDto);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  async getUserOrganizations(
    @Request() req: { user: TokenPayload },
  ): Promise<UserOrganizationsResponseDto> {
    const userId = req.user.sub;
    return this.organizationsService.getUserOrganizations(userId);
  }

  @Get(':organizationId')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a organization by ID — requires auth but not organization membership',
  })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationById(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.getOrganizationById(organizationId, req.user.sub);
  }

  @Get(':organizationId/role')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  async getUserRoleInOrganization(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
  ): Promise<OrganizationRoleResponseDto> {
    const userId = req.user.sub;
    const role = await this.organizationsService.getUserRoleInOrganization(userId, organizationId);

    return {
      hasAccess: role !== null,
      role: role,
    };
  }

  @Put(':organizationId')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  async updateOrganization(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const userId = req.user.sub;
    return this.organizationsService.updateOrganization(
      userId,
      organizationId,
      updateOrganizationDto,
    );
  }

  @Delete(':organizationId')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a organization — owner only' })
  @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Only the organization owner can delete the organization',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async deleteOrganization(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user.sub;
    return this.organizationsService.deleteOrganization(userId, organizationId);
  }

  @Patch(':organizationId/email-settings')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update organization email settings' })
  @ApiResponse({
    status: 200,
    description: 'Email settings updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateOrganizationEmailSettings(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Body() updateOrganizationEmailSettingsDto: UpdateOrganizationEmailSettingsDto,
  ): Promise<OrganizationResponseDto> {
    const userId = req.user.sub;
    return this.organizationsService.updateOrganizationEmailSettings(
      userId,
      organizationId,
      updateOrganizationEmailSettingsDto,
    );
  }

  @Post(':organizationId/invites')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  async createInvite(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Body() createInviteDto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    const userId = req.user.sub;
    return this.organizationInvitesService.createInvite(
      organizationId,
      userId,
      createInviteDto.email,
      createInviteDto.role,
    );
  }

  @Get(':organizationId/invites')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  async getOrganizationInvites(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Query('status') status?: string,
  ): Promise<OrganizationInvitesResponseDto> {
    const userId = req.user.sub;
    const filter = status === 'pending' ? 'pending' : 'all';
    return this.organizationInvitesService.getOrganizationInvites(organizationId, userId, filter);
  }

  @Post(':organizationId/invites/:inviteId/resend')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async resendOrganizationInvite(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('inviteId') inviteId: string,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    return this.organizationInvitesService.resendInvite(organizationId, inviteId, userId);
  }

  @Delete(':organizationId/invites/:inviteId')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  async cancelInvite(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('inviteId') inviteId: string,
  ): Promise<CancelInviteResponseDto> {
    const userId = req.user.sub;
    return this.organizationInvitesService.cancelInvite(organizationId, inviteId, userId);
  }

  @Get(':organizationId/users')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  async getOrganizationUsers(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
  ): Promise<OrganizationUsersResponseDto> {
    const userId = req.user.sub;
    return this.organizationsService.getOrganizationUsers(organizationId, userId);
  }

  @Patch(':organizationId/users/:userId/role')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  async updateOrganizationUserRole(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('userId') targetUserId: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    const requesterUserId = req.user.sub;
    return this.organizationsService.updateOrganizationUserRole(
      organizationId,
      targetUserId,
      updateUserRoleDto.role,
      requesterUserId,
    );
  }

  @Delete(':organizationId/users/:userId')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  async removeOrganizationUser(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('userId') targetUserId: string,
  ) {
    const requesterUserId = req.user.sub;
    return this.organizationsService.removeOrganizationUser(
      organizationId,
      targetUserId,
      requesterUserId,
    );
  }
}
