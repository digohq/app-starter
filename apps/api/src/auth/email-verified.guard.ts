import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenPayload } from '@app-starter/shared';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: TokenPayload = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if user's email is verified
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { emailVerifiedAt: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('User not found');
    }

    if (!dbUser.emailVerifiedAt) {
      throw new ForbiddenException(
        'Email verification required. Please verify your email address to continue.',
      );
    }

    return true;
  }
}
