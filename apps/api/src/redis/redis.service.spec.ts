import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let configService: ConfigService;

  const RedisMock = Redis as unknown as jest.Mock;

  beforeEach(async () => {
    RedisMock.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('onModuleInit', () => {
    it('should create Redis client with REDIS_URL when provided', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'REDIS_URL') return 'redis://example.com:6379/0';
        return undefined;
      });

      const logSpy = jest.fn();
      const errorSpy = jest.fn();
      (service as any).logger = { log: logSpy, error: errorSpy };

      const onSpy = jest.fn();
      RedisMock.mockImplementation(() => ({
        on: onSpy,
      }));

      service.onModuleInit();

      expect(RedisMock).toHaveBeenCalledWith(
        'redis://example.com:6379/0',
        expect.objectContaining({
          family: 0,
          keepAlive: 10000,
          retryStrategy: expect.any(Function),
        }),
      );

      const retryStrategy = (RedisMock.mock.calls[0][1] as any).retryStrategy;
      expect(retryStrategy(1)).toBe(50);
      expect(retryStrategy(1000)).toBe(2000);

      expect(onSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('connect', expect.any(Function));

      const errorHandler = onSpy.mock.calls.find((c: any[]) => c[0] === 'error')?.[1];
      const connectHandler = onSpy.mock.calls.find((c: any[]) => c[0] === 'connect')?.[1];
      const err = new Error('Redis connection failed');
      if (errorHandler) errorHandler(err);
      if (connectHandler) connectHandler();
      expect(errorSpy).toHaveBeenCalledWith('Redis Client Error', err.stack);
      expect(logSpy).toHaveBeenCalledWith('Redis Client Connected');
    });

    it('should create Redis client with host/port and TLS when REDIS_URL is not provided', () => {
      (configService.get as jest.Mock).mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'REDIS_URL') return undefined;
        if (key === 'REDIS_HOST') return 'redis-host';
        if (key === 'REDIS_PORT') return 6380;
        if (key === 'REDIS_PASSWORD') return 'secret';
        if (key === 'REDIS_DB') return 1;
        if (key === 'REDIS_TLS') return true;
        return defaultValue;
      });

      const onSpy = jest.fn();
      RedisMock.mockImplementation(() => ({
        on: onSpy,
      }));

      service.onModuleInit();

      expect(RedisMock).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'redis-host',
          port: 6380,
          password: 'secret',
          db: 1,
          tls: {
            rejectUnauthorized: true,
          },
          family: 0,
          keepAlive: 10000,
          retryStrategy: expect.any(Function),
        }),
      );
    });
  });

  describe('lifecycle and helpers', () => {
    it('should disconnect client on module destroy', () => {
      const disconnect = jest.fn();
      RedisMock.mockImplementation(() => ({
        on: jest.fn(),
        disconnect,
      }));

      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'REDIS_URL') return 'redis://example.com:6379/0';
        return undefined;
      });

      service.onModuleInit();
      service.onModuleDestroy();

      expect(disconnect).toHaveBeenCalled();
    });

    it('should proxy basic commands to underlying client', async () => {
      const get = jest.fn().mockResolvedValue('value');
      const set = jest.fn().mockResolvedValue('OK');
      const setex = jest.fn().mockResolvedValue('OK');
      const del = jest.fn().mockResolvedValue(1);
      const exists = jest.fn().mockResolvedValue(1);
      const expire = jest.fn().mockResolvedValue(1);

      RedisMock.mockImplementation(() => ({
        on: jest.fn(),
        get,
        set,
        setex,
        del,
        exists,
        expire,
      }));

      (configService.get as jest.Mock).mockReturnValue('redis://example.com');

      service.onModuleInit();

      expect(service.getClient()).toBeDefined();

      const value = await service.get('key');
      expect(value).toBe('value');
      expect(get).toHaveBeenCalledWith('key');

      await service.set('key', 'v');
      expect(set).toHaveBeenCalledWith('key', 'v');

      await service.set('key-ttl', 'v', 10);
      expect(setex).toHaveBeenCalledWith('key-ttl', 10, 'v');

      await service.del('key');
      expect(del).toHaveBeenCalledWith('key');

      await service.exists('key');
      expect(exists).toHaveBeenCalledWith('key');

      await service.expire('key', 30);
      expect(expire).toHaveBeenCalledWith('key', 30);
    });
  });
});
