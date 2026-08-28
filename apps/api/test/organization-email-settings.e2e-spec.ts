import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Organization Email Settings (e2e)', () => {
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
    const email = `test-e2e-email-settings-${Date.now()}@example.com`;
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

    // Manually verify email in DB for E2E tests
    await prisma.user.update({
      where: { id: testUserId },
      data: { emailVerifiedAt: new Date() },
    });
  });

  afterAll(async () => {
    if (prisma) {
      const testUsers = await prisma.user.findMany({
        where: {
          email: {
            startsWith: 'test-e2e-email-settings-',
          },
        },
        select: { id: true },
      });
      const userIds = testUsers.map((u) => u.id);

      if (userIds.length > 0) {
        // Delete organization users first
        await prisma.organizationMember.deleteMany({
          where: { userId: { in: userIds } },
        });

        // Delete notifications
        await prisma.notification.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.notification.deleteMany({
          where: { recipientEmail: { startsWith: 'invitee-' } },
        });

        // Delete speaker invitations

        // Delete events

        // Delete organizations
        await prisma.organization.deleteMany({
          where: {
            members: {
              some: {
                userId: { in: userIds },
              },
            },
          },
        });

        // Finally delete users
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('PATCH /api/organizations/:organizationId/email-settings', () => {
    let organizationId: string;

    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Organization Email Settings',
          description: 'Test Description',
        })
        .expect(201);

      organizationId = createResponse.body.id;
    });

    it('should update organization email settings', () => {
      return request(app.getHttpServer())
        .patch(`/api/organizations/${organizationId}/email-settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailReplyTo: 'reply@example.com',
          emailSenderName: 'Custom Sender',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.emailReplyTo).toBe('reply@example.com');
          expect(res.body.emailSenderName).toBe('Custom Sender');
        });
    });

    it('should clear organization email settings with null', () => {
      return request(app.getHttpServer())
        .patch(`/api/organizations/${organizationId}/email-settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailReplyTo: null,
          emailSenderName: null,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.emailReplyTo).toBeNull();
          expect(res.body.emailSenderName).toBeNull();
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .patch(`/api/organizations/${organizationId}/email-settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailReplyTo: 'not-an-email',
        })
        .expect(400);
    });

    it('should return 403 when user is not owner/admin', async () => {
      // Create another user
      const otherEmail = `test-e2e-other-${Date.now()}@example.com`;
      const otherSignupResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: otherEmail,
          password: 'TestPassword123!',
          name: 'Other User',
        })
        .expect(201);

      const otherToken = otherSignupResponse.body.accessToken;
      const otherUserId = otherSignupResponse.body.user.id;

      await prisma.user.update({
        where: { id: otherUserId },
        data: { emailVerifiedAt: new Date() },
      });

      return request(app.getHttpServer())
        .patch(`/api/organizations/${organizationId}/email-settings`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          emailReplyTo: 'other@example.com',
        })
        .expect(403);
    });
  });
});
