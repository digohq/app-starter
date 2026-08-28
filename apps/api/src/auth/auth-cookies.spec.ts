import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { AuthService } from './auth.service';
import { JwtUtils } from './jwt.utils';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Response } from 'express';

describe('AuthService Cookies', () => {
  let service: AuthService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'NODE_ENV') return 'production';
              if (key === 'COOKIE_DOMAIN') return '.example.com';
              if (key === 'JWT_ACCESS_TOKEN_EXPIRATION') return '7d';
              if (key === 'JWT_REFRESH_TOKEN_EXPIRATION') return '30d';
              return defaultValue;
            }),
          },
        },
        {
          provide: JwtUtils,
          useValue: {
            getExpiresInSeconds: jest.fn((val: string) => {
              if (val === '7d') return 7 * 24 * 3600;
              if (val === '30d') return 30 * 24 * 3600;
              return 3600;
            }),
          },
        },
        { provide: PrismaService, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: ModuleRef, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should set auth cookies with correct attributes', async () => {
    const mockRes = {
      cookie: jest.fn(),
    } as unknown as Response;

    const tokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    await service.setAuthCookies(mockRes, tokens);

    expect(mockRes.cookie).toHaveBeenCalledTimes(2);

    // Check access token cookie
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'app_starter_access_token',
      'mock-access-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.example.com',
        path: '/',
      }),
    );

    // Check refresh token cookie
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'app_starter_refresh_token',
      'mock-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.example.com',
        path: '/',
      }),
    );
  });

  it('should not set domain on cookies in non-production', async () => {
    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      return undefined;
    });

    const mockRes = {
      cookie: jest.fn(),
    } as unknown as Response;

    const tokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    await service.setAuthCookies(mockRes, tokens);

    expect(mockRes.cookie).toHaveBeenCalledWith(
      'app_starter_access_token',
      'mock-access-token',
      expect.objectContaining({
        domain: undefined,
      }),
    );
  });

  it('should clear auth cookies', async () => {
    const mockRes = {
      clearCookie: jest.fn(),
    } as unknown as Response;

    await service.clearAuthCookies(mockRes);

    expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      'app_starter_access_token',
      expect.objectContaining({
        path: '/',
        domain: '.example.com',
      }),
    );
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      'app_starter_refresh_token',
      expect.objectContaining({
        path: '/',
        domain: '.example.com',
      }),
    );
  });
});
