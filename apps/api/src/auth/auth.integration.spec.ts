import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { JwtUtils } from './jwt.utils';
import { RedisService } from '../redis/redis.service';

describe('AuthService Integration', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test.local', '.env.test'],
        }),
        PrismaModule,
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-secret',
          signOptions: { algorithm: 'HS256' },
        }),
      ],
      providers: [
        AuthService,
        JwtUtils,
        ConfigService,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getClient: jest
              .fn()
              .mockReturnValue({ get: jest.fn(), set: jest.fn(), del: jest.fn() }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'test-',
        },
      },
    });
    await prisma.$disconnect();
    await module.close();
  });

  describe('User Creation and Authentication Flow', () => {
    it('should create user, verify password, and generate tokens', async () => {
      const email = `test-${Date.now()}@example.com`;
      const password = 'TestPassword123!';
      const name = 'Test User';

      // Create user
      const user = await service.createUser({
        email,
        password,
        name,
      });

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.name).toBe(name);
      expect(user.password).toBeDefined();
      expect(user.password).not.toBe(password);

      // Verify password
      const isValid = await service.verifyPassword(password, user.password!);
      expect(isValid).toBe(true);

      // Generate tokens
      const tokens = await service.generateTokens({
        id: user.id,
        email: user.email,
      });

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeGreaterThan(0);

      // Verify tokens can be verified
      const jwtUtils = module.get<JwtUtils>(JwtUtils);
      const payload = await jwtUtils.verifyToken(tokens.accessToken);
      expect(payload.sub).toBe(user.id);
      expect(payload.email).toBe(user.email);
    });

    it('should find user by email after creation', async () => {
      const email = `test-find-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      await service.createUser({
        email,
        password,
      });

      const foundUser = await service.findByEmail(email);
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(email);
    });

    it('should update last login timestamp', async () => {
      const email = `test-login-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      const user = await service.createUser({
        email,
        password,
      });

      expect(user.lastLoginAt).toBeNull();

      await service.updateLastLogin(user.id);

      // Re-fetch user to get updated timestamp
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.lastLoginAt).toBeDefined();
      expect(updatedUser?.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should create user without password for OTP signup', async () => {
      const email = `test-otp-${Date.now()}@example.com`;
      const name = 'OTP User';

      const user = await service.createUser({
        email,
        name,
      });

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.password).toBeNull();
      expect(user.emailVerifiedAt).toBeDefined();
    });
  });

  describe('Password Security', () => {
    it('should hash passwords with different salts', async () => {
      const password = 'TestPassword123!';
      const email1 = `test-salt1-${Date.now()}@example.com`;
      const email2 = `test-salt2-${Date.now()}@example.com`;

      const user1 = await service.createUser({
        email: email1,
        password,
      });

      const user2 = await service.createUser({
        email: email2,
        password,
      });

      // Same password should produce different hashes
      expect(user1.password).not.toBe(user2.password);

      // But both should verify correctly
      const isValid1 = await service.verifyPassword(password, user1.password!);
      const isValid2 = await service.verifyPassword(password, user2.password!);

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
    });
  });
});
