import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferenceService } from './notification-preference.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDefinitionRegistryService } from './notification-definition-registry.service';

describe('NotificationPreferenceService', () => {
  let service: NotificationPreferenceService;

  const mockPrismaService: any = {
    notificationPreference: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockRegistryService = {
    getCategories: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferenceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationDefinitionRegistryService, useValue: mockRegistryService },
      ],
    }).compile();

    service = module.get<NotificationPreferenceService>(NotificationPreferenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
