import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRATION_SECONDS = 600; // 10 minutes
  private readonly SALT_ROUNDS = 10;

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate a 6-digit numeric OTP using cryptographically secure random number generation
   */
  generateOtp(): string {
    const min = 100000;
    const max = 999999;
    return crypto.randomInt(min, max + 1).toString();
  }

  /**
   * Hash OTP code using bcrypt
   */
  private async hashOtp(code: string): Promise<string> {
    return bcrypt.hash(code, this.SALT_ROUNDS);
  }

  /**
   * Verify OTP code against hash
   */
  private async verifyOtpHash(plainCode: string, hashedCode: string): Promise<boolean> {
    return bcrypt.compare(plainCode, hashedCode);
  }

  /**
   * Generate Redis key for OTP storage
   */
  private getOtpKey(email: string): string {
    return `otp:${email}`;
  }

  /**
   * Create and store OTP for email in Redis
   * Returns the plaintext OTP for email delivery
   */
  async createOtp(email: string): Promise<string> {
    const plainOtp = this.generateOtp();
    const hashedOtp = await this.hashOtp(plainOtp);
    const key = this.getOtpKey(email);

    // Store hashed OTP in Redis with TTL (only one OTP per email at a time)
    await this.redisService.set(key, hashedOtp, this.OTP_EXPIRATION_SECONDS);

    return plainOtp;
  }

  /**
   * Verify OTP is valid and not expired
   * Checks Redis cache, compares plaintext code with hashed stored code
   * Deletes OTP from cache after successful verification (single-use)
   */
  async verifyOtp(email: string, code: string): Promise<boolean> {
    const key = this.getOtpKey(email);
    const storedHashedOtp = await this.redisService.get(key);

    if (!storedHashedOtp) {
      return false; // OTP not found or expired
    }

    // Verify the code matches the stored hash
    const isValid = await this.verifyOtpHash(code, storedHashedOtp);

    if (!isValid) {
      return false;
    }

    // Delete OTP after successful verification (single-use)
    await this.redisService.del(key);

    return true;
  }

  /**
   * Check rate limit for email
   * Returns true if rate limit is exceeded
   */
  async checkRateLimit(email: string): Promise<boolean> {
    const rateLimitRequests = this.configService.get<number>('OTP_RATE_LIMIT_REQUESTS', 5);
    const rateLimitWindow = this.configService.get<number>(
      'OTP_RATE_LIMIT_WINDOW',
      900, // 15 minutes
    );

    const key = `otp:ratelimit:${email}`;
    const current = await this.redisService.get(key);

    if (!current) {
      // First request in window
      await this.redisService.set(key, '1', rateLimitWindow);
      return false;
    }

    const count = parseInt(current, 10);
    if (count >= rateLimitRequests) {
      return true; // Rate limit exceeded
    }

    // Increment count
    await this.redisService.set(key, (count + 1).toString(), rateLimitWindow);
    return false;
  }

  /**
   * Get expiration time in seconds
   */
  getExpirationSeconds(): number {
    return this.OTP_EXPIRATION_SECONDS;
  }
}
