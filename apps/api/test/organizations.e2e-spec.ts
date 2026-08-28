import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('OrganizationsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    // Create a test user and get auth token
    const email = `test-e2e-organizations-${Date.now()}@example.com`;
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
    await prisma.user.update({
      where: { id: testUserId },
      data: { emailVerifiedAt: new Date() },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (prisma) {
      const testUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { startsWith: 'test-e2e-organizations-' } },
            { email: { startsWith: 'test-e2e-no-organizations-' } },
          ],
        },
        select: { id: true },
      });
      const userIds = testUsers.map((u) => u.id);

      // Delete child rows before parents to satisfy FK constraints.
      // Default calendars are auto-created on organization creation and reference
      // the creating user via calendars.createdBy (onDelete: Restrict).
      await prisma.organizationMember.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.organization.deleteMany({
        where: {
          name: {
            contains: 'Test Organization',
          },
        },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('POST /api/organizations', () => {
    it('should create a organization with valid data', () => {
      return request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Organization E2E',
          description: 'Test Description',
          location: 'San Francisco',
          website: 'https://example.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('slug');
          expect(res.body.name).toBe('Test Organization E2E');
          // Slugs are now randomly generated, not derived from the name.
          expect(typeof res.body.slug).toBe('string');
          expect(res.body.slug.length).toBeGreaterThan(0);
          expect(res.body.description).toBe('Test Description');
          expect(res.body.location).toBe('San Francisco');
          expect(res.body.website).toBe('https://example.com');
          expect(res.body.userRole).toBe('OWNER');
        });
    });

    it('should create a organization with only required fields', () => {
      return request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Organization Required Only',
          description: 'Test Description',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Test Organization Required Only');
          expect(res.body.location).toBeNull();
          expect(res.body.website).toBeNull();
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/organizations')
        .send({
          name: 'Test Organization',
          description: 'Test Description',
        })
        .expect(401);
    });

    it('should return 400 for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing name (the only required field; description is optional)
          description: 'Test Description',
        })
        .expect(400);
    });

    it('should return 400 for invalid URL format', () => {
      return request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Organization',
          description: 'Test Description',
          website: 'not-a-valid-url',
        })
        .expect(400);
    });

    it('should generate unique slug when duplicate name exists', async () => {
      const organizationName = 'Test Organization Duplicate Slug';

      // Create first organization
      const firstResponse = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: organizationName,
          description: 'Test Description',
        })
        .expect(201);

      expect(typeof firstResponse.body.slug).toBe('string');
      expect(firstResponse.body.slug.length).toBeGreaterThan(0);

      // Create second organization with same name
      const secondResponse = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: organizationName,
          description: 'Test Description',
        })
        .expect(201);

      // Slugs are randomly generated and guaranteed unique even for duplicate names.
      expect(typeof secondResponse.body.slug).toBe('string');
      expect(secondResponse.body.slug.length).toBeGreaterThan(0);
      expect(secondResponse.body.slug).not.toBe(firstResponse.body.slug);
    });
  });

  describe('GET /api/organizations/user', () => {
    it('should return user organizations', async () => {
      // Create a organization first
      await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Organization For List',
          description: 'Test Description',
        })
        .expect(201);

      return request(app.getHttpServer())
        .get('/api/organizations/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('organizations');
          expect(res.body).toHaveProperty('hasOrganizations');
          expect(Array.isArray(res.body.organizations)).toBe(true);
          expect(res.body.hasOrganizations).toBe(true);
          expect(res.body.organizations.length).toBeGreaterThan(0);
          expect(res.body.organizations[0]).toHaveProperty('id');
          expect(res.body.organizations[0]).toHaveProperty('slug');
          expect(res.body.organizations[0]).toHaveProperty('role');
        });
    });

    it('should return empty array when user has no organizations', async () => {
      // Create a new user without organizations
      const email = `test-e2e-no-organizations-${Date.now()}@example.com`;
      const signupResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email,
          password: 'TestPassword123!',
        })
        .expect(201);

      const newAuthToken = signupResponse.body.accessToken;
      // GET /api/organizations/user is guarded by EmailVerifiedGuard; mark verified.
      await prisma.user.update({
        where: { id: signupResponse.body.user.id },
        data: { emailVerifiedAt: new Date() },
      });

      return request(app.getHttpServer())
        .get('/api/organizations/user')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('organizations');
          expect(res.body).toHaveProperty('hasOrganizations');
          expect(res.body.organizations).toHaveLength(0);
          expect(res.body.hasOrganizations).toBe(false);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/api/organizations/user').expect(401);
    });
  });
});
