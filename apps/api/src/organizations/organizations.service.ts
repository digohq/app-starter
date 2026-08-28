import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { OrgRole } from '@app-starter/shared';
import { OrgRole as PrismaOrganizationRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import {
  UserOrganizationsResponseDto,
  UserOrganizationDto,
} from './dto/user-organizations-response.dto';
import { sanitizeString, sanitizeOptionalString } from '../common/utils/sanitize.util';
import { ensureUniqueSlug } from '../common/utils/slug.util';

import { PublicOrganizationDto } from './dto/public-organization.dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new organization and assign the creator as Owner
   */
  async createOrganization(
    userId: string,
    data: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    // Enforce maximum of 10 organizations per user (create or belong to)
    const userOrganizationsCount = await this.prisma.organizationMember.count({
      where: { userId },
    });

    if (userOrganizationsCount >= 10) {
      throw new BadRequestException('You have reached the maximum limit of 10 organizations.');
    }

    // Generate unique random slug
    const slug = await ensureUniqueSlug(async (slug) => {
      const existing = await this.prisma.organization.findUnique({
        where: { slug },
      });
      return !!existing;
    });

    // Sanitize and trim optional fields
    const location = sanitizeOptionalString(data.location);
    const website = sanitizeOptionalString(data.website);

    // Use transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Create organization with sanitized input
      const organization = await tx.organization.create({
        data: {
          name: sanitizeString(data.name),
          slug,
          description: sanitizeOptionalString(data.description) ?? '',
          location,
          website,
          logoUrl: data.logoUrl,
        },
      });

      // Create OrganizationMember with OWNER role
      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: organization.id,
          role: PrismaOrganizationRole.OWNER,
        },
      });

      return organization;
    });

    return {
      id: result.id,
      name: result.name,
      slug: result.slug,
      description: result.description,
      location: result.location,
      website: result.website,
      logoUrl: result.logoUrl,
      emailReplyTo: (result as any).emailReplyTo ?? null,
      emailSenderName: (result as any).emailSenderName ?? null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      userRole: OrgRole.OWNER,
    };
  }

  /**
   * Get all organizations for a user with their roles
   */
  async getUserOrganizations(userId: string): Promise<UserOrganizationsResponseDto> {
    const organizationUsers = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: {
        organization: {
          name: 'asc',
        },
      },
    });

    const organizations: UserOrganizationDto[] = organizationUsers.map((gu) => ({
      id: gu.organization.id,
      name: gu.organization.name,
      slug: gu.organization.slug,
      description: gu.organization.description,
      location: gu.organization.location,
      website: gu.organization.website,
      logoUrl: gu.organization.logoUrl,
      emailReplyTo: (gu.organization as any).emailReplyTo ?? null,
      emailSenderName: (gu.organization as any).emailSenderName ?? null,
      createdAt: gu.organization.createdAt,
      updatedAt: gu.organization.updatedAt,
      role: gu.role as OrgRole,
    }));

    return {
      organizations,
      hasOrganizations: organizations.length > 0,
    };
  }

  /**
   * Check if user belongs to any organizations
   */
  async userHasOrganizations(userId: string): Promise<boolean> {
    const count = await this.prisma.organizationMember.count({
      where: { userId },
    });
    return count > 0;
  }

  /**
   * Check if user has a specific role in a organization
   * Returns the role if user is a member, null otherwise
   */
  async getUserRoleInOrganization(userId: string, organizationId: string): Promise<OrgRole | null> {
    const organizationMember = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    // Convert Prisma OrgRole enum to shared OrgRole enum
    if (!organizationMember?.role) {
      return null;
    }
    return organizationMember.role as OrgRole;
  }

  /**
   * Get all users in a organization
   */
  async getOrganizationUsers(organizationId: string, userId: string) {
    // Check if user is a member of the organization
    const userRole = await this.getUserRoleInOrganization(userId, organizationId);
    if (!userRole) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get all organization users with user details
    const organizationUsers = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            emailVerifiedAt: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { role: 'asc' }, // OWNER first, then ADMIN, then MEMBER
    });

    // Sort by role priority, then by OrganizationMember creation date (when they joined the organization)
    const rolePriority: Record<OrgRole, number> = {
      OWNER: 1,
      ADMIN: 2,
      MEMBER: 3,
    };

    const sortedUsers = organizationUsers.sort((a, b) => {
      const roleDiff = rolePriority[a.role as OrgRole] - rolePriority[b.role as OrgRole];
      if (roleDiff !== 0) return roleDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return {
      users: sortedUsers.map((gu) => ({
        id: gu.id,
        userId: gu.userId,
        organizationId: gu.organizationId,
        role: gu.role as OrgRole,
        user: {
          id: gu.user.id,
          email: gu.user.email,
          name: gu.user.name,
          emailVerifiedAt: gu.user.emailVerifiedAt,
          lastLoginAt: gu.user.lastLoginAt,
          createdAt: gu.user.createdAt,
        },
        createdAt: gu.createdAt,
      })),
      total: sortedUsers.length,
    };
  }

  /**
   * Remove a user from a organization
   */
  async removeOrganizationUser(
    organizationId: string,
    targetUserId: string,
    requesterUserId: string,
  ) {
    // Check if requester is a member of the organization
    const requesterRole = await this.getUserRoleInOrganization(requesterUserId, organizationId);
    if (!requesterRole) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Only OWNER and ADMIN can remove users
    if (requesterRole !== OrgRole.OWNER && requesterRole !== OrgRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can remove users from the organization');
    }

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if target user is a member
    const targetOrganizationUser = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId,
        },
      },
    });

    if (!targetOrganizationUser) {
      throw new NotFoundException('User is not a member of this organization');
    }

    // Prevent removing yourself if you're the only OWNER
    if (
      targetUserId === requesterUserId &&
      targetOrganizationUser.role === PrismaOrganizationRole.OWNER
    ) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId,
          role: PrismaOrganizationRole.OWNER,
        },
      });

      if (ownerCount === 1) {
        throw new ForbiddenException(
          'Cannot remove yourself as the only owner of the organization',
        );
      }
    }

    // Prevent removing the last OWNER (even if not yourself)
    if (targetOrganizationUser.role === PrismaOrganizationRole.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId,
          role: PrismaOrganizationRole.OWNER,
        },
      });

      if (ownerCount === 1) {
        throw new ForbiddenException('Cannot remove the only owner of the organization');
      }
    }

    // Remove the user from the organization
    await this.prisma.organizationMember.delete({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId,
        },
      },
    });

    return {
      message: 'User removed from organization successfully',
      userId: targetUserId,
      organizationId,
    };
  }

  /**
   * Delete a organization entirely. Only an OWNER may do this. Deleting a organization
   * cascades to its members, invites, calendars, events, and sessions.
   */
  async deleteOrganization(
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; message: string }> {
    const requesterRole = await this.getUserRoleInOrganization(userId, organizationId);
    if (!requesterRole) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    if (requesterRole !== OrgRole.OWNER) {
      throw new ForbiddenException('Only the organization owner can delete the organization');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.prisma.organization.delete({
      where: { id: organizationId },
    });

    return { success: true, message: 'Organization deleted successfully' };
  }

  /**
   * Update a user's role in a organization
   */
  async updateOrganizationUserRole(
    organizationId: string,
    targetUserId: string,
    newRole: OrgRole,
    requesterUserId: string,
  ) {
    // Check if requester is a member of the organization
    const requesterRole = await this.getUserRoleInOrganization(requesterUserId, organizationId);
    if (!requesterRole) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Only OWNER and ADMIN can change roles
    if (requesterRole !== OrgRole.OWNER && requesterRole !== OrgRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can change user roles');
    }

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if target user is a member
    const targetOrganizationUser = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId,
        },
      },
    });

    if (!targetOrganizationUser) {
      throw new NotFoundException('User is not a member of this organization');
    }

    // Prevent changing the role of any OWNER (owners cannot have their role changed)
    if (targetOrganizationUser.role === PrismaOrganizationRole.OWNER && newRole !== OrgRole.OWNER) {
      throw new ForbiddenException('Cannot change the role of an owner');
    }

    // Prevent non-OWNER from changing someone to OWNER (only OWNERs can promote to OWNER)
    if (newRole === OrgRole.OWNER && requesterRole !== OrgRole.OWNER) {
      throw new ForbiddenException('Only owners can promote users to owner role');
    }

    // Update the user's role
    const updatedOrganizationUser = await this.prisma.organizationMember.update({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId,
        },
      },
      data: {
        role: newRole as unknown as PrismaOrganizationRole,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            emailVerifiedAt: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      id: updatedOrganizationUser.id,
      userId: updatedOrganizationUser.userId,
      organizationId: updatedOrganizationUser.organizationId,
      role: updatedOrganizationUser.role as OrgRole,
      user: {
        id: updatedOrganizationUser.user.id,
        email: updatedOrganizationUser.user.email,
        name: updatedOrganizationUser.user.name,
        emailVerifiedAt: updatedOrganizationUser.user.emailVerifiedAt,
        lastLoginAt: updatedOrganizationUser.user.lastLoginAt,
        createdAt: updatedOrganizationUser.user.createdAt,
      },
      createdAt: updatedOrganizationUser.createdAt,
    };
  }

  /**
   * Update a organization (name, description, location, website)
   */
  async updateOrganization(
    userId: string,
    organizationId: string,
    data: {
      name?: string;
      description?: string;
      location?: string;
      website?: string;
      logoUrl?: string;
    },
  ): Promise<OrganizationResponseDto> {
    // Check if user has permission (must be OWNER or ADMIN)
    const userRole = await this.getUserRoleInOrganization(userId, organizationId);
    if (!userRole || (userRole !== OrgRole.OWNER && userRole !== OrgRole.ADMIN)) {
      throw new ForbiddenException('Only owners and admins can update organizations');
    }

    // Get existing organization
    const existingOrganization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!existingOrganization) {
      throw new NotFoundException('Organization not found');
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) {
      updateData.name = sanitizeString(data.name);
      // Note: Slug is not updated when name changes - slugs are randomly generated and may be editable in the future
    }
    if (data.description !== undefined) {
      updateData.description = sanitizeString(data.description);
    }
    if (data.location !== undefined) {
      updateData.location = sanitizeOptionalString(data.location);
    }
    if (data.website !== undefined) {
      updateData.website = sanitizeOptionalString(data.website);
    }
    if (data.logoUrl !== undefined) {
      updateData.logoUrl = sanitizeOptionalString(data.logoUrl);
    }

    // Update organization
    const updatedOrganization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    return {
      id: updatedOrganization.id,
      name: updatedOrganization.name,
      slug: updatedOrganization.slug,
      description: updatedOrganization.description,
      location: updatedOrganization.location,
      website: updatedOrganization.website,
      logoUrl: updatedOrganization.logoUrl,
      emailReplyTo: (updatedOrganization as any).emailReplyTo ?? null,
      emailSenderName: (updatedOrganization as any).emailSenderName ?? null,
      createdAt: updatedOrganization.createdAt,
      updatedAt: updatedOrganization.updatedAt,
      userRole: userRole,
    };
  }

  /**
   * Update organization email settings
   */
  async updateOrganizationEmailSettings(
    userId: string,
    organizationId: string,
    data: {
      emailReplyTo?: string;
      emailSenderName?: string;
    },
  ): Promise<OrganizationResponseDto> {
    // Check if user has permission (must be OWNER or ADMIN)
    const userRole = await this.getUserRoleInOrganization(userId, organizationId);
    if (!userRole || (userRole !== OrgRole.OWNER && userRole !== OrgRole.ADMIN)) {
      throw new ForbiddenException('Only owners and admins can update organization settings');
    }

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Prepare update data
    const updateData: any = {};
    if (data.emailReplyTo !== undefined) {
      updateData.emailReplyTo = sanitizeOptionalString(data.emailReplyTo);
    }
    if (data.emailSenderName !== undefined) {
      updateData.emailSenderName = sanitizeOptionalString(data.emailSenderName);
    }

    // Update organization
    const updatedOrganization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    return {
      id: updatedOrganization.id,
      name: updatedOrganization.name,
      slug: updatedOrganization.slug,
      description: updatedOrganization.description,
      location: updatedOrganization.location,
      website: updatedOrganization.website,
      logoUrl: updatedOrganization.logoUrl,
      emailReplyTo: (updatedOrganization as any).emailReplyTo ?? null,
      emailSenderName: (updatedOrganization as any).emailSenderName ?? null,
      createdAt: updatedOrganization.createdAt,
      updatedAt: updatedOrganization.updatedAt,
      userRole: userRole,
    };
  }

  /**
   * Get a organization by ID — requires authentication but not organization membership
   */
  async getOrganizationById(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const userRole = await this.getUserRoleInOrganization(userId, organizationId);

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      location: organization.location,
      website: organization.website,
      logoUrl: organization.logoUrl,
      emailReplyTo: (organization as any).emailReplyTo ?? null,
      emailSenderName: (organization as any).emailSenderName ?? null,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      userRole: (userRole ?? OrgRole.MEMBER) as OrgRole,
    };
  }

  /**
   * Get public profile of a organization by slug
   */
  async getPublicOrganizationProfile(slug: string): Promise<PublicOrganizationDto> {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
      include: {
        domainMappings: {
          where: { verificationStatus: 'VERIFIED' },
          select: {
            domain: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      website: organization.website,
      location: organization.location,
      logoUrl: organization.logoUrl,
      domainMappings: organization.domainMappings,
    };
  }
}
