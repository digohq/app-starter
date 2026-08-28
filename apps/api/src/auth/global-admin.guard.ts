import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenPayload } from '@app-starter/shared';

@Injectable()
export class GlobalAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: TokenPayload }>();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('Forbidden');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { isGlobalAdmin: true },
    });

    if (!dbUser?.isGlobalAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
