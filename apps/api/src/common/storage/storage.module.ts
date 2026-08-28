import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';
import { R2StorageProvider } from './r2-storage.provider';
import { IStorageProvider } from './storage-provider.interface';

/**
 * Storage module that provides the configured storage provider
 *
 * Storage provider selection logic:
 * 1. If STORAGE_PROVIDER is explicitly set to 'r2', use R2
 * 2. If STORAGE_PROVIDER is explicitly set to 'local', use local
 * 3. If R2 credentials are present (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, etc.), default to R2
 * 4. Otherwise, default to local storage
 */
@Module({
  providers: [
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (configService: ConfigService): IStorageProvider => {
        const explicitProvider = configService.get<string>('STORAGE_PROVIDER')?.toLowerCase();

        // If explicitly set, use that provider
        if (explicitProvider === 'r2') {
          return new R2StorageProvider(configService);
        }
        if (explicitProvider === 'local') {
          return new LocalStorageProvider(configService);
        }

        // Auto-detect: if R2 credentials are present, use R2
        const r2AccountId = configService.get<string>('R2_ACCOUNT_ID');
        const r2AccessKeyId = configService.get<string>('R2_ACCESS_KEY_ID');
        const r2SecretAccessKey = configService.get<string>('R2_SECRET_ACCESS_KEY');
        const r2BucketName = configService.get<string>('R2_BUCKET_NAME');

        if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName) {
          // R2 credentials present, use R2
          return new R2StorageProvider(configService);
        }

        // Default to local storage
        return new LocalStorageProvider(configService);
      },
      inject: [ConfigService],
    },
    LocalStorageProvider,
    R2StorageProvider,
  ],
  exports: ['STORAGE_PROVIDER'],
})
export class StorageModule {}
