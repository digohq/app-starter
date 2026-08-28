import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtUtils } from '../auth/jwt.utils';
import { PrismaService } from '../prisma/prisma.service';
import { AdminImpersonateDto } from './dto/admin-impersonate.dto';
import * as crypto from 'crypto';

@Injectable()
export class AdminImpersonationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtUtils: JwtUtils,
    private readonly configService: ConfigService,
  ) {}

  async impersonate(input: AdminImpersonateDto, requestMeta: { ip?: string; userAgent?: string }) {
    const reason = input.reason?.trim();
    if (!reason || reason.length < 3) {
      throw new BadRequestException('reason must be at least 3 characters');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: input.targetUserId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const actor =
      input.actor?.trim() ||
      this.configService.get<string>('IMPERSONATION_ACTOR_LABEL') ||
      'production-operator';

    const expiration =
      this.configService.get<string>('JWT_IMPERSONATION_ACCESS_TOKEN_EXPIRATION') || '10m';
    const expiresIn = this.jwtUtils.getExpiresInSeconds(expiration);

    const jti = crypto.randomUUID();

    const accessToken = await this.jwtUtils.signAccessToken(
      {
        sub: user.id,
        email: user.email,
        imp: true,
        act: actor,
        jti,
      },
      { expiresIn: expiration },
    );

    await this.prisma.adminImpersonationAudit.create({
      data: {
        actor,
        targetUserId: user.id,
        reason,
        jti,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
      },
    });

    return { accessToken, expiresIn, tokenType: 'Bearer' as const };
  }
}
