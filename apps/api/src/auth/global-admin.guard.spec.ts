import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { GlobalAdminGuard } from './global-admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TokenPayload } from '@app-starter/shared';

describe('GlobalAdminGuard', () => {
  let guard: GlobalAdminGuard;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const createContext = (user?: TokenPayload): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  beforeEach(() => {
    prisma = mockPrisma as any;
    guard = new GlobalAdminGuard(prisma);
    jest.clearAllMocks();
  });

  it('throws ForbiddenException when user is missing', async () => {
    await expect(guard.canActivate(createContext(undefined))).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when user is not global admin', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ isGlobalAdmin: false });

    await expect(
      guard.canActivate(createContext({ sub: 'user-1', email: 'test@example.com' })),
    ).rejects.toThrow(ForbiddenException);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { isGlobalAdmin: true },
    });
  });

  it('allows access when user is global admin', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ isGlobalAdmin: true });

    await expect(
      guard.canActivate(createContext({ sub: 'admin-1', email: 'admin@example.com' })),
    ).resolves.toBe(true);
  });
});
