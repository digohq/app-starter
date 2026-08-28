import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminImpersonationService } from './admin-impersonation.service';
import { AdminImpersonateDto } from './dto/admin-impersonate.dto';
import { AdminImpersonateResponseDto } from './dto/admin-impersonate-response.dto';
import { ImpersonationApiKeyGuard } from './guards/impersonation-api-key.guard';

@ApiTags('admin')
@Controller('admin')
export class AdminImpersonationController {
  constructor(private readonly adminImpersonationService: AdminImpersonationService) {}

  @Post('impersonate')
  @UseGuards(ImpersonationApiKeyGuard)
  @ApiOperation({
    summary: 'Mint a short-lived access token as a target user',
    description:
      'Protected by IMPERSONATION_API_KEY. Intended for terminal use.\n\nExample:\n' +
      'curl -sS -X POST "$API_URL/admin/impersonate" \\\n' +
      '  -H "Authorization: Bearer $IMPERSONATION_API_KEY" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  -d \'{"targetUserId":"<uuid>","reason":"debugging ticket #123","actor":"<optional label>"}\'',
  })
  @ApiResponse({ status: 201, type: AdminImpersonateResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing/invalid API key)' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  async impersonate(
    @Body() dto: AdminImpersonateDto,
    @Req() req: Request,
  ): Promise<AdminImpersonateResponseDto> {
    const result = await this.adminImpersonationService.impersonate(dto, {
      ip: this.getIp(req),
      userAgent: req.headers['user-agent'],
    });

    return result;
  }

  private getIp(req: Request): string | undefined {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
      return xForwardedFor.split(',')[0].trim();
    }
    return req.ip;
  }
}
