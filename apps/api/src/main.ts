import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { DomainMappingService } from './organizations/domain-mappings/domain-mapping.service';

import { readFileSync, existsSync } from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Check for HTTPS configuration
  let httpsOptions: any = undefined;

  // We need to create a temporary app to get the config service first
  // or just use process.env directly for the bootstrap phase
  const useHttps = process.env.USE_HTTPS === 'true';
  const sslKeyPath = process.env.SSL_KEY_PATH;
  const sslCertPath = process.env.SSL_CERT_PATH;

  if (useHttps && sslKeyPath && sslCertPath) {
    const keyPath = join(process.cwd(), sslKeyPath);
    const certPath = join(process.cwd(), sslCertPath);

    if (existsSync(keyPath) && existsSync(certPath)) {
      try {
        httpsOptions = {
          key: readFileSync(keyPath),
          cert: readFileSync(certPath),
        };
        logger.log('🔐 HTTPS enabled for API');
      } catch (err) {
        logger.error(`Failed to load SSL certificates: ${err.message}`);
      }
    } else {
      logger.warn(`SSL certificates not found at ${keyPath} or ${certPath}. Falling back to HTTP.`);
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions,
  });
  const configService = app.get(ConfigService);
  const domainMappingService = app.get(DomainMappingService);

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe for request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: false, // Don't throw on unknown properties (for flexibility)
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable type conversion
      },
    }),
  );

  // Configure cookie parser for session cookies
  app.use(cookieParser());

  // Configure body parser limits to prevent DoS attacks
  // Note: For file uploads, multer handles the limits separately
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true })); // Increased for multipart form data

  // Serve static files from uploads directory
  const uploadsDir = configService.get<string>('UPLOADS_DIR', join(process.cwd(), 'uploads'));
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
  });

  // Enable CORS for frontend
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const corsAllowedOrigins = configService.get<string>('CORS_ALLOWED_ORIGINS', '');

  const staticOrigins = [frontendUrl];
  if (corsAllowedOrigins) {
    staticOrigins.push(
      ...corsAllowedOrigins
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean),
    );
  }

  const staticAllowedOrigins: (string | RegExp)[] = staticOrigins.map((origin) => {
    if (origin.includes('*')) {
      // Escape special characters except *
      const escaped = origin.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      // Convert * to .*
      const pattern = escaped.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`);
    }
    return origin;
  });

  app.enableCors({
    origin: async (origin, callback) => {
      // If no origin (e.g. same-origin request or server-to-server), allow it
      if (!origin) {
        callback(null, true);
        return;
      }

      // 1. Check static allowed origins
      const isStaticAllowed = staticAllowedOrigins.some((allowed) => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });

      if (isStaticAllowed) {
        callback(null, true);
        return;
      }

      // 2. Check dynamic custom domains from DomainMapping table
      try {
        const hostname = new URL(origin).hostname;
        // Use resolveDomain which handles caching and verified status
        const resolution = await domainMappingService.resolveDomain(hostname);

        if (resolution) {
          logger.debug(`CORS allowed for custom domain: ${origin}`);
          callback(null, true);
          return;
        }
      } catch (error) {
        logger.warn(
          `Failed to validate CORS origin: ${origin}`,
          error instanceof Error ? error.message : String(error),
        );
      }

      // Default: reject
      logger.warn(`CORS rejected for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Swagger. Controllers already carry @ApiTags/@ApiOperation, so this just
  // exposes them. Kept out of production, where an open schema of every route
  // is a gift to anyone probing the API.
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('App Starter API')
      .setDescription('Multi-tenant SaaS starter API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  const protocol = httpsOptions ? 'https' : 'http';
  logger.log(`🚀 Application is running on: ${protocol}://localhost:${port}/api`);
  if (!isProduction) {
    logger.log(`📖 API docs: ${protocol}://localhost:${port}/api/docs`);
  }
  logger.log(`📊 Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
}

bootstrap();
