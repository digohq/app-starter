import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminImpersonationService } from './admin-impersonation.service';
import { JwtUtils } from '../auth/jwt.utils';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminImpersonationService', () => {
  const createService = (overrides?: {
    prisma?: Partial<PrismaService>;
    jwtUtils?: Partial<JwtUtils>;
    config?: Record<string, string | undefined>;
  }) => {
    const prisma = {
      user: { findUnique: jest.fn() },
      adminImpersonationAudit: { create: jest.fn() },
      ...(overrides?.prisma ?? {}),
    } as unknown as PrismaService;

    const jwtUtils = {
      getExpiresInSeconds: jest.fn().mockReturnValue(600),
      signAccessToken: jest.fn().mockResolvedValue('signed-token'),
      ...(overrides?.jwtUtils ?? {}),
    } as unknown as JwtUtils;

    const configService = {
      get: jest.fn((key: string) => overrides?.config?.[key]),
    } as unknown as ConfigService;

    return {
      service: new AdminImpersonationService(prisma, jwtUtils, configService),
      prisma,
      jwtUtils,
    };
  };

  it('rejects short reason with 400', async () => {
    const { service } = createService();

    await expect(
      service.impersonate(
        { targetUserId: '11111111-1111-1111-1111-111111111111', reason: 'a' } as any,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns 404 when target user does not exist', async () => {
    const { service, prisma } = createService();
    (prisma as any).user.findUnique.mockResolvedValue(null);

    await expect(
      service.impersonate(
        { targetUserId: '11111111-1111-1111-1111-111111111111', reason: 'debugging' } as any,
        {},
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
