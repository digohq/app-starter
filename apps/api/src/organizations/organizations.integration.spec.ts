import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

describe('OrganizationsService Integration', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;
  let module: TestingModule;
  let testUserId: string;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test.local', '.env.test'],
        }),
        PrismaModule,
      ],
      providers: [OrganizationsService],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-organizations-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
    testUserId = testUser.id;
  });

  afterEach(async () => {
    // Clean up test data
    try {
      if (prisma) {
        // Delete organizations and organization users (cascade will handle relations)
        await prisma.organization.deleteMany({
          where: {
            name: {
              contains: 'Test Organization',
            },
          },
        });
        // Delete test user
        await prisma.user.deleteMany({
          where: {
            id: testUserId,
          },
        });
      }
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.$disconnect();
      }
      if (module) {
        await module.close();
      }
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('createOrganization', () => {
    it('should create a organization and organization user in a transaction', async () => {
      const inputData: CreateOrganizationDto = {
        name: 'Test Organization Integration',
        description: 'Test Description',
        location: 'San Francisco',
        website: 'https://example.com',
      };

      const result = await service.createOrganization(testUserId, inputData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(inputData.name.trim());
      expect(result.slug).toBeDefined();
      expect(typeof result.slug).toBe('string');
      expect(result.slug.length).toBeGreaterThan(0);
      expect(result.description).toBe(inputData.description?.trim());
      expect(result.location).toBe(inputData.location ?? null);
      expect(result.website).toBe(inputData.website ?? null);
      expect(result.userRole).toBe('OWNER');

      // Verify organization exists in database
      const organization = await prisma.organization.findUnique({
        where: { id: result.id },
      });
      expect(organization).toBeDefined();
      expect(organization?.name).toBe(inputData.name.trim());

      // Verify OrganizationMember exists with OWNER role
      const organizationMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: testUserId,
            organizationId: result.id,
          },
        },
      });
      expect(organizationMember).toBeDefined();
      expect(organizationMember?.role).toBe('OWNER');
    });

    it('should handle optional fields as null', async () => {
      const inputData: CreateOrganizationDto = {
        name: 'Test Organization No Optional',
        description: 'Test Description',
      };

      const result = await service.createOrganization(testUserId, inputData);

      expect(result.location).toBeNull();
      expect(result.website).toBeNull();
    });

    it('should generate unique slug when duplicate exists', async () => {
      const inputData: CreateOrganizationDto = {
        name: 'Test Organization Duplicate',
        description: 'Test Description',
      };

      // Create first organization
      const firstResult = await service.createOrganization(testUserId, inputData);
      expect(firstResult.slug).toBeDefined();
      expect(firstResult.slug.length).toBeGreaterThan(0);

      // Create second organization with same name (gets a different unique random slug)
      const secondResult = await service.createOrganization(testUserId, inputData);
      expect(secondResult.slug).toBeDefined();
      expect(secondResult.slug).not.toBe(firstResult.slug);
    });
  });

  describe('getUserOrganizations', () => {
    it('should return organizations for user', async () => {
      // Create multiple organizations
      const organization1 = await service.createOrganization(testUserId, {
        name: 'Test Organization 1',
        description: 'Description 1',
      });
      const organization2 = await service.createOrganization(testUserId, {
        name: 'Test Organization 2',
        description: 'Description 2',
      });

      const result = await service.getUserOrganizations(testUserId);

      expect(result.hasOrganizations).toBe(true);
      expect(result.organizations.length).toBeGreaterThanOrEqual(2);
      expect(result.organizations.map((g) => g.id)).toContain(organization1.id);
      expect(result.organizations.map((g) => g.id)).toContain(organization2.id);
    });

    it('should return empty array when user has no organizations', async () => {
      const result = await service.getUserOrganizations(testUserId);

      expect(result.hasOrganizations).toBe(false);
      expect(result.organizations).toHaveLength(0);
    });
  });

  describe('userHasOrganizations', () => {
    it('should return true when user has organizations', async () => {
      await service.createOrganization(testUserId, {
        name: 'Test Organization',
        description: 'Test Description',
      });

      const result = await service.userHasOrganizations(testUserId);

      expect(result).toBe(true);
    });

    it('should return false when user has no organizations', async () => {
      const result = await service.userHasOrganizations(testUserId);

      expect(result).toBe(false);
    });
  });
});
