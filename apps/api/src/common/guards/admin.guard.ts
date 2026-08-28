import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.email) {
      throw new ForbiddenException('User context missing');
    }

    const adminEmailsStr = this.configService.get<string>('ADMIN_EMAILS');

    // If no admin emails configured, deny access by default for security
    // UNLESS in purely development mode and specific explicit override is present?
    // We stick to secure default.
    if (!adminEmailsStr) {
      // For development convenience, we might want to log a warning
      // console.warn('ADMIN_EMAILS not configured, admin access denied');
      throw new ForbiddenException('Admin configuration missing');
    }

    const adminEmails = adminEmailsStr.split(',').map((e) => e.trim());

    if (adminEmails.includes(user.email)) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}
