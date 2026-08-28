import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { TokenPayload } from '@app-starter/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { JwtUtils } from './jwt.utils';
import { generateUsername } from '../common/utils/slug.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;
  private readonly RESET_TOKEN_EXPIRATION_SECONDS = 3600; // 1 hour

  constructor(
    private prisma: PrismaService,
    private jwtUtils: JwtUtils,
    private redisService: RedisService,
    private configService: ConfigService,
    private moduleRef: ModuleRef,
  ) {}

  /**
   * Set authentication cookies on the response
   */
  async setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): Promise<void> {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const useHttps = this.configService.get<string>('USE_HTTPS') === 'true';
    const isSecure = isProduction || useHttps;
    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');

    const commonOptions = {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? ('none' as const) : ('lax' as const),
      // Unset means a host-only cookie, which is correct for a single-domain
      // deploy. A wrong domain is silently dropped by the browser, so never
      // guess one: only send the attribute when it was configured.
      domain: isProduction ? cookieDomain || undefined : undefined,
      path: '/',
    };

    // Access token cookie
    res.cookie('app_starter_access_token', tokens.accessToken, {
      ...commonOptions,
      maxAge:
        this.jwtUtils.getExpiresInSeconds(
          this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m'),
        ) * 1000,
    });

    // Refresh token cookie
    res.cookie('app_starter_refresh_token', tokens.refreshToken, {
      ...commonOptions,
      maxAge:
        this.jwtUtils.getExpiresInSeconds(
          this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION', '7d'),
        ) * 1000,
    });
  }

  /**
   * Clear authentication cookies
   */
  async clearAuthCookies(res: Response): Promise<void> {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const useHttps = this.configService.get<string>('USE_HTTPS') === 'true';
    const isSecure = isProduction || useHttps;
    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');

    const commonOptions = {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? ('none' as const) : ('lax' as const),
      // Unset means a host-only cookie, which is correct for a single-domain
      // deploy. A wrong domain is silently dropped by the browser, so never
      // guess one: only send the attribute when it was configured.
      domain: isProduction ? cookieDomain || undefined : undefined,
      path: '/',
    };

    res.clearCookie('app_starter_access_token', commonOptions);
    res.clearCookie('app_starter_refresh_token', commonOptions);
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Generate JWT token pair for a user
   */
  async generateTokens(user: {
    id: string;
    email: string;
  }): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
    };

    const tokens = await this.jwtUtils.generateTokenPair(payload);
    const expiresIn = this.jwtUtils.getExpiresInSeconds(
      this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m'),
    );

    // Store refresh token for rotation tracking
    const refreshTokenExpiration = this.jwtUtils.getExpiresInSeconds(
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION', '7d'),
    );
    await this.storeRefreshToken(user.id, tokens.refreshToken, refreshTokenExpiration);

    return {
      ...tokens,
      expiresIn,
    };
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // Slug generation methods removed - now using shared utility

  /**
   * Create a new user
   */
  async createUser(data: {
    email: string;
    password?: string;
    name?: string;
    emailVerifiedAt?: Date;
    intent?: string;
  }) {
    const hashedPassword = data.password ? await this.hashPassword(data.password) : null;

    const nameForSlug = data.name || data.email.split('@')[0];

    // Generate and ensure unique username
    let username = generateUsername(nameForSlug);
    const existingUsername = await this.prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      // Simple collision handling for auto-population
      username = `${username}-${Math.random().toString(36).substring(2, 7)}`;
    }

    // Create user
    // For password signups, emailVerifiedAt should be null (requires verification)
    // For OTP signups, emailVerifiedAt is set immediately (OTP verification implies email verification)
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        username,
        emailVerifiedAt: data.emailVerifiedAt ?? (data.password ? null : new Date()),
      },
    });

    return user;
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Generate a secure password reset token
   */
  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get Redis key for password reset token
   */
  private getResetTokenKey(email: string): string {
    return `password-reset:${email}`;
  }

  /**
   * Store password reset token in Redis
   */
  async storeResetToken(email: string, token: string): Promise<void> {
    const key = this.getResetTokenKey(email);
    await this.redisService.set(key, token, this.RESET_TOKEN_EXPIRATION_SECONDS);
  }

  /**
   * Verify password reset token
   */
  async verifyResetToken(email: string, token: string): Promise<boolean> {
    const key = this.getResetTokenKey(email);
    const storedToken = await this.redisService.get(key);

    if (!storedToken) {
      return false; // Token not found or expired
    }

    // Use constant-time comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(token, 'hex');
    const storedBuffer = Buffer.from(storedToken, 'hex');

    if (tokenBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuffer, storedBuffer);
  }

  /**
   * Delete password reset token after use
   */
  async deleteResetToken(email: string): Promise<void> {
    const key = this.getResetTokenKey(email);
    await this.redisService.del(key);
  }

  /**
   * Update user's password
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Get reset token expiration time in seconds
   */
  getResetTokenExpirationSeconds(): number {
    return this.RESET_TOKEN_EXPIRATION_SECONDS;
  }

  /**
   * Get Redis key for refresh token storage
   */
  private getRefreshTokenKey(userId: string, token: string): string {
    // Hash the token to avoid storing full token in key
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return `refresh:${userId}:${tokenHash}`;
  }

  /**
   * Store refresh token in Redis for rotation tracking
   */
  async storeRefreshToken(userId: string, token: string, expiresIn: number): Promise<void> {
    const key = this.getRefreshTokenKey(userId, token);
    await this.redisService.set(key, '1', expiresIn);
  }

  /**
   * Check if refresh token is valid (exists and not used)
   */
  async isRefreshTokenValid(userId: string, token: string): Promise<boolean> {
    const key = this.getRefreshTokenKey(userId, token);
    const exists = await this.redisService.exists(key);
    return exists === 1;
  }

  /**
   * Invalidate refresh token (mark as used)
   */
  async invalidateRefreshToken(userId: string, token: string): Promise<void> {
    const key = this.getRefreshTokenKey(userId, token);
    await this.redisService.del(key);
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(userId: string, googleProfile: any): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    const data: any = {
      googleId: googleProfile.googleId,
      googleEmail: googleProfile.email,
      googleName: googleProfile.name,
      googlePicture: googleProfile.picture,
      googleLinkedAt: new Date(),
    };

    // If user doesn't have a profile picture, use the Google one
    if (user && !user.avatarUrl && googleProfile.picture) {
      data.avatarUrl = googleProfile.picture;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Create user from Google profile
   */
  async createFromGoogle(googleProfile: any) {
    const nameForSlug = googleProfile.name || googleProfile.email.split('@')[0];

    // Generate and ensure unique username
    let username = generateUsername(nameForSlug);
    const existingUsername = await this.prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      username = `${username}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const user = await this.prisma.user.create({
      data: {
        email: googleProfile.email,
        name: googleProfile.name,
        username,
        googleId: googleProfile.googleId,
        googleEmail: googleProfile.email,
        googleName: googleProfile.name,
        googlePicture: googleProfile.picture,
        avatarUrl: googleProfile.picture, // Set profile picture from Google

        googleLinkedAt: new Date(),
        emailVerifiedAt: new Date(), // Google auth implies verified email
      },
    });

    return user;
  }

  /**
   * Sync Google profile data and ensure profile picture is set
   */
  async syncGoogleProfile(userId: string, googleProfile: any): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!user) return;

    const data: any = {
      googleEmail: googleProfile.email,
      googleName: googleProfile.name,
      googlePicture: googleProfile.picture,
    };

    // If user doesn't have a profile picture, use the Google one
    if (!user.avatarUrl && googleProfile.picture) {
      data.avatarUrl = googleProfile.picture;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
