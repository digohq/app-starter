import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtUtils } from './jwt.utils';
import { OtpService } from '../otp/otp.service';
import { EmailService } from '../email/email.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { UserEmailVerificationService } from './user-email-verification.service';
import { InvalidCredentialsException, WeakPasswordException } from './exceptions/auth.exceptions';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        PrismaModule,
        JwtModule.register({
          secret: 'test-secret-key-for-testing-only',
          signOptions: { algorithm: 'HS256' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtUtils,
        ConfigService,
        {
          provide: OtpService,
          useValue: {
            createOtp: jest.fn().mockResolvedValue('123456'),
            verifyOtp: jest.fn().mockResolvedValue(true),
            checkRateLimit: jest.fn().mockResolvedValue(false),
            getExpirationSeconds: jest.fn().mockReturnValue(600),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendOtpEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn().mockResolvedValue(undefined),
            get: jest.fn().mockResolvedValue(null),
            del: jest.fn().mockResolvedValue(undefined),
            exists: jest.fn().mockResolvedValue(0),
            getClient: jest
              .fn()
              .mockReturnValue({ set: jest.fn(), get: jest.fn(), del: jest.fn() }),
          },
        },
        {
          provide: NotificationsService,
          useValue: { notifyUserCreated: jest.fn(), notifyEmailVerified: jest.fn() },
        },
        {
          provide: UserEmailVerificationService,
          useValue: {
            createVerification: jest.fn(),
            verifyToken: jest.fn(),
            sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
            createAndSendVerification: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // Clean up test users
    try {
      if (prisma) {
        await prisma.user.deleteMany({
          where: {
            email: {
              contains: 'test-',
            },
          },
        });
      }
    } catch (_err) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.$disconnect();
      }
      if (module) {
        await module.close();
      }
    } catch (_err) {
      // Ignore cleanup errors
    }
  });

  describe('signUp', () => {
    it('should create a new user and return tokens', async () => {
      const signUpDto = {
        email: `test-signup-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User',
      };
      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.signUp(signUpDto, mockRes);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result.user.email).toBe(signUpDto.email);
      expect(result.user.name).toBe(signUpDto.name);
    });

    it('should treat existing email with correct password as login and return tokens', async () => {
      const email = `test-duplicate-${Date.now()}@example.com`;
      const signUpDto = {
        email,
        password: 'TestPassword123!',
      };
      const mockRes1 = {
        cookie: jest.fn(),
      } as unknown as Response;

      // Create first user
      const firstResult = await controller.signUp(signUpDto, mockRes1);
      expect(firstResult.user.email).toBe(email);

      const mockRes2 = {
        cookie: jest.fn(),
      } as unknown as Response;

      // Second signup with same credentials should behave like login
      const secondResult = await controller.signUp(signUpDto, mockRes2);
      expect(secondResult.user.email).toBe(email);
      expect(secondResult).toHaveProperty('accessToken');
      expect(secondResult).toHaveProperty('refreshToken');
    });

    it('should throw WeakPasswordException for weak password', async () => {
      const signUpDto = {
        email: `test-weak-${Date.now()}@example.com`,
        password: 'weak', // Too weak
      };
      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      await expect(controller.signUp(signUpDto, mockRes)).rejects.toThrow(WeakPasswordException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const email = `test-login-${Date.now()}@example.com`;
      const password = 'TestPassword123!';
      const mockResSignUp = {
        cookie: jest.fn(),
      } as unknown as Response;

      // Create user first
      await controller.signUp(
        {
          email,
          password,
        },
        mockResSignUp,
      );

      const mockResLogin = {
        cookie: jest.fn(),
      } as unknown as Response;

      // Login
      const result = await controller.login({ email, password }, mockResLogin);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(email);
    });

    it('should throw InvalidCredentialsException for wrong password', async () => {
      const email = `test-wrong-password-${Date.now()}@example.com`;
      const password = 'TestPassword123!';
      const mockResSignUp = {
        cookie: jest.fn(),
      } as unknown as Response;

      // Create user
      await controller.signUp(
        {
          email,
          password,
        },
        mockResSignUp,
      );

      const mockResLogin = {
        cookie: jest.fn(),
      } as unknown as Response;

      // Try to login with wrong password
      await expect(
        controller.login({ email, password: 'WrongPassword123!' }, mockResLogin),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw InvalidCredentialsException for non-existent user', async () => {
      const mockResLogin = {
        cookie: jest.fn(),
      } as unknown as Response;

      await expect(
        controller.login(
          {
            email: 'nonexistent@example.com',
            password: 'TestPassword123!',
          },
          mockResLogin,
        ),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens with valid refresh token', async () => {
      jest.spyOn(authService, 'isRefreshTokenValid').mockResolvedValue(true);
      const email = `test-refresh-${Date.now()}@example.com`;
      const password = 'TestPassword123!';
      const mockResSignUp = {
        cookie: jest.fn(),
      } as unknown as Response;

      // Create user and login
      const loginResult = await controller.signUp(
        {
          email,
          password,
        },
        mockResSignUp,
      );

      const mockResRefresh = {
        cookie: jest.fn(),
      } as unknown as Response;

      // Refresh token
      const mockReqRefresh = {
        cookies: {},
      } as any;

      const refreshResult = await controller.refreshToken(
        {
          refreshToken: loginResult.refreshToken,
        },
        mockReqRefresh,
        mockResRefresh,
      );

      expect(refreshResult).toHaveProperty('user');
      expect(refreshResult).toHaveProperty('accessToken');
      expect(refreshResult).toHaveProperty('refreshToken');
      expect(refreshResult.user.email).toBe(email);
      // New tokens should be valid (they may be the same if generated at the same time)
      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.refreshToken).toBeDefined();
    });
  });

  describe('googleAuthRedirect', () => {
    it('should handle Google callback and redirect with tokens', async () => {
      const googleUser = {
        googleId: 'google-123',
        email: `google-${Date.now()}@example.com`,
        name: 'Google User',
        picture: 'http://example.com/pic.jpg',
      };

      const req = {
        user: googleUser,
        query: { state: 'some-state' },
      };

      const res = {
        redirect: jest.fn(),
        cookie: jest.fn(),
      };

      await controller.googleAuthRedirect(req, res);

      expect(res.redirect).toHaveBeenCalled();
      const redirectUrl = res.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('accessToken=');
      expect(redirectUrl).toContain('refreshToken=');
      expect(redirectUrl).toContain('state=some-state');
    });

    it('should link to existing user if email matches', async () => {
      // Create user first
      const email = `google-link-test-${Date.now()}@example.com`;
      const mockResSignUp = {
        cookie: jest.fn(),
      } as unknown as Response;

      await controller.signUp(
        {
          email,
          password: 'TestPassword123!',
        },
        mockResSignUp,
      );

      const googleUser = {
        googleId: 'google-456',
        email,
        name: 'Google User 2',
      };

      const req = {
        user: googleUser,
        query: {},
      };

      const res = {
        redirect: jest.fn(),
        cookie: jest.fn(),
      };

      await controller.googleAuthRedirect(req, res);

      // Verify redirection happened
      expect(res.redirect).toHaveBeenCalled();

      // Verify user has merged (check via service)
      const linkedUser = await authService.findByGoogleId('google-456');
      expect(linkedUser).toBeDefined();
      expect(linkedUser?.email).toBe(email);
    });
  });
});
