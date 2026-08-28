import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { IStorageProvider } from '../storage/storage-provider.interface';

/**
 * File storage service that delegates to the configured storage provider
 * Supports multiple storage backends (local filesystem, Cloudflare R2, etc.)
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(@Inject('STORAGE_PROVIDER') private readonly storageProvider: IStorageProvider) {}

  /**
   * Validate file type and size
   */
  validateFile(file: Express.Multer.File, maxSize: number): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type (only images)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new BadRequestException(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
    }
  }

  /**
   * Upload file and return public URL
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.storageProvider.uploadFile(file, folder);
  }

  /**
   * Delete file by URL
   */
  async deleteFile(url: string): Promise<void> {
    return this.storageProvider.deleteFile(url);
  }
}
