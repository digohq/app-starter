import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AdminImpersonationController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const IMPERSONATION_API_KEY = 'test-impersonation-key';

  beforeAll(async () => {
    process.env.IMPERSONATION_API_KEY = IMPERSONATION_API_KEY;
    process.env.JWT_IMPERSONATION_ACCESS_TOKEN_EXPIRATION = '10m';
    process.env.IMPERSONATION_ACTOR_LABEL = 'e2e-operator';

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
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.adminImpersonationAudit.deleteMany({
      where: {
        actor: 'e2e-operator',
      },
    });

    const users = await prisma.user.findMany({
      where: {
        email: {
          startsWith: 'test-e2e-imp-',
        },
      },
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }

    await prisma.$disconnect();
    await app.close();
  });

  it('mints an access token that authenticates as the target user', async () => {
    const email = `test-e2e-imp-${Date.now()}@example.com`;

    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email,
        password: 'TestPassword123!',
        name: 'Impersonated User',
      })
      .expect(201);

    const targetUserId = signupRes.body.user.id as string;

    const impersonateRes = await request(app.getHttpServer())
      .post('/admin/impersonate')
      .set('Authorization', `Bearer ${IMPERSONATION_API_KEY}`)
      .send({
        targetUserId,
        reason: 'e2e test',
      })
      .expect(201);

    expect(impersonateRes.body).toHaveProperty('accessToken');
    expect(impersonateRes.body).toHaveProperty('expiresIn');
    expect(impersonateRes.body).toHaveProperty('tokenType', 'Bearer');

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${impersonateRes.body.accessToken}`)
      .expect(200);

    expect(meRes.body.email).toBe(email);

    const audit = await prisma.adminImpersonationAudit.findFirst({
      where: { targetUserId },
      orderBy: { createdAt: 'desc' },
    });

    expect(audit).toBeTruthy();
    expect(audit?.reason).toBe('e2e test');
    expect(audit?.actor).toBe('e2e-operator');
  });

  it('returns 401 for invalid key and does not create an audit record', async () => {
    const email = `test-e2e-imp-${Date.now()}@example.com`;

    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email,
        password: 'TestPassword123!',
      })
      .expect(201);

    const targetUserId = signupRes.body.user.id as string;

    const beforeCount = await prisma.adminImpersonationAudit.count({
      where: { targetUserId },
    });

    await request(app.getHttpServer())
      .post('/admin/impersonate')
      .set('Authorization', 'Bearer wrong-key')
      .send({
        targetUserId,
        reason: 'should not be logged',
      })
      .expect(401);

    const afterCount = await prisma.adminImpersonationAudit.count({
      where: { targetUserId },
    });

    expect(afterCount).toBe(beforeCount);
  });
});
