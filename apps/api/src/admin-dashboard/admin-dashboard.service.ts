import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminUsersListResponseDto,
  AdminUserListItemDto,
} from './dto/admin-users-list-response.dto';
import { AdminQuarantineUserDto } from './dto/admin-quarantine-user.dto';

const MAX_PAGE_SIZE = 100;

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePagination(
    page?: number,
    pageSize?: number,
  ): { page: number; pageSize: number } {
    const safePage = !page || page < 1 ? 1 : page;
    const safePageSize =
      !pageSize || pageSize < 1 ? 25 : pageSize > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : pageSize;

    return { page: safePage, pageSize: safePageSize };
  }

  async getUsers(
    page?: number,
    pageSize?: number,
    search?: string,
    quarantinedOnly?: boolean,
  ): Promise<AdminUsersListResponseDto> {
    const { page: p, pageSize: ps } = this.normalizePagination(page, pageSize);
    const skip = (p - 1) * ps;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (quarantinedOnly) {
      where.quarantinedAt = { not: null };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: ps,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          lastLoginAt: true,
          quarantinedAt: true,
          isGlobalAdmin: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const dtoItems: AdminUserListItemDto[] = items.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      quarantinedAt: u.quarantinedAt ? u.quarantinedAt.toISOString() : null,
      isGlobalAdmin: u.isGlobalAdmin,
    }));

    return {
      items: dtoItems,
      page: p,
      pageSize: ps,
      total,
    };
  }

  async quarantineUser(
    adminId: string,
    userId: string,
    data: AdminQuarantineUserDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const quarantinedAt = data.isQuarantined ? new Date() : null;
    const action = data.isQuarantined ? 'QUARANTINE' : 'UNQUARANTINE';

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { quarantinedAt },
      }),
      this.prisma.adminQuarantineAudit.create({
        data: {
          userId,
          adminId,
          action,
          reason: data.reason,
        },
      }),
    ]);
  }
}
