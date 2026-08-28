import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { IStorageProvider } from './storage-provider.interface';

/**
 * Cloudflare R2 storage provider
 * Uses S3-compatible API to store files in Cloudflare R2
 */
@Injectable()
export class R2StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || '';

    // Determine public URL based on environment
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new Error(
        'R2 configuration is incomplete. Please provide R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME',
      );
    }

    // Cloudflare R2 endpoint format: https://<account-id>.r2.cloudflarestorage.com
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    this.s3Client = new S3Client({
      region: 'auto', // R2 uses 'auto' as the region
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const publicUrlDisplay = this.publicUrl || `https://${this.bucketName}.r2.dev (default)`;
    this.logger.log(
      `R2 storage provider initialized for bucket: ${this.bucketName}, environment: ${nodeEnv}, public URL: ${publicUrlDisplay}`,
    );
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      // Generate unique filename
      const fileExtension = this.getFileExtension(file.originalname);
      const filename = `${randomUUID()}${fileExtension}`;

      // Construct the key (path) in the bucket
      const key = folder ? `${folder}/${filename}` : filename;

      // Upload to R2
      // Note: R2 doesn't support ACLs. Public access must be configured at the bucket level.
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      // Construct public URL
      // If R2_PUBLIC_URL is configured (custom domain), use it
      // Otherwise, construct from bucket name
      let publicUrl: string;
      if (this.publicUrl) {
        // Custom domain configured
        publicUrl = `${this.publicUrl}/${key}`;
      } else {
        // Use R2 public URL format: https://<bucket-name>.r2.dev/<key>
        publicUrl = `https://${this.bucketName}.r2.dev/${key}`;
      }

      this.logger.log(`File uploaded successfully to R2: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`R2 file upload failed: ${error.message}`, error.stack);
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  async deleteFile(url: string): Promise<void> {
    if (!url) {
      return;
    }

    try {
      // Extract key from URL
      // Handle both custom domain URLs and R2 public URLs
      let key: string;

      if (this.publicUrl && url.startsWith(this.publicUrl)) {
        // Custom domain URL
        key = url.replace(`${this.publicUrl}/`, '');
      } else if (url.includes('.r2.dev/')) {
        // R2 public URL format: https://<bucket-name>.r2.dev/<key>
        const urlParts = url.split('.r2.dev/');
        key = urlParts[1] || '';
      } else {
        // Try to extract from any URL format
        const urlObj = new URL(url);
        key = urlObj.pathname.replace(/^\//, '');
      }

      if (!key) {
        this.logger.warn(`Could not extract key from URL: ${url}`);
        return;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully from R2: ${url}`);
    } catch (error) {
      this.logger.error(`R2 file deletion failed: ${error.message}`, error.stack);
      // Don't throw error on deletion failure - file may not exist
    }
  }

  /**
   * Get a signed URL for a file
   */
  async getSignedUrl(url: string, expiresIn: number = 900): Promise<string> {
    if (!url) {
      throw new BadRequestException('No URL provided');
    }

    try {
      // Extract key from URL
      let key: string;
      if (this.publicUrl && url.startsWith(this.publicUrl)) {
        key = url.replace(`${this.publicUrl}/`, '');
      } else if (url.includes('.r2.dev/')) {
        const urlParts = url.split('.r2.dev/');
        key = urlParts[1] || '';
      } else {
        const urlObj = new URL(url);
        key = urlObj.pathname.replace(/^\//, '');
      }

      if (!key) {
        throw new BadRequestException(`Could not extract key from URL: ${url}`);
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      // Generate signed URL
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Generated signed URL for: ${url}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate signed URL: ${error.message}`);
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
