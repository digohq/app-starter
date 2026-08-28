import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { JwtUtils } from './jwt.utils';
import { RedisService } from '../redis/redis.service';

describe('AuthService', () => {
  let service: AuthService;
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
      providers: [
        AuthService,
        JwtUtils,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // Clean up test users
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test-',
          },
        },
      });
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (module) {
      await module.close();
    }
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts produce different hashes
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hashPassword(password);

      const isValid = await service.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await service.hashPassword(password);

      const isValid = await service.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const user = {
        id: 'test-user-id',
        email: 'test@example.com',
      };

      const tokens = await service.generateTokens(user);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeGreaterThan(0);
    });

    it('should generate different tokens for different users', async () => {
      const user1 = { id: 'user1', email: 'user1@example.com' };
      const user2 = { id: 'user2', email: 'user2@example.com' };

      const tokens1 = await service.generateTokens(user1);
      const tokens2 = await service.generateTokens(user2);

      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });
  });

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const userData = {
        email: `test-newuser-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User',
      };

      const user = await service.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.password).toBeDefined();
      expect(user.password).not.toBe(userData.password);
      expect(user.emailVerifiedAt).toBeDefined();

      // Verify password can be checked
      const isValid = await service.verifyPassword(userData.password, user.password!);
      expect(isValid).toBe(true);
    });

    it('should create a user without password (OTP signup)', async () => {
      const userData = {
        email: `test-otpuser-${Date.now()}@example.com`,
        name: 'OTP User',
      };

      const user = await service.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.password).toBeNull();
      expect(user.emailVerifiedAt).toBeDefined();
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const email = `test-findme-${Date.now()}@example.com`;
      await service.createUser({
        email,
        password: 'TestPassword123!',
      });

      const user = await service.findByEmail(email);

      expect(user).toBeDefined();
      expect(user?.email).toBe(email);
    });

    it('should return null for non-existent email', async () => {
      const user = await service.findByEmail(`test-nonexistent-${Date.now()}@example.com`);
      expect(user).toBeNull();
    });
  });

  describe('googleAuth', () => {
    const googleProfile = {
      googleId: 'google-123456',
      email: 'google-test@example.com',
      name: 'Google Test User',
      picture: 'https://example.com/photo.jpg',
    };

    it('should create a user from Google profile', async () => {
      // Ensure unique email
      googleProfile.email = `google-test-${Date.now()}@example.com`;

      const user = await service.createFromGoogle(googleProfile);

      expect(user).toBeDefined();
      expect(user.email).toBe(googleProfile.email);
      expect(user.googleId).toBe(googleProfile.googleId);
      expect(user.googleName).toBe(googleProfile.name);
      expect(user.emailVerifiedAt).toBeDefined();
    });

    it('should find user by Google ID', async () => {
      // Create user first to ensure it exists
      googleProfile.email = `google-test-find-${Date.now()}@example.com`;
      await service.createFromGoogle(googleProfile);

      const foundUser = await service.findByGoogleId(googleProfile.googleId);
      expect(foundUser).toBeDefined();
      expect(foundUser?.googleId).toBe(googleProfile.googleId);
    });

    it('should link Google account to existing user', async () => {
      // Create a standard user first
      const email = `test-link-${Date.now()}@example.com`;
      const originalUser = await service.createUser({
        email,
        password: 'Password123!',
        name: 'Original User',
      });

      const newGoogleProfile = {
        ...googleProfile,
        googleId: 'google-link-789',
        email: email, // Same email
      };

      await service.linkGoogleAccount(originalUser.id, newGoogleProfile);

      const linkedUser = await service.findByGoogleId('google-link-789');
      expect(linkedUser).toBeDefined();
      expect(linkedUser?.id).toBe(originalUser.id);
      expect(linkedUser?.googleId).toBe('google-link-789');
    });
  });
});
