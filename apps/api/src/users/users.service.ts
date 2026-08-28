import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { PublicUserDto } from './dto/public-user.dto';
import { FileStorageService } from '../common/services/file-storage.service';
import { normalizeRichTextInput } from '../common/utils/rich-text.util';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  /**
   * Get the authenticated user's own profile.
   */
  async getUserProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserProfileResponse(user);
  }

  /**
   * Update the authenticated user's own profile.
   *
   * `file`, when present, replaces the avatar; the previous object is left in
   * place so that in-flight references keep resolving.
   */
  async updateUserProfile(
    userId: string,
    data: UpdateUserProfileDto,
    file?: Express.Multer.File,
  ): Promise<UserProfileResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.username !== undefined && data.username !== user.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: data.username },
      });

      if (existing && existing.id !== userId) {
        throw new ConflictException('Username is already taken');
      }

      updateData.username = data.username;
    }

    if (data.bio !== undefined) {
      updateData.bio = normalizeRichTextInput(data.bio, 'full');
    }

    if (data.timezone !== undefined) {
      updateData.timezone = data.timezone;
    }

    if (file) {
      updateData.avatarUrl = await this.fileStorageService.uploadFile(file, 'avatars');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.mapToUserProfileResponse(updated);
  }

  /**
   * Public profile lookup by username.
   */
  async findByUsername(username: string): Promise<PublicUserDto> {
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToPublicUser(user);
  }

  /**
   * Public profile lookup by id.
   */
  async getPublicProfile(userId: string): Promise<PublicUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToPublicUser(user);
  }

  private mapToUserProfileResponse(user: User): UserProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private mapToPublicUser(user: User): PublicUserDto {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
    };
  }
}
