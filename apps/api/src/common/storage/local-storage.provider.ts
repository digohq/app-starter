import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { IStorageProvider } from './storage-provider.interface';

/**
 * Local filesystem storage provider
 * Stores files on the local filesystem
 */
@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    // Get uploads directory from config or use default
    this.uploadsDir = this.configService.get<string>('UPLOADS_DIR', join(process.cwd(), 'uploads'));

    // Get API base URL for constructing full image URLs
    // Priority: APP_URL > API_URL > construct from PORT
    const appUrl = this.configService.get<string>('APP_URL');
    const apiUrl = this.configService.get<string>('API_URL');
    const port = this.configService.get<number>('PORT', 3001);

    if (appUrl) {
      this.baseUrl = appUrl;
    } else if (apiUrl) {
      this.baseUrl = apiUrl;
    } else {
      // Construct from PORT (default to localhost:3001)
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      this.baseUrl = `${protocol}://localhost:${port}`;
    }

    // Ensure uploads directory exists
    this.ensureDirectoryExists(this.uploadsDir);
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      // Generate unique filename
      const fileExtension = this.getFileExtension(file.originalname);
      const filename = `${randomUUID()}${fileExtension}`;

      // Create folder path
      const folderPath = join(this.uploadsDir, folder);
      this.ensureDirectoryExists(folderPath);

      // Write file
      const filePath = join(folderPath, filename);
      writeFileSync(filePath, file.buffer);

      // Return full public URL pointing to API server
      // The API serves static files at /uploads prefix
      const relativePath = `/uploads/${folder}/${filename}`;
      const publicUrl = `${this.baseUrl}${relativePath}`;

      this.logger.log(`File uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  async deleteFile(url: string): Promise<void> {
    if (!url) {
      return;
    }

    try {
      // Extract file path from URL
      // Handle both full URLs (http://...) and relative URLs (/uploads/...)
      let urlPath: string;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Full URL - extract the path after the domain
        const urlObj = new URL(url);
        urlPath = urlObj.pathname.replace(/^\/uploads\//, '');
      } else {
        // Relative URL
        urlPath = url.replace(/^\/uploads\//, '');
      }

      const filePath = join(this.uploadsDir, urlPath);

      if (existsSync(filePath)) {
        unlinkSync(filePath);
        this.logger.log(`File deleted successfully: ${url}`);
      } else {
        this.logger.warn(`File not found for deletion: ${url}`);
      }
    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`, error.stack);
      // Don't throw error on deletion failure - file may not exist
    }
  }

  /**
   * Get a signed URL for a file
   * For local storage, this just returns the original URL
   */
  async getSignedUrl(url: string): Promise<string> {
    return url;
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      this.logger.log(`Created directory: ${dirPath}`);
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) {
      return '';
    }
    return filename.substring(lastDot);
  }
}
