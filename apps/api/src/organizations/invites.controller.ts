import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrganizationInvitesService } from './organization-invites.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { AcceptInviteResponseDto } from './dto/accept-invite-response.dto';
import { SubmitEmailForInviteDto } from './dto/submit-email-for-invite.dto';
import { SubmitEmailResponseDto } from './dto/submit-email-response.dto';
import { VerifyInviteDto } from './dto/verify-invite.dto';
import { VerifyInviteResponseDto } from './dto/verify-invite-response.dto';
import { TokenPayload } from '@app-starter/shared';

@Controller('invites')
export class InvitesController {
  constructor(private readonly organizationInvitesService: OrganizationInvitesService) {}

  @Post('accept')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async acceptInvite(
    @Request() req: { user: TokenPayload },
    @Body() acceptInviteDto: AcceptInviteDto,
  ): Promise<AcceptInviteResponseDto> {
    const userId = req.user.sub;
    return this.organizationInvitesService.acceptInvite(acceptInviteDto.token, userId);
  }

  @Post(':token/submit-email')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async submitEmailForInvite(
    @Param('token') token: string,
    @Body() submitEmailDto: SubmitEmailForInviteDto,
  ): Promise<SubmitEmailResponseDto> {
    return this.organizationInvitesService.submitEmailForInvite(token, submitEmailDto);
  }

  @Post('verify')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async verifyAndAcceptInvite(
    @Body() verifyInviteDto: VerifyInviteDto,
  ): Promise<VerifyInviteResponseDto> {
    return this.organizationInvitesService.verifyAndAcceptInvite(
      verifyInviteDto.inviteToken,
      verifyInviteDto.verifyToken,
    );
  }

  @Get(':token')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async getInviteByToken(@Param('token') token: string) {
    return this.organizationInvitesService.getInviteByToken(token);
  }
}
