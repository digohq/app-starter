import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from './file-storage.service';
import { BadRequestException } from '@nestjs/common';
import { join } from 'path';

describe('FileStorageService', () => {
  let service: FileStorageService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string | number) => {
      if (key === 'UPLOADS_DIR') {
        return join(process.cwd(), 'test-uploads');
      }
      if (key === 'APP_URL') {
        return undefined;
      }
      if (key === 'API_URL') {
        return undefined;
      }
      if (key === 'PORT') {
        return 3001;
      }
      return defaultValue;
    }),
  };

  const mockStorageProvider = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        {
          provide: 'STORAGE_PROVIDER',
          useValue: mockStorageProvider,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should throw error if no file provided', () => {
      expect(() => {
        service.validateFile(null as any, 5 * 1024 * 1024);
      }).toThrow(BadRequestException);
    });

    it('should throw error for invalid file type', () => {
      const file = {
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      expect(() => {
        service.validateFile(file, 5 * 1024 * 1024);
      }).toThrow(BadRequestException);
    });

    it('should throw error for file exceeding max size', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
      } as Express.Multer.File;

      expect(() => {
        service.validateFile(file, 5 * 1024 * 1024);
      }).toThrow(BadRequestException);
    });

    it('should pass validation for valid image file', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024, // 2MB
      } as Express.Multer.File;

      expect(() => {
        service.validateFile(file, 5 * 1024 * 1024);
      }).not.toThrow();
    });

    it('should accept PNG files', () => {
      const file = {
        mimetype: 'image/png',
        size: 1024,
      } as Express.Multer.File;

      expect(() => {
        service.validateFile(file, 5 * 1024 * 1024);
      }).not.toThrow();
    });

    it('should accept WebP files', () => {
      const file = {
        mimetype: 'image/webp',
        size: 1024,
      } as Express.Multer.File;

      expect(() => {
        service.validateFile(file, 5 * 1024 * 1024);
      }).not.toThrow();
    });
  });

  describe('uploadFile', () => {
    it('should throw error if no file provided', async () => {
      await expect(service.uploadFile(null as any, 'test-folder')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should upload file and return URL', async () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 1024,
        originalname: 'test.jpg',
        buffer: Buffer.from('test image data'),
      } as Express.Multer.File;

      const expectedUrl = 'http://localhost:3001/uploads/test-folder/test.jpg';
      mockStorageProvider.uploadFile.mockResolvedValue(expectedUrl);

      const url = await service.uploadFile(file, 'test-folder');

      expect(url).toBe(expectedUrl);
      expect(url).toMatch(/^https?:\/\//);
      expect(url).toContain('/uploads/test-folder/');
      expect(url).toMatch(/\.jpg$/);
      expect(mockStorageProvider.uploadFile).toHaveBeenCalledWith(file, 'test-folder');
    });

    it('should generate unique filenames', async () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 1024,
        originalname: 'test.jpg',
        buffer: Buffer.from('test image data'),
      } as Express.Multer.File;

      mockStorageProvider.uploadFile
        .mockResolvedValueOnce('http://localhost:3001/uploads/test-folder/unique1.jpg')
        .mockResolvedValueOnce('http://localhost:3001/uploads/test-folder/unique2.jpg');

      const url1 = await service.uploadFile(file, 'test-folder');
      const url2 = await service.uploadFile(file, 'test-folder');

      const filename1 = url1.split('/').pop();
      const filename2 = url2.split('/').pop();

      expect(filename1).not.toBe(filename2);
    });
  });

  describe('deleteFile', () => {
    it('should not throw if file does not exist', async () => {
      mockStorageProvider.deleteFile.mockResolvedValue(undefined);
      await expect(service.deleteFile('/uploads/nonexistent/file.jpg')).resolves.not.toThrow();
      expect(mockStorageProvider.deleteFile).toHaveBeenCalledWith('/uploads/nonexistent/file.jpg');
    });

    it('should call storage provider deleteFile with URL', async () => {
      const url = 'http://localhost:3001/uploads/test-folder/photo.jpg';
      mockStorageProvider.deleteFile.mockResolvedValue(undefined);

      await service.deleteFile(url);

      expect(mockStorageProvider.deleteFile).toHaveBeenCalledWith(url);
    });
  });
});
