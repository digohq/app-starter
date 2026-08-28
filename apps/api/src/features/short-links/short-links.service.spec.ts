import { Test, TestingModule } from '@nestjs/testing';
import { ShortLinksService } from './short-links.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ShortLinksService', () => {
  let service: ShortLinksService;

  const mockPrismaService = {
    shortLink: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShortLinksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ShortLinksService>(ShortLinksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
