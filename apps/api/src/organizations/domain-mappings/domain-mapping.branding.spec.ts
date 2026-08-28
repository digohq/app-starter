import { Test, TestingModule } from '@nestjs/testing';
import { DomainMappingService } from './domain-mapping.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DnsService } from '../../common/services/dns.service';
import { RedisService } from '../../redis/redis.service';
import { BadRequestException } from '@nestjs/common';
import { DomainVerificationStatus } from '@prisma/client';

describe('DomainMappingService (Branding)', () => {
  let service: DomainMappingService;

  const mockPrismaService = {
    domainMapping: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockDnsService = {};
  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainMappingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DnsService, useValue: mockDnsService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<DomainMappingService>(DomainMappingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateDomainMapping', () => {
    it('should update the custom logo and favicon URL', async () => {
      const organizationId = 'organization-1';
      const mappingId = 'mapping-1';
      const customLogoUrl = 'https://example.com/logo.png';
      const customFaviconUrl = 'https://example.com/favicon.ico';
      const mapping = { id: mappingId, organizationId, domain: 'example.com' };

      (mockPrismaService.domainMapping.findFirst as jest.Mock).mockResolvedValue(mapping);
      (mockPrismaService.domainMapping.update as jest.Mock).mockResolvedValue({
        ...mapping,
        customLogoUrl,
        customFaviconUrl,
      });

      const result = await service.updateDomainMapping(organizationId, mappingId, {
        customLogoUrl,
        customFaviconUrl,
      });

      expect(mockPrismaService.domainMapping.update).toHaveBeenCalledWith({
        where: { id: mappingId },
        data: { customLogoUrl, customFaviconUrl },
      });
      expect(result.customLogoUrl).toBe(customLogoUrl);
      expect(result.customFaviconUrl).toBe(customFaviconUrl);
      expect(mockRedisService.del).toHaveBeenCalled();
    });

    it('should throw BadRequestException if mapping not found', async () => {
      (mockPrismaService.domainMapping.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateDomainMapping('g1', 'm1', { customFaviconUrl: 'url' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveDomain', () => {
    it('should include customFaviconUrl in resolution', async () => {
      const domain = 'example.com';
      const mapping = {
        domain,
        verificationStatus: DomainVerificationStatus.VERIFIED,
        customLogoUrl: 'https://example.com/logo.png',
        customFaviconUrl: 'https://example.com/favicon.ico',
        organization: {
          id: 'organization-1',
          slug: 'organization-1',
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      (mockPrismaService.domainMapping.findFirst as jest.Mock).mockResolvedValue(mapping);

      const result = await service.resolveDomain(domain);

      expect(result.customLogoUrl).toBe('https://example.com/logo.png');
      expect(result.customFaviconUrl).toBe('https://example.com/favicon.ico');
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });
});
