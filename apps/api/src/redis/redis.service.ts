import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    // Common options for reliability on cloud platforms like Railway
    const commonOptions: RedisOptions = {
      family: 0, // Auto-detect IPv4/IPv6
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      keepAlive: 10000,
    };

    if (redisUrl) {
      this.client = new Redis(redisUrl, commonOptions);
    } else {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);
      const password = this.configService.get<string>('REDIS_PASSWORD');
      const db = this.configService.get<number>('REDIS_DB', 0);
      const tls = this.configService.get<boolean>('REDIS_TLS', false);

      const redisOptions: RedisOptions = {
        host,
        port,
        password,
        db,
        ...commonOptions,
      };

      // Enable TLS if configured
      if (tls) {
        redisOptions.tls = {
          rejectUnauthorized: true, // Verify server certificate
        };
      }

      this.client = new Redis(redisOptions);
    }

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error', err.stack);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis Client Connected');
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }
}
