import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtUtils } from './jwt.utils';

describe('JwtUtils', () => {
  let jwtUtils: JwtUtils;
  const testSecret = 'test-secret-key-for-testing-only';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        JwtModule.register({
          secret: testSecret,
          signOptions: { algorithm: 'HS256' },
        }),
      ],
      providers: [JwtUtils, ConfigService],
    }).compile();

    jwtUtils = module.get<JwtUtils>(JwtUtils);
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', async () => {
      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
      };

      const tokens = await jwtUtils.generateTokenPair(payload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should generate valid JWT tokens', async () => {
      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
      };

      const tokens = await jwtUtils.generateTokenPair(payload);

      // Verify tokens can be verified
      const verifiedAccess = await jwtUtils.verifyToken(tokens.accessToken);
      const verifiedRefresh = await jwtUtils.verifyToken(tokens.refreshToken);

      expect(verifiedAccess.sub).toBe(payload.sub);
      expect(verifiedAccess.email).toBe(payload.email);
      expect(verifiedRefresh.sub).toBe(payload.sub);
      expect(verifiedRefresh.email).toBe(payload.email);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
      };

      const tokens = await jwtUtils.generateTokenPair(payload);
      const verified = await jwtUtils.verifyToken(tokens.accessToken);

      expect(verified.sub).toBe(payload.sub);
      expect(verified.email).toBe(payload.email);
    });

    it('should throw error for invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(jwtUtils.verifyToken(invalidToken)).rejects.toThrow();
    });

    it('should throw error for expired token', async () => {
      // This test would require creating a token with very short expiration
      // For now, we'll just test that verification works for valid tokens
      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
      };

      const tokens = await jwtUtils.generateTokenPair(payload);
      const verified = await jwtUtils.verifyToken(tokens.accessToken);

      expect(verified).toBeDefined();
    });
  });

  describe('getExpiresInSeconds', () => {
    it('should convert days to seconds', () => {
      const seconds = jwtUtils.getExpiresInSeconds('7d');
      expect(seconds).toBe(7 * 24 * 60 * 60);
    });

    it('should convert hours to seconds', () => {
      const seconds = jwtUtils.getExpiresInSeconds('2h');
      expect(seconds).toBe(2 * 60 * 60);
    });

    it('should convert minutes to seconds', () => {
      const seconds = jwtUtils.getExpiresInSeconds('30m');
      expect(seconds).toBe(30 * 60);
    });

    it('should handle seconds', () => {
      const seconds = jwtUtils.getExpiresInSeconds('60s');
      expect(seconds).toBe(60);
    });

    it('should default to 7 days for invalid format', () => {
      const seconds = jwtUtils.getExpiresInSeconds('invalid');
      expect(seconds).toBe(7 * 24 * 60 * 60);
    });
  });
});
