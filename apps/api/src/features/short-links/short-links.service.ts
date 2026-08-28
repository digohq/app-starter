import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShortLinkDto } from './dto/create-short-link.dto';

@Injectable()
export class ShortLinksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShortLinkDto) {
    try {
      return await this.prisma.shortLink.create({
        data: {
          slug: dto.slug,
          targetUrl: dto.targetUrl,
          entityId: dto.entityId,
          entityType: dto.entityType,
          description: dto.description,
        },
      });
    } catch (error) {
      // Check for unique constraint violation on slug
      if (error.code === 'P2002') {
        throw new ConflictException('Short link slug already exists');
      }
      throw error;
    }
  }

  async resolve(slug: string) {
    const link = await this.prisma.shortLink.findUnique({
      where: { slug },
    });

    if (!link) {
      throw new NotFoundException('Short link not found');
    }

    // Async increment click count (fire and forget)
    this.prisma.shortLink
      .update({
        where: { id: link.id },
        data: { clicks: { increment: 1 } },
      })
      .catch((err) => console.error('Failed to increment short link clicks', err));

    return {
      targetUrl: link.targetUrl,
      slug: link.slug,
    };
  }

  async getByEntity(entityId: string, entityType: string) {
    return await this.prisma.shortLink.findFirst({
      where: {
        entityId,
        entityType,
      },
    });
  }
}
