import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload, TokenPair } from '@app-starter/shared';

type SignAccessTokenOptions = {
  expiresIn: string;
};

@Injectable()
export class JwtUtils {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signAccessToken(payload: TokenPayload, options?: SignAccessTokenOptions): Promise<string> {
    const accessTokenExpiration =
      options?.expiresIn ?? this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m');

    const jwtPayload: Record<string, unknown> = {
      sub: payload.sub,
      email: payload.email,
    };

    if (payload.imp) jwtPayload.imp = true;
    if (payload.act) jwtPayload.act = payload.act;
    if (payload.jti) jwtPayload.jti = payload.jti;

    return this.jwtService.signAsync(jwtPayload, {
      expiresIn: accessTokenExpiration,
    } as any);
  }

  async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    const accessTokenExpiration = this.configService.get<string>(
      'JWT_ACCESS_TOKEN_EXPIRATION',
      '15m',
    );
    const refreshTokenExpiration = this.configService.get<string>(
      'JWT_REFRESH_TOKEN_EXPIRATION',
      '7d',
    );

    const jwtPayload = { sub: payload.sub, email: payload.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        expiresIn: accessTokenExpiration,
      } as any),
      this.jwtService.signAsync(jwtPayload, {
        expiresIn: refreshTokenExpiration,
      } as any),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync<TokenPayload>(token);
  }

  getExpiresInSeconds(expiration: string): number {
    // Convert expiration string (e.g., "7d", "30d") to seconds
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60; // Default to 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 7 * 24 * 60 * 60;
    }
  }
}
