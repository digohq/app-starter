import { Test, TestingModule } from '@nestjs/testing';
import { ShortLinksController } from './short-links.controller';
import { ShortLinksService } from './short-links.service';

describe('ShortLinksController', () => {
  let controller: ShortLinksController;

  const mockShortLinksService = {
    create: jest.fn(),
    getByEntity: jest.fn(),
    resolve: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShortLinksController],
      providers: [
        {
          provide: ShortLinksService,
          useValue: mockShortLinksService,
        },
      ],
    }).compile();

    controller = module.get<ShortLinksController>(ShortLinksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
