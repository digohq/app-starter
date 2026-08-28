import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AdminDashboardController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up venue submissions and venues created by e2e

    const users = await prisma.user.findMany({
      where: {
        email: {
          startsWith: 'admin-e2e-',
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

  const createUserAndLogin = async (opts?: { isGlobalAdmin?: boolean }) => {
    const email = `admin-e2e-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 6)}@example.com`;

    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email,
        password: 'TestPassword123!',
        name: 'Admin E2E User',
      })
      .expect(201);

    const userId = signupRes.body.user.id as string;

    if (opts?.isGlobalAdmin) {
      await prisma.user.update({
        where: { id: userId },
        data: { isGlobalAdmin: true },
      });
    }

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password: 'TestPassword123!',
      })
      .expect(200);

    const accessToken = loginRes.body.accessToken as string;

    return { userId, accessToken };
  };

  it('returns 401 for unauthenticated access to admin dashboard', async () => {
    await request(app.getHttpServer()).get('/admin/dashboard/users').expect(401);
  });

  it('returns 403 for non-global admin user', async () => {
    const { accessToken } = await createUserAndLogin({ isGlobalAdmin: false });

    await request(app.getHttpServer())
      .get('/admin/dashboard/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('allows global admin to fetch users list', async () => {
    const { accessToken } = await createUserAndLogin({ isGlobalAdmin: true });

    const res = await request(app.getHttpServer())
      .get('/admin/dashboard/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    if (res.body.items.length > 0) {
      expect(res.body.items[0]).toHaveProperty('email');
      expect(res.body.items[0]).toHaveProperty('isGlobalAdmin');
    }
  });

  it('dashboard impersonate: global admin gets token and target user can use it; admin session unchanged', async () => {
    const admin = await createUserAndLogin({ isGlobalAdmin: true });
    const target = await createUserAndLogin({ isGlobalAdmin: false });

    const impersonateRes = await request(app.getHttpServer())
      .post('/admin/dashboard/impersonate')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        targetUserId: target.userId,
        reason: 'e2e dashboard impersonation',
      })
      .expect(201);

    expect(impersonateRes.body).toHaveProperty('accessToken');
    expect(impersonateRes.body).toHaveProperty('redirectUrl');

    const meAsTarget = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${impersonateRes.body.accessToken}`)
      .expect(200);

    const targetUser = await prisma.user.findUnique({
      where: { id: target.userId },
      select: { email: true },
    });
    expect(meAsTarget.body.id).toBe(target.userId);
    expect(meAsTarget.body.email).toBe(targetUser?.email);

    const meAsAdmin = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(meAsAdmin.body.id).toBe(admin.userId);
  });
});
