import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';
import { R2StorageProvider } from './r2-storage.provider';
import { IStorageProvider } from './storage-provider.interface';

const logger = new Logger('StorageModule');

const R2_REQUIRED_VARS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
] as const;

/** Names of the R2 variables that are missing or blank, in declaration order. */
const missingR2Vars = (configService: ConfigService): readonly string[] =>
  R2_REQUIRED_VARS.filter((name) => !configService.get<string>(name));

/**
 * Storage module that provides the configured storage provider.
 *
 * Storage provider selection logic:
 * 1. If STORAGE_PROVIDER is explicitly set to 'r2' and R2 is fully configured, use R2
 * 2. If R2 credentials are all present, use R2
 * 3. Otherwise, use local storage
 *
 * Local storage is the fallback in every other case — including an explicit
 * `STORAGE_PROVIDER=r2` with credentials missing. Object storage is optional in
 * this starter, so an incomplete R2 config must not take the whole API down at
 * boot; it warns and serves files from disk instead.
 *
 * Note that the providers are constructed inside the factory rather than
 * declared in `providers`: Nest instantiates declared providers eagerly, which
 * would run the R2 constructor — and throw on a missing bucket — even when
 * local storage is the one being used.
 */
@Module({
  providers: [
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (configService: ConfigService): IStorageProvider => {
        const explicitProvider = configService.get<string>('STORAGE_PROVIDER')?.toLowerCase();

        if (explicitProvider === 'local') {
          return new LocalStorageProvider(configService);
        }

        const missing = missingR2Vars(configService);

        if (explicitProvider === 'r2' && missing.length > 0) {
          logger.warn(
            `STORAGE_PROVIDER is "r2" but ${missing.join(', ')} ${
              missing.length === 1 ? 'is' : 'are'
            } not set. Falling back to local storage — uploads will be written to disk, not R2.`,
          );
          return new LocalStorageProvider(configService);
        }

        return missing.length === 0
          ? new R2StorageProvider(configService)
          : new LocalStorageProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['STORAGE_PROVIDER'],
})
export class StorageModule {}
