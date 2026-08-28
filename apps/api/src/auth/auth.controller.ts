import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
  Logger,
  Request,
  Get,
  Res,
  Req,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtUtils } from './jwt.utils';
import { OtpService } from '../otp/otp.service';
// EmailService removed
import { NotificationsService } from '../notifications/services/notifications.service';
import { UserEmailVerificationService } from './user-email-verification.service';
import { SignUpDto } from './dto/sign-up.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { SignUpWithOtpDto } from './dto/sign-up-otp.dto';
import { LoginOtpDto } from './dto/login-otp.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { TokenPayload } from '@app-starter/shared';
import {
  EmailAlreadyExistsException,
  InvalidCredentialsException,
  InvalidOtpException,
  InvalidRefreshTokenException,
  WeakPasswordException,
} from './exceptions/auth.exceptions';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private jwtUtils: JwtUtils,
    private otpService: OtpService,
    private notificationsService: NotificationsService,
    private userEmailVerificationService: UserEmailVerificationService,
    private configService: ConfigService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(
    @Body() signUpDto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    // Validate password strength first (fast validation before DB query)
    if (!this.isPasswordStrong(signUpDto.password)) {
      this.logger.warn(`Signup attempt with weak password for: ${signUpDto.email}`);
      throw new WeakPasswordException();
    }

    // Check if email already exists (don't reveal if account exists for security)
    const existingUser = await this.authService.findByEmail(signUpDto.email);

    // If account already exists, verify password to prevent enumeration
    // If password matches, treat it as a login and return tokens
    // If password doesn't match, return success without revealing account exists
    // This prevents account enumeration attacks while maintaining security
    if (existingUser) {
      this.logger.warn(`Signup attempt with existing email: ${signUpDto.email}`);

      // Verify password if account has one
      if (existingUser.password) {
        const passwordMatches = await this.authService.verifyPassword(
          signUpDto.password,
          existingUser.password,
        );

        // If password matches, treat as login and return tokens
        if (passwordMatches) {
          await this.authService.updateLastLogin(existingUser.id);
          const tokens = await this.authService.generateTokens({
            id: existingUser.id,
            email: existingUser.email,
          });

          // Set authentication cookies
          await this.authService.setAuthCookies(res, tokens);

          return {
            user: {
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name || null,
              googleId: existingUser.googleId || null,
              avatarUrl: existingUser.avatarUrl || null,
            },
            ...tokens,
          };
        }
      }

      // Password doesn't match or account has no password
      // Return success response to prevent enumeration, but don't return valid tokens
      // Generate tokens for a dummy user ID that won't validate
      // This maintains API contract while preventing enumeration
      const dummyId = '00000000-0000-0000-0000-000000000000';
      const dummyTokens = await this.authService.generateTokens({
        id: dummyId,
        email: signUpDto.email,
      });

      // Immediately invalidate the refresh token to prevent use
      await this.authService.invalidateRefreshToken(dummyId, dummyTokens.refreshToken);

      return {
        user: {
          id: dummyId,
          email: signUpDto.email,
          name: signUpDto.name || null,
        },
        ...dummyTokens,
      };
    }

    // Account doesn't exist - proceed with signup
    // Create user (emailVerifiedAt will be null for password signups)
    const user = await this.authService.createUser({
      email: signUpDto.email,
      password: signUpDto.password,
      name: signUpDto.name,
      intent: signUpDto.intent,
    });

    // Send email verification
    try {
      await this.userEmailVerificationService.createAndSendVerification(
        user.id,
        user.email,
        user.name || undefined,
        signUpDto.redirectUrl,
      );
    } catch (error) {
      this.logger.error(`Failed to send verification email for: ${user.email}`, error);
      // Continue with signup even if email sending fails - user can request resend
    }

    // Generate tokens (user can still log in, but will need to verify email to use app)
    const tokens = await this.authService.generateTokens({
      id: user.id,
      email: user.email,
    });

    // Set authentication cookies
    await this.authService.setAuthCookies(res, tokens);

    this.logger.log(
      `User signed up successfully: ${user.email} (${user.id}) - verification email sent`,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        googleId: user.googleId || null,
        avatarUrl: user.avatarUrl || null,
      },
      ...tokens,
    };
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    // Find user
    const user = await this.authService.findByEmail(loginDto.email);
    if (!user || !user.password) {
      this.logger.warn(`Failed login attempt: ${loginDto.email} (user not found or no password)`);
      throw new InvalidCredentialsException();
    }

    // Verify password
    const isValid = await this.authService.verifyPassword(loginDto.password, user.password);
    if (!isValid) {
      this.logger.warn(`Failed login attempt: ${loginDto.email} (invalid password)`);
      throw new InvalidCredentialsException();
    }

    // Update last login
    await this.authService.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.authService.generateTokens({
      id: user.id,
      email: user.email,
    });

    // Set authentication cookies
    await this.authService.setAuthCookies(res, tokens);

    this.logger.log(`User logged in successfully: ${user.email} (${user.id})`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        googleId: user.googleId || null,
        avatarUrl: user.avatarUrl || null,
      },
      ...tokens,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    try {
      const refreshToken = refreshTokenDto.refreshToken || req.cookies['app_starter_refresh_token'];

      if (!refreshToken) {
        this.logger.warn('Refresh attempt without token (body or cookie)');
        throw new InvalidRefreshTokenException();
      }

      // Verify refresh token
      const payload = await this.jwtUtils.verifyToken(refreshToken);

      // Check if refresh token has been used (token rotation)
      const isTokenValid = await this.authService.isRefreshTokenValid(payload.sub, refreshToken);
      if (!isTokenValid) {
        this.logger.warn(`Invalid or reused refresh token for user: ${payload.sub}`);
        throw new InvalidRefreshTokenException();
      }

      // Find user
      const user = await this.authService.findByEmail(payload.email);
      if (!user) {
        this.logger.warn(`Refresh token for non-existent user: ${payload.email}`);
        throw new InvalidRefreshTokenException();
      }

      // Invalidate old refresh token
      await this.authService.invalidateRefreshToken(payload.sub, refreshToken);

      // Generate new tokens
      const tokens = await this.authService.generateTokens({
        id: user.id,
        email: user.email,
      });

      // Store new refresh token
      await this.authService.storeRefreshToken(
        user.id,
        tokens.refreshToken,
        this.jwtUtils.getExpiresInSeconds(
          this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION', '7d'),
        ),
      );

      // Set authentication cookies
      await this.authService.setAuthCookies(res, tokens);

      this.logger.log(`Token refreshed for user: ${user.email} (${user.id})`);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          googleId: user.googleId || null,
          avatarUrl: user.avatarUrl || null,
        },
        ...tokens,
      };
    } catch (error) {
      if (error instanceof InvalidRefreshTokenException) {
        throw error;
      }
      this.logger.warn(
        'Invalid refresh token attempt',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InvalidRefreshTokenException();
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req: { user: TokenPayload },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    // Blacklist the access token (extract from Authorization header)
    // Note: For full token blacklisting, we'd need to extract the token from the request
    // This is a simplified version - full implementation would require middleware

    // Clear authentication cookies
    await this.authService.clearAuthCookies(res);

    this.logger.log(`User logged out: ${req.user.email} (${req.user.sub})`);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: { user: TokenPayload }): Promise<AuthResponseDto['user']> {
    const user = await this.authService.findById(req.user.sub);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      googleId: user.googleId || null,
      avatarUrl: user.avatarUrl || null,
    };
  }

  @Post('otp/request')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async requestOtp(
    @Body() requestOtpDto: RequestOtpDto,
  ): Promise<{ message: string; expiresIn: number }> {
    // Check if email already exists (don't reveal if account exists for security)
    const existingUser = await this.authService.findByEmail(requestOtpDto.email);
    if (existingUser) {
      throw new EmailAlreadyExistsException();
    }

    // Check rate limit
    const rateLimitExceeded = await this.otpService.checkRateLimit(requestOtpDto.email);
    if (rateLimitExceeded) {
      throw new HttpException(
        'Too many requests. Please try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Generate and store OTP
    const otp = await this.otpService.createOtp(requestOtpDto.email);

    // Send OTP via email using notifications service
    await this.notificationsService.sendNotification(
      'otp-verification',
      { type: 'email', email: requestOtpDto.email },
      {
        otp,
        firstName: 'there',
      },
    );

    return {
      message: 'Verification code sent to your email',
      expiresIn: this.otpService.getExpirationSeconds(),
    };
  }

  @Post('otp/request-login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async requestOtpForLogin(
    @Body() requestOtpDto: RequestOtpDto,
  ): Promise<{ message: string; expiresIn: number }> {
    // Check if user exists (required for login)
    const existingUser = await this.authService.findByEmail(requestOtpDto.email);
    if (!existingUser) {
      throw new InvalidCredentialsException();
    }

    // Check rate limit
    const rateLimitExceeded = await this.otpService.checkRateLimit(requestOtpDto.email);
    if (rateLimitExceeded) {
      throw new HttpException(
        'Too many requests. Please try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Generate and store OTP
    const otp = await this.otpService.createOtp(requestOtpDto.email);

    // Send OTP via email using notifications service
    await this.notificationsService.sendNotification(
      'otp-verification',
      { type: 'email', email: requestOtpDto.email },
      {
        otp,
        firstName: existingUser.name?.split(' ')[0] || 'there',
      },
    );

    return {
      message: 'Verification code sent to your email',
      expiresIn: this.otpService.getExpirationSeconds(),
    };
  }

  @Post('signup/otp')
  @HttpCode(HttpStatus.CREATED)
  async signUpWithOtp(
    @Body() signUpOtpDto: SignUpWithOtpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    // Verify OTP
    const isValid = await this.otpService.verifyOtp(signUpOtpDto.email, signUpOtpDto.otp);
    if (!isValid) {
      this.logger.warn(`Failed OTP signup attempt: ${signUpOtpDto.email} (invalid OTP)`);
      throw new InvalidOtpException();
    }

    // Check if email already exists
    const existingUser = await this.authService.findByEmail(signUpOtpDto.email);
    if (existingUser) {
      this.logger.warn(`OTP signup attempt with existing email: ${signUpOtpDto.email}`);
      throw new EmailAlreadyExistsException();
    }

    // Create user (no password for OTP signup)
    const user = await this.authService.createUser({
      email: signUpOtpDto.email,
      name: signUpOtpDto.name,
      emailVerifiedAt: new Date(), // OTP verification implies email verification
      intent: signUpOtpDto.intent,
    });

    // Generate tokens
    const tokens = await this.authService.generateTokens({
      id: user.id,
      email: user.email,
    });

    // Set authentication cookies
    await this.authService.setAuthCookies(res, tokens);

    this.logger.log(`User signed up via OTP: ${user.email} (${user.id})`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        googleId: user.googleId || null,
        avatarUrl: user.avatarUrl || null,
      },
      ...tokens,
    };
  }

  @Post('login/otp')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async loginWithOtp(
    @Body() loginOtpDto: LoginOtpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    // Verify OTP
    const isValid = await this.otpService.verifyOtp(loginOtpDto.email, loginOtpDto.otp);
    if (!isValid) {
      this.logger.warn(`Failed OTP login attempt: ${loginOtpDto.email} (invalid OTP)`);
      throw new InvalidOtpException();
    }

    // Find user
    // Security: Always throw InvalidOtpException (not InvalidCredentialsException) if user doesn't exist
    // to prevent account enumeration. This makes the response identical whether OTP is invalid
    // or user doesn't exist.
    const user = await this.authService.findByEmail(loginOtpDto.email);
    if (!user) {
      this.logger.warn(`Failed OTP login attempt: ${loginOtpDto.email} (user not found)`);
      throw new InvalidOtpException();
    }

    // Update last login
    await this.authService.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.authService.generateTokens({
      id: user.id,
      email: user.email,
    });

    // Set authentication cookies
    await this.authService.setAuthCookies(res, tokens);

    this.logger.log(`User logged in via OTP: ${user.email} (${user.id})`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        googleId: user.googleId || null,
        avatarUrl: user.avatarUrl || null,
      },
      ...tokens,
    };
  }

  @Post('password-reset/request')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    // Find user (don't reveal if account exists for security)
    const user = await this.authService.findByEmail(requestPasswordResetDto.email);

    // If user doesn't exist, return success to prevent email enumeration
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${requestPasswordResetDto.email}`,
      );
      return {
        message: 'If an account exists with this email, a password reset link has been sent',
      };
    }

    // Generate reset token (allow reset even if user doesn't have password set yet)
    const resetToken = this.authService.generateResetToken();
    await this.authService.storeResetToken(requestPasswordResetDto.email, resetToken);

    // Build reset URL
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?email=${encodeURIComponent(requestPasswordResetDto.email)}&token=${resetToken}`;

    // Send password reset email using notifications service
    await this.notificationsService.sendNotification(
      'password-reset',
      { type: 'email', email: requestPasswordResetDto.email },
      { resetUrl },
    );

    this.logger.log(`Password reset requested for user: ${user.email} (${user.id})`);

    return { message: 'If an account exists with this email, a password reset link has been sent' };
  }

  @Post('password-reset/reset')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    // Validate password strength
    if (!this.isPasswordStrong(resetPasswordDto.password)) {
      this.logger.warn(`Password reset attempt with weak password for: ${resetPasswordDto.email}`);
      throw new WeakPasswordException();
    }

    // Verify reset token
    const isValid = await this.authService.verifyResetToken(
      resetPasswordDto.email,
      resetPasswordDto.token,
    );
    if (!isValid) {
      this.logger.warn(`Invalid password reset token for: ${resetPasswordDto.email}`);
      throw new HttpException('Invalid or expired reset token', HttpStatus.BAD_REQUEST);
    }

    // Find user
    const user = await this.authService.findByEmail(resetPasswordDto.email);
    if (!user) {
      this.logger.warn(`Password reset for non-existent user: ${resetPasswordDto.email}`);
      throw new InvalidCredentialsException();
    }

    // Update or set password (works for users with or without existing password)
    await this.authService.updatePassword(user.id, resetPasswordDto.password);

    // Delete reset token
    await this.authService.deleteResetToken(resetPasswordDto.email);

    this.logger.log(`Password reset successfully for user: ${user.email} (${user.id})`);

    return { message: 'Password has been reset successfully' };
  }

  @Post('verify-email')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    await this.userEmailVerificationService.verifyEmail(verifyEmailDto.token);
    return { message: 'Email verified successfully' };
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Request() req: { user: TokenPayload }): Promise<{ message: string }> {
    await this.userEmailVerificationService.resendVerification(req.user.sub);
    return { message: 'Verification email sent' };
  }

  /**
   * Validate password strength
   * Requirements:
   * - Minimum 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   * - At least one special character
   */
  private isPasswordStrong(password: string): boolean {
    if (password.length < 8) {
      return false;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);

    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  }

  @Get('google')
  @UseGuards(ThrottlerGuard, GoogleAuthGuard)
  async googleAuth() {
    // Guard initiates the Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(ThrottlerGuard, GoogleAuthGuard)
  async googleAuthRedirect(@Request() req: any, @Res() res: any) {
    const { user: googleUser } = req;
    const state = req.query.state;

    // 1. Check if user with googleId exists
    let user = await this.authService.findByGoogleId(googleUser.googleId);

    if (!user) {
      // 2. Check by email
      const existingUser = await this.authService.findByEmail(googleUser.email);
      if (existingUser) {
        // Link
        await this.authService.linkGoogleAccount(existingUser.id, googleUser);
        user = existingUser;
      } else {
        // Create
        user = await this.authService.createFromGoogle(googleUser);
      }
    } else {
      // Sync Google profile for existing users (updates picture if missing)
      await this.authService.syncGoogleProfile(user.id, googleUser);
    }

    // 3. Generate tokens
    const tokens = await this.authService.generateTokens({
      id: user.id,
      email: user.email,
    });

    // Set authentication cookies
    await this.authService.setAuthCookies(res, tokens);

    // 4. Redirect to frontend with tokens and state
    const defaultFrontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3010',
    );
    let redirectBaseUrl = defaultFrontendUrl;
    let finalState = state;

    // Try to parse encoded state to get original origin
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        if (decodedState.origin) {
          redirectBaseUrl = decodedState.origin;
        }
        if (decodedState.appState) {
          finalState = decodedState.appState;
        } else {
          finalState = undefined;
        }
      } catch {
        this.logger.warn(`Failed to parse Google auth state: ${state}`);
      }
    }

    let redirectPath = `${redirectBaseUrl}/auth/google/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

    if (finalState) {
      redirectPath += `&state=${encodeURIComponent(finalState)}`;
    }

    res.redirect(redirectPath);
  }
}
