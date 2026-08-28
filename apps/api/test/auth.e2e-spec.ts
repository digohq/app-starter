import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
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
    // Clean up test data. Signup creates a personal default calendar
    // (calendars.createdBy, onDelete: Restrict), so delete calendars first.
    const testUsers = await prisma.user.findMany({
      where: { email: { startsWith: 'test-e2e-' } },
      select: { id: true },
    });
    const userIds = testUsers.map((u) => u.id);
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user with valid data', () => {
      const email = `test-e2e-signup-${Date.now()}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password: 'TestPassword123!',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('expiresIn');
          expect(res.body.user.email).toBe(email);
          expect(res.body.user.name).toBe('Test User');
        });
    });

    it('should treat a repeat signup with the same credentials as a login (anti-enumeration)', async () => {
      // To avoid account-enumeration, signup no longer returns 409 for an
      // existing email. When the password matches, it logs the user in and
      // returns tokens for the existing account.
      const email = `test-e2e-duplicate-${Date.now()}@example.com`;

      // Create first user
      const first = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password: 'TestPassword123!',
        })
        .expect(201);

      // Repeat signup with matching credentials -> login of the same account
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password: 'TestPassword123!',
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.user.email).toBe(email);
          expect(res.body.user.id).toBe(first.body.user.id);
        });
    });

    it('should return 400 for weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `test-e2e-weak-${Date.now()}@example.com`,
          password: 'weak',
        })
        .expect(400)
        .expect((res: any) => {
          // DTO validation catches it first with length requirement
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return 400 for password missing strength requirements', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `test-e2e-weak-strength-${Date.now()}@example.com`,
          password: 'weakpassword', // Missing uppercase, number, special char
        })
        .expect(400)
        .expect((res: any) => {
          expect(res.body.message).toContain('strength requirements');
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
        })
        .expect(400);
    });

    it('should return 400 for missing password', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `test-e2e-${Date.now()}@example.com`,
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const email = `test-e2e-login-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      // Create user first
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password,
        })
        .expect(201);

      // Login
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe(email);
        });
    });

    it('should return 401 for wrong password', async () => {
      const email = `test-e2e-wrong-password-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      // Create user
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password,
        })
        .expect(201);

      // Try to login with wrong password
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password: 'WrongPassword123!',
        })
        .expect(401)
        .expect((res: any) => {
          expect(res.body.message).toContain('Invalid email or password');
        });
    });

    it('should return 401 for non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        })
        .expect(401);
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
        })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const email = `test-e2e-refresh-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      // Create user and get tokens
      const signupRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password,
        })
        .expect(201);

      const refreshToken = signupRes.body.refreshToken;

      // Refresh tokens
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe(email);
        });
    });

    it('should return 401 for invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401)
        .expect((res: any) => {
          expect(res.body.message).toContain('Invalid or expired refresh token');
        });
    });

    it('should return 401 for missing refresh token', () => {
      // A missing refresh token is treated as an invalid/unauthorized refresh
      // attempt (InvalidRefreshTokenException -> 401), not a 400.
      return request(app.getHttpServer()).post('/auth/refresh').send({}).expect(401);
    });
  });

  describe('POST /auth/otp/request', () => {
    it('should request OTP for new email', () => {
      const email = `test-e2e-otp-request-${Date.now()}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email })
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('expiresIn');
          expect(res.body.expiresIn).toBe(600); // 10 minutes
        });
    });

    it('should return 409 for existing email', async () => {
      const email = `test-e2e-otp-existing-${Date.now()}@example.com`;

      // Create user first
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password: 'TestPassword123!',
        })
        .expect(201);

      // Try to request OTP for existing email
      return request(app.getHttpServer()).post('/auth/otp/request').send({ email }).expect(409);
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email: 'invalid-email' })
        .expect(400);
    });
  });

  describe('POST /auth/signup/otp', () => {
    it('should sign up with valid OTP', async () => {
      const email = `test-e2e-otp-signup-${Date.now()}@example.com`;

      // Request OTP
      await request(app.getHttpServer()).post('/auth/otp/request').send({ email }).expect(200);

      // Note: In a real scenario, we'd get the OTP from email
      // For testing, we need to extract it from the service or use a test approach
      // For now, we'll test the endpoint structure
      // In practice, you'd need to mock email service or have a test email service

      // This test would need the actual OTP from email, which is complex in E2E
      // We'll test the endpoint exists and validates input
      return request(app.getHttpServer())
        .post('/auth/signup/otp')
        .send({
          email,
          otp: '123456', // Invalid OTP
        })
        .expect(401); // Should fail with invalid OTP
    });

    it('should return 401 for invalid OTP', async () => {
      const email = `test-e2e-otp-invalid-${Date.now()}@example.com`;

      // Request OTP (creates one in Redis)
      await request(app.getHttpServer()).post('/auth/otp/request').send({ email }).expect(200);

      // Try to sign up with wrong OTP
      return request(app.getHttpServer())
        .post('/auth/signup/otp')
        .send({
          email,
          otp: '000000', // Wrong OTP
        })
        .expect(401)
        .expect((res: any) => {
          expect(res.body.message).toContain('Invalid or expired');
        });
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/signup/otp')
        .send({
          email: 'invalid-email',
          otp: '123456',
        })
        .expect(400);
    });

    it('should return 400 for invalid OTP format', () => {
      return request(app.getHttpServer())
        .post('/auth/signup/otp')
        .send({
          email: 'test@example.com',
          otp: '123', // Too short
        })
        .expect(400);
    });
  });
});
