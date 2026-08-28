import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3001;

  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  CORS_ALLOWED_ORIGINS?: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  /**
   * Optional, and deliberately without a default. In production the cookie is
   * given this `domain`; a value that does not match the host actually serving
   * the app is accepted by the API and then silently discarded by the browser,
   * which looks like a broken login rather than a config error. Unset means a
   * host-only cookie, which is what a single-domain deploy wants.
   */
  @IsString()
  @IsOptional()
  COOKIE_DOMAIN?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TOKEN_EXPIRATION?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_TOKEN_EXPIRATION?: string;

  /**
   * Required. Backs refresh tokens, OTP codes, and password reset tokens, so
   * an app without Redis boots and then fails at the first sign-in. Validated
   * here to turn that into a startup failure instead.
   */
  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsNumber()
  @IsOptional()
  REDIS_DB?: number;

  @IsBoolean()
  @IsOptional()
  REDIS_TLS?: boolean;

  @IsNumber()
  @IsOptional()
  THROTTLE_TTL?: number;

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT?: number;

  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM_EMAIL?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM_NAME?: string;

  @IsString()
  @IsOptional()
  STORAGE_PROVIDER?: string;

  @IsString()
  @IsOptional()
  R2_ACCOUNT_ID?: string;

  @IsString()
  @IsOptional()
  R2_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  R2_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  R2_BUCKET_NAME?: string;

  @IsString()
  @IsOptional()
  R2_PUBLIC_URL?: string;
}

/**
 * The value `.env.example` ships with. Copied verbatim by `pnpm bootstrap`,
 * which is exactly why it has to be rejected before it can reach production.
 */
const PLACEHOLDER_JWT_SECRET = 'your-secret-key-change-in-production';

/** Below this, the signing key is brute-forceable. */
const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Checks that cannot be expressed as decorators because they only apply in
 * production. Failing at startup is the point: the alternative is an app that
 * boots happily and signs every token with a secret published on GitHub.
 */
function validateProductionSecrets(config: EnvironmentVariables): void {
  if (config.NODE_ENV !== Environment.Production) {
    return;
  }

  const problems: string[] = [];

  if (config.JWT_SECRET === PLACEHOLDER_JWT_SECRET) {
    problems.push(
      'JWT_SECRET is still the placeholder from .env.example. Generate one with: openssl rand -base64 48',
    );
  } else if (config.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    problems.push(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters in production (got ${config.JWT_SECRET.length}). Generate one with: openssl rand -base64 48`,
    );
  }

  if (problems.length > 0) {
    throw new Error(`Refusing to start in production:\n  - ${problems.join('\n  - ')}`);
  }
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  validateProductionSecrets(validatedConfig);

  return validatedConfig;
}
