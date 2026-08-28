import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainMapping, DomainVerificationStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { DnsService } from '../../common/services/dns.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class DomainMappingService {
  private readonly RESOLUTION_CACHE_TTL = 300; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private dnsService: DnsService,
    private redisService: RedisService,
  ) {}

  async createDomainMapping(organizationId: string, domain: string): Promise<DomainMapping> {
    const normalizedDomain = this.normalizeDomain(domain);

    if (!this.validateDomainFormat(normalizedDomain)) {
      throw new BadRequestException(`Invalid domain format: ${domain}`);
    }

    const existing = await this.prisma.domainMapping.findUnique({
      where: { domain: normalizedDomain },
    });

    if (existing) {
      throw new ConflictException(`Domain ${domain} is already mapped to another organization`);
    }

    return this.prisma.domainMapping.create({
      data: {
        organizationId,
        domain: normalizedDomain,
        verificationToken: uuidv4(),
        verificationStatus: DomainVerificationStatus.PENDING,
      },
    });
  }

  async listDomainMappings(organizationId: string): Promise<DomainMapping[]> {
    return this.prisma.domainMapping.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDomainMapping(organizationId: string, mappingId: string): Promise<DomainMapping | null> {
    return this.prisma.domainMapping.findFirst({
      where: { id: mappingId, organizationId },
    });
  }

  async updateDomainMapping(
    organizationId: string,
    mappingId: string,
    data: {
      customLogoUrl?: string | null;
      customFaviconUrl?: string | null;
      logoHeight?: number | null;
    },
  ): Promise<DomainMapping> {
    const mapping = await this.prisma.domainMapping.findFirst({
      where: { id: mappingId, organizationId },
    });

    if (!mapping) {
      throw new BadRequestException('Domain mapping not found');
    }

    const updated = await this.prisma.domainMapping.update({
      where: { id: mappingId },
      data: {
        customLogoUrl: data.customLogoUrl === undefined ? undefined : data.customLogoUrl,
        customFaviconUrl: data.customFaviconUrl === undefined ? undefined : data.customFaviconUrl,
        logoHeight: data.logoHeight === undefined ? undefined : data.logoHeight,
      },
    });

    // Invalidate cache
    await this.invalidateResolutionCache(mapping.domain);

    return updated;
  }

  async deleteDomainMapping(organizationId: string, mappingId: string): Promise<void> {
    const mapping = await this.prisma.domainMapping.findFirst({
      where: { id: mappingId, organizationId },
    });

    if (!mapping) {
      return;
    }

    await this.prisma.domainMapping.delete({
      where: { id: mappingId },
    });

    await this.invalidateResolutionCache(mapping.domain);
  }

  async findByDomain(domain: string): Promise<DomainMapping | null> {
    const normalizedDomain = this.normalizeDomain(domain);
    return this.prisma.domainMapping.findUnique({
      where: { domain: normalizedDomain },
    });
  }

  async verifyDomain(organizationId: string, mappingId: string): Promise<DomainMapping> {
    const mapping = await this.prisma.domainMapping.findFirst({
      where: { id: mappingId, organizationId },
    });

    if (!mapping) {
      throw new BadRequestException('Domain mapping not found');
    }

    if (mapping.verificationStatus === DomainVerificationStatus.VERIFIED) {
      return mapping;
    }

    const verified = await this.dnsService.verifyTxtRecord(
      mapping.domain,
      mapping.verificationToken,
    );

    if (verified) {
      const updated = await this.prisma.domainMapping.update({
        where: { id: mappingId },
        data: {
          verificationStatus: DomainVerificationStatus.VERIFIED,
          verifiedAt: new Date(),
          errorMessage: null,
        },
      });

      // Invalidate cache
      await this.invalidateResolutionCache(mapping.domain);

      return updated;
    } else {
      const updated = await this.prisma.domainMapping.update({
        where: { id: mappingId },
        data: {
          verificationStatus: DomainVerificationStatus.FAILED,
          errorMessage: 'DNS TXT record not found or mismatch',
        },
      });
      return updated;
    }
  }

  async resolveDomain(domain: string): Promise<any | null> {
    const normalizedDomain = this.normalizeDomain(domain);

    // Check cache
    const cached = await this.redisService.get(this.getCacheKey(normalizedDomain));
    if (cached) {
      return JSON.parse(cached);
    }

    const mapping = await this.prisma.domainMapping.findFirst({
      where: {
        domain: normalizedDomain,
        verificationStatus: DomainVerificationStatus.VERIFIED,
      },
      include: {
        organization: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });

    if (!mapping) {
      return null;
    }

    const resolution = {
      organizationId: mapping.organization.id,
      organizationSlug: mapping.organization.slug,
      domain: mapping.domain,
      verificationStatus: mapping.verificationStatus,
      customLogoUrl: mapping.customLogoUrl,
      customFaviconUrl: mapping.customFaviconUrl,
      logoHeight: mapping.logoHeight,
    };

    // Store in cache
    await this.redisService.set(
      this.getCacheKey(normalizedDomain),
      JSON.stringify(resolution),
      this.RESOLUTION_CACHE_TTL,
    );

    return resolution;
  }

  private getCacheKey(domain: string): string {
    return `domain:resolution:${domain}`;
  }

  private async invalidateResolutionCache(domain: string): Promise<void> {
    await this.redisService.del(this.getCacheKey(this.normalizeDomain(domain)));
  }

  public validateDomainFormat(domain: string): boolean {
    // RFC 1123 hostname validation
    // - Max 253 characters
    // - Labels max 63 characters
    // - Only alphanumeric and hyphens
    // - Labels cannot start or end with hyphen
    // - No protocol, no path
    if (!domain || domain.length > 253) return false;

    // Check for protocol or path
    if (domain.includes('://') || domain.includes('/')) return false;

    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
    return domainRegex.test(domain);
  }

  /**
   * Confirm that a domain-scoped entity belongs to the organization the domain
   * resolves to. The boilerplate ships with no domain-scoped entity types; add
   * cases here as verticals are introduced.
   */
  async verifyEntity(domain: string, _entityType: string, _entitySlug: string): Promise<boolean> {
    const resolution = await this.resolveDomain(domain);
    return resolution !== null;
  }

  public normalizeDomain(domain: string): string {
    let normalized = domain.trim().toLowerCase();

    // Remove protocol
    if (normalized.includes('://')) {
      const parts = normalized.split('://');
      if (parts.length > 1) {
        normalized = parts[1];
      }
    }

    // Remove path
    if (normalized.includes('/')) {
      normalized = normalized.split('/')[0];
    }

    // Remove port
    if (normalized.includes(':')) {
      normalized = normalized.split(':')[0];
    }

    return normalized;
  }
}
