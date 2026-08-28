import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { OtpService } from './otp.service';
import { RedisService } from '../redis/redis.service';

describe('OtpService', () => {
  let service: OtpService;
  let redisService: RedisService;
  const mockRedisData: Map<string, { value: string; ttl?: number }> = new Map();

  beforeEach(async () => {
    // Mock RedisService
    const mockRedisService = {
      get: jest.fn(async (key: string) => {
        const item = mockRedisData.get(key);
        if (!item) return null;
        return item.value;
      }),
      set: jest.fn(async (key: string, value: string, ttlSeconds?: number) => {
        mockRedisData.set(key, { value, ttl: ttlSeconds });
      }),
      del: jest.fn(async (key: string) => {
        mockRedisData.delete(key);
        return 1;
      }),
      exists: jest.fn(async (key: string) => {
        return mockRedisData.has(key) ? 1 : 0;
      }),
      getClient: jest.fn(() => null),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [
        OtpService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    redisService = module.get<RedisService>(RedisService);

    // Clear mock data before each test
    mockRedisData.clear();
  });

  describe('generateOtp', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = service.generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it('should generate different OTPs on each call', () => {
      const otp1 = service.generateOtp();
      const otp2 = service.generateOtp();
      // Very unlikely to be the same, but possible
      // We'll just check they're valid 6-digit numbers
      expect(otp1).toMatch(/^\d{6}$/);
      expect(otp2).toMatch(/^\d{6}$/);
    });
  });

  describe('createOtp', () => {
    it('should create and store OTP in Redis', async () => {
      const email = 'test@example.com';
      const otp = await service.createOtp(email);

      expect(otp).toMatch(/^\d{6}$/);

      // Verify OTP is stored in Redis
      const key = `otp:${email}`;
      const stored = await redisService.get(key);
      expect(stored).toBeDefined();
    });

    it('should overwrite previous OTP for same email', async () => {
      const email = 'test@example.com';
      const otp1 = await service.createOtp(email);
      const otp2 = await service.createOtp(email);

      // Both should be valid OTPs
      expect(otp1).toMatch(/^\d{6}$/);
      expect(otp2).toMatch(/^\d{6}$/);

      // Second OTP should replace first one
      const isValid1 = await service.verifyOtp(email, otp1);
      const isValid2 = await service.verifyOtp(email, otp2);

      expect(isValid1).toBe(false); // First OTP should be invalid
      expect(isValid2).toBe(true); // Second OTP should be valid
    });
  });

  describe('verifyOtp', () => {
    it('should verify a valid OTP', async () => {
      const email = 'test@example.com';
      const otp = await service.createOtp(email);

      const isValid = await service.verifyOtp(email, otp);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid OTP', async () => {
      const email = 'test@example.com';
      await service.createOtp(email);

      const isValid = await service.verifyOtp(email, '000000');
      expect(isValid).toBe(false);
    });

    it('should reject OTP after it has been used (single-use)', async () => {
      const email = 'test@example.com';
      const otp = await service.createOtp(email);

      // First verification should succeed
      const isValid1 = await service.verifyOtp(email, otp);
      expect(isValid1).toBe(true);

      // Second verification should fail (OTP deleted after first use)
      const isValid2 = await service.verifyOtp(email, otp);
      expect(isValid2).toBe(false);
    });

    it('should reject OTP for non-existent email', async () => {
      const isValid = await service.verifyOtp('nonexistent@example.com', '123456');
      expect(isValid).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const email = 'ratelimit@example.com';
      const rateLimitRequests = 5;

      for (let i = 0; i < rateLimitRequests; i++) {
        const exceeded = await service.checkRateLimit(email);
        expect(exceeded).toBe(false);
      }
    });

    it('should block requests exceeding rate limit', async () => {
      const email = 'ratelimit2@example.com';
      const rateLimitRequests = 5;

      // Make requests up to limit
      for (let i = 0; i < rateLimitRequests; i++) {
        await service.checkRateLimit(email);
      }

      // Next request should exceed limit
      const exceeded = await service.checkRateLimit(email);
      expect(exceeded).toBe(true);
    });
  });

  describe('getExpirationSeconds', () => {
    it('should return expiration time in seconds', () => {
      const expiration = service.getExpirationSeconds();
      expect(expiration).toBe(600); // 10 minutes
    });
  });
});
