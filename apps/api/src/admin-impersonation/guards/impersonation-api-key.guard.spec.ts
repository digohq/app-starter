import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImpersonationApiKeyGuard } from './impersonation-api-key.guard';

const createContext = (headers: Record<string, string | undefined>) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as any;

describe('ImpersonationApiKeyGuard', () => {
  it('returns 401 when key is missing', () => {
    const configService = {
      get: jest.fn().mockReturnValue('test-key'),
    } as unknown as ConfigService;

    const guard = new ImpersonationApiKeyGuard(configService);

    expect(() => guard.canActivate(createContext({}))).toThrow(UnauthorizedException);
  });

  it('returns 401 when key is invalid', () => {
    const configService = {
      get: jest.fn().mockReturnValue('test-key'),
    } as unknown as ConfigService;

    const guard = new ImpersonationApiKeyGuard(configService);

    expect(() => guard.canActivate(createContext({ authorization: 'Bearer wrong-key' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('allows request when Authorization bearer key matches', () => {
    const configService = {
      get: jest.fn().mockReturnValue('test-key'),
    } as unknown as ConfigService;

    const guard = new ImpersonationApiKeyGuard(configService);

    expect(guard.canActivate(createContext({ authorization: 'Bearer test-key' }))).toBe(true);
  });

  it('allows request when X-Impersonation-Key matches', () => {
    const configService = {
      get: jest.fn().mockReturnValue('test-key'),
    } as unknown as ConfigService;

    const guard = new ImpersonationApiKeyGuard(configService);

    expect(guard.canActivate(createContext({ 'x-impersonation-key': 'test-key' }))).toBe(true);
  });
});
