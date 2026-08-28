import { Test, TestingModule } from '@nestjs/testing';
import { DomainMappingService } from './domain-mapping.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { DnsService } from '../../common/services/dns.service';
import { RedisService } from '../../redis/redis.service';

describe('DomainMappingService', () => {
  let service: DomainMappingService;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DomainMappingService,
        {
          provide: PrismaService,
          useValue: {
            domainMapping: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: DnsService,
          useValue: {
            verifyTxtRecord: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DomainMappingService>(DomainMappingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('validateDomainFormat', () => {
    it('should return true for valid domains', () => {
      expect(service.validateDomainFormat('example.com')).toBe(true);
      expect(service.validateDomainFormat('events.company.com')).toBe(true);
      expect(service.validateDomainFormat('my-domain.co.uk')).toBe(true);
      expect(service.validateDomainFormat('sub.sub.sub.domain.com')).toBe(true);
    });

    it('should return false for invalid domains', () => {
      expect(service.validateDomainFormat('example')).toBe(false);
      expect(service.validateDomainFormat('http://example.com')).toBe(false);
      expect(service.validateDomainFormat('https://example.com')).toBe(false);
      expect(service.validateDomainFormat('example.com/path')).toBe(false);
      expect(service.validateDomainFormat('-example.com')).toBe(false);
      expect(service.validateDomainFormat('example-.com')).toBe(false);
      expect(service.validateDomainFormat('example..com')).toBe(false);
      expect(service.validateDomainFormat('')).toBe(false);
      expect(service.validateDomainFormat('a'.repeat(254))).toBe(false);
    });
  });

  describe('normalizeDomain', () => {
    it('should trim and lowercase the domain', () => {
      expect(service.normalizeDomain('  Example.COM  ')).toBe('example.com');
      expect(service.normalizeDomain('EVENTS.company.com')).toBe('events.company.com');
    });
  });

  describe('createDomainMapping', () => {
    it('should create a new domain mapping', async () => {
      const organizationId = 'organization-1';
      const domain = 'events.company.com';

      (prisma.domainMapping.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.domainMapping.create as jest.Mock).mockResolvedValue({
        id: '1',
        organizationId,
        domain: 'events.company.com',
      });

      const result = await service.createDomainMapping(organizationId, domain);

      expect(result).toBeDefined();
      expect(prisma.domainMapping.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId,
            domain: 'events.company.com',
            verificationToken: expect.any(String),
            verificationStatus: 'PENDING',
          }),
        }),
      );
    });

    it('should throw ConflictException if domain already exists', async () => {
      const organizationId = 'organization-1';
      const domain = 'events.company.com';

      (prisma.domainMapping.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(service.createDomainMapping(organizationId, domain)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if domain format is invalid', async () => {
      const organizationId = 'organization-1';
      const domain = 'invalid domain';

      await expect(service.createDomainMapping(organizationId, domain)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyDomain', () => {
    let dnsService: DnsService;

    beforeEach(() => {
      dnsService = module.get<DnsService>(DnsService);
    });

    it('should verify domain mapping if TXT record matches', async () => {
      const organizationId = 'organization-1';
      const mappingId = 'mapping-1';
      const mapping = {
        id: mappingId,
        organizationId,
        domain: 'events.company.com',
        verificationToken: 'token-123',
        verificationStatus: 'PENDING',
      };

      (prisma.domainMapping.findFirst as jest.Mock).mockResolvedValue(mapping);
      (dnsService.verifyTxtRecord as jest.Mock).mockResolvedValue(true);
      (prisma.domainMapping.update as jest.Mock).mockResolvedValue({
        ...mapping,
        verificationStatus: 'VERIFIED',
      });

      const result = await service.verifyDomain(organizationId, mappingId);

      expect(result.verificationStatus).toBe('VERIFIED');
      expect(prisma.domainMapping.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mappingId },
          data: expect.objectContaining({
            verificationStatus: 'VERIFIED',
          }),
        }),
      );
    });

    it('should set status to FAILED if TXT record does not match', async () => {
      const organizationId = 'organization-1';
      const mappingId = 'mapping-1';
      const mapping = {
        id: mappingId,
        organizationId,
        domain: 'events.company.com',
        verificationToken: 'token-123',
        verificationStatus: 'PENDING',
      };

      (prisma.domainMapping.findFirst as jest.Mock).mockResolvedValue(mapping);
      (dnsService.verifyTxtRecord as jest.Mock).mockResolvedValue(false);
      (prisma.domainMapping.update as jest.Mock).mockResolvedValue({
        ...mapping,
        verificationStatus: 'FAILED',
      });

      const result = await service.verifyDomain(organizationId, mappingId);

      expect(result.verificationStatus).toBe('FAILED');
      expect(prisma.domainMapping.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mappingId },
          data: expect.objectContaining({
            verificationStatus: 'FAILED',
          }),
        }),
      );
    });
  });

  describe('resolveDomain', () => {
    let redisService: RedisService;

    beforeEach(() => {
      redisService = module.get<RedisService>(RedisService);
    });

    it('should return cached resolution if available', async () => {
      const domain = 'events.company.com';
      const cached = JSON.stringify({
        organizationId: 'organization-1',
        organizationSlug: 'slug-1',
      });

      (redisService.get as jest.Mock).mockResolvedValue(cached);

      const result = await service.resolveDomain(domain);

      expect(result.organizationId).toBe('organization-1');
      expect(prisma.domainMapping.findUnique).not.toHaveBeenCalled();
    });

    it('should resolve and cache if not in cache', async () => {
      const domain = 'events.company.com';
      const mapping = {
        domain,
        verificationStatus: 'VERIFIED',
        organization: { id: 'organization-1', slug: 'slug-1' },
      };

      (redisService.get as jest.Mock).mockResolvedValue(null);
      (prisma.domainMapping.findFirst as jest.Mock).mockResolvedValue(mapping);

      const result = await service.resolveDomain(domain);

      expect(result?.organizationId).toBe('organization-1');
      expect(redisService.set).toHaveBeenCalled();
    });
  });
});
