import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DnsService } from '../src/common/services/dns.service';
import { DomainVerificationStatus } from '@prisma/client';

describe('DomainMapping (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;
  let otherUserId: string;
  let testOrganizationId: string;
  let dnsService: DnsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DnsService)
      .useValue({
        verifyTxtRecord: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    dnsService = moduleFixture.get<DnsService>(DnsService);

    // Create a test user
    const email = `test-e2e-domains-${Date.now()}@example.com`;
    const signupResponse = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email,
        password: 'TestPassword123!',
        name: 'Test User',
      })
      .expect(201);

    authToken = signupResponse.body.accessToken;
    testUserId = signupResponse.body.user.id;

    // Manually verify email
    await prisma.user.update({
      where: { id: testUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // Create a test organization
    const organizationResponse = await request(app.getHttpServer())
      .post('/api/organizations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Organization for Domains',
        description: 'Test Description',
      })
      .expect(201);

    testOrganizationId = organizationResponse.body.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.domainMapping.deleteMany({
        where: { organizationId: testOrganizationId },
      });
      await prisma.organization.deleteMany({
        where: { id: testOrganizationId },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testUserId, otherUserId].filter(Boolean) } },
      });
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('Full Workflow', () => {
    let mappingId: string;
    const domain = 'events.e2e-test.com';

    it('should create a domain mapping', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/organizations/${testOrganizationId}/domain-mappings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ domain })
        .expect(201);

      expect(res.body.domain).toBe(domain);
      expect(res.body.verificationStatus).toBe(DomainVerificationStatus.PENDING);
      expect(res.body.verificationToken).toBeDefined();
      mappingId = res.body.id;
    });

    it('should list domain mappings for a organization', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${testOrganizationId}/domain-mappings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.domainMappings).toHaveLength(1);
      expect(res.body.domainMappings[0].domain).toBe(domain);
    });

    it('should fail resolution if not verified', async () => {
      await request(app.getHttpServer())
        .get(`/api/domain-mappings/resolve?domain=${domain}`)
        .expect(404);
    });

    it('should verify the domain', async () => {
      (dnsService.verifyTxtRecord as jest.Mock).mockResolvedValue(true);

      const res = await request(app.getHttpServer())
        .post(`/api/organizations/${testOrganizationId}/domain-mappings/${mappingId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.verificationStatus).toBe(DomainVerificationStatus.VERIFIED);
      expect(res.body.verifiedAt).toBeDefined();
    });

    it('should resolve the domain after verification', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/domain-mappings/resolve?domain=${domain}`)
        .expect(200);

      expect(res.body.organizationId).toBe(testOrganizationId);
      expect(res.body.domain).toBe(domain);
      expect(res.body.customLogoUrl).toBeNull();
    });

    it('should update the custom logo URL', async () => {
      const customLogoUrl = 'https://example.com/logo.png';
      const res = await request(app.getHttpServer())
        .patch(`/api/organizations/${testOrganizationId}/domain-mappings/${mappingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customLogoUrl })
        .expect(200);

      expect(res.body.customLogoUrl).toBe(customLogoUrl);
    });

    it('should update the custom favicon URL', async () => {
      const customFaviconUrl = 'https://example.com/favicon.ico';
      const res = await request(app.getHttpServer())
        .patch(`/api/organizations/${testOrganizationId}/domain-mappings/${mappingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customFaviconUrl })
        .expect(200);

      expect(res.body.customFaviconUrl).toBe(customFaviconUrl);
    });

    it('should include custom logo and favicon in resolution after update', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/domain-mappings/resolve?domain=${domain}`)
        .expect(200);

      expect(res.body.customLogoUrl).toBe('https://example.com/logo.png');
      expect(res.body.customFaviconUrl).toBe('https://example.com/favicon.ico');
    });

    it('should fail to update logo with invalid URL', async () => {
      await request(app.getHttpServer())
        .patch(`/api/organizations/${testOrganizationId}/domain-mappings/${mappingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customLogoUrl: 'not-a-url' })
        .expect(400);
    });

    it('should fail to update favicon with invalid URL', async () => {
      await request(app.getHttpServer())
        .patch(`/api/organizations/${testOrganizationId}/domain-mappings/${mappingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customFaviconUrl: 'not-a-url' })
        .expect(400);
    });

    it('should delete the domain mapping', async () => {
      await request(app.getHttpServer())
        .delete(`/api/organizations/${testOrganizationId}/domain-mappings/${mappingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const listRes = await request(app.getHttpServer())
        .get(`/api/organizations/${testOrganizationId}/domain-mappings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listRes.body.domainMappings).toHaveLength(0);
    });

    it('should return 404 for resolved domain after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/domain-mappings/resolve?domain=${domain}`)
        .expect(404);
    });
  });

  describe('Permissions', () => {
    let otherAuthToken: string;

    beforeAll(async () => {
      // Create another user
      const email = `test-e2e-other-${Date.now()}@example.com`;
      const signupResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email,
          password: 'TestPassword123!',
          name: 'Other User',
        })
        .expect(201);

      otherAuthToken = signupResponse.body.accessToken;
      otherUserId = signupResponse.body.user.id;

      // Manually verify email for other user
      await prisma.user.update({
        where: { id: otherUserId },
        data: { emailVerifiedAt: new Date() },
      });
    });

    it('should return 403 when non-admin tries to create mapping', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${testOrganizationId}/domain-mappings`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({ domain: 'other.com' })
        .expect(403);
    });
  });
});
