import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class ImpersonationApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const configuredKey = this.configService.get<string>('IMPERSONATION_API_KEY');
    if (!configuredKey) {
      throw new UnauthorizedException('Impersonation API key not configured');
    }

    const authHeader = (request.headers?.authorization ?? request.headers?.Authorization) as
      | string
      | undefined;
    const bearerToken = this.extractBearerToken(authHeader);
    const headerKey = (request.headers?.['x-impersonation-key'] ??
      request.headers?.['X-Impersonation-Key']) as string | undefined;

    const providedKey = bearerToken ?? headerKey;
    if (!providedKey) {
      throw new UnauthorizedException('Impersonation API key required');
    }

    const matches = this.timingSafeEquals(providedKey, configuredKey);
    if (!matches) {
      throw new UnauthorizedException('Invalid impersonation API key');
    }

    return true;
  }

  private extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() ? match[1].trim() : null;
  }

  private timingSafeEquals(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  }
}
