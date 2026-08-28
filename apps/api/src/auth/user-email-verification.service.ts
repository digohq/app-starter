import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import * as crypto from 'crypto';

@Injectable()
export class UserEmailVerificationService {
  private readonly logger = new Logger(UserEmailVerificationService.name);
  private readonly VERIFICATION_EXPIRATION_HOURS = 24;

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate secure verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Calculate expiration date for verification (24 hours from now)
   */
  private getVerificationExpirationDate(): Date {
    const date = new Date();
    date.setHours(date.getHours() + this.VERIFICATION_EXPIRATION_HOURS);
    return date;
  }

  /**
   * Check if verification is expired
   */
  private isVerificationExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Get frontend URL for verification links
   */
  private getFrontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  /**
   * Create and send email verification for a user
   */
  async createAndSendVerification(
    userId: string,
    email: string,
    name?: string,
    redirectUrl?: string,
  ): Promise<void> {
    // Check if user already has a pending verification
    const existingVerification = await this.prisma.userEmailVerification.findFirst({
      where: {
        userId,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let verificationToken: string;

    if (existingVerification) {
      // Reuse existing token if it's still valid
      verificationToken = existingVerification.token;
      this.logger.log(`Reusing existing verification token for user: ${userId}`);
    } else {
      // Generate new verification token
      let attempts = 0;
      const maxAttempts = 5;
      let newToken: string | undefined;

      while (attempts < maxAttempts) {
        newToken = this.generateVerificationToken();
        const existing = await this.prisma.userEmailVerification.findUnique({
          where: { token: newToken },
        });

        if (!existing) {
          break;
        }

        attempts++;
      }

      if (attempts >= maxAttempts || !newToken) {
        throw new HttpException(
          'Failed to generate unique verification token',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      verificationToken = newToken;

      // Create verification record
      const expiresAt = this.getVerificationExpirationDate();
      await this.prisma.userEmailVerification.create({
        data: {
          userId,
          token: verificationToken,
          email,
          expiresAt,
        },
      });
    }

    // Send verification email
    const frontendUrl = this.getFrontendUrl();
    let verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    if (redirectUrl) {
      verificationUrl += `&redirect=${encodeURIComponent(redirectUrl)}`;
    }

    try {
      await this.notificationsService.sendNotification(
        'email-verification',
        { type: 'email', email },
        {
          firstName: name?.split(' ')[0] || 'there',
          verificationUrl,
        },
      );
      this.logger.log(`Verification email sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to: ${email}`, error);
      throw new HttpException(
        'Failed to send verification email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<{ userId: string; email: string }> {
    // Find verification record
    const verification = await this.prisma.userEmailVerification.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailVerifiedAt: true,
          },
        },
      },
    });

    if (!verification) {
      throw new HttpException('Invalid verification token', HttpStatus.BAD_REQUEST);
    }

    // Check if already used
    if (verification.usedAt) {
      throw new HttpException('Verification token has already been used', HttpStatus.BAD_REQUEST);
    }

    // Check if expired
    if (this.isVerificationExpired(verification.expiresAt)) {
      throw new HttpException('Verification token has expired', HttpStatus.BAD_REQUEST);
    }

    // Verify email matches
    if (verification.email !== verification.user.email) {
      throw new HttpException('Email mismatch', HttpStatus.BAD_REQUEST);
    }

    // Use transaction to mark verification as used and update user
    const result = await this.prisma.$transaction(async (tx) => {
      // Mark verification as used
      await tx.userEmailVerification.update({
        where: { id: verification.id },
        data: {
          usedAt: new Date(),
        },
      });

      // Update user's emailVerifiedAt if not already set
      const updatedUser = await tx.user.update({
        where: { id: verification.userId },
        data: {
          emailVerifiedAt: verification.user.emailVerifiedAt || new Date(),
        },
        select: {
          id: true,
          email: true,
        },
      });

      return updatedUser;
    });

    this.logger.log(`Email verified for user: ${result.email} (${result.id})`);

    return {
      userId: result.id,
      email: result.email,
    };
  }

  /**
   * Resend verification email
   */
  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.emailVerifiedAt) {
      throw new HttpException('Email is already verified', HttpStatus.BAD_REQUEST);
    }

    await this.createAndSendVerification(user.id, user.email, user.name || undefined);
  }
}
