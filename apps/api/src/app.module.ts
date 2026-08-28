import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DomainMappingModule } from './organizations/domain-mappings/domain-mapping.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { HttpsEnforcementMiddleware } from './common/middleware/https-enforcement.middleware';
import { ShortLinksModule } from './features/short-links/short-links.module';
import { AdminImpersonationModule } from './admin-impersonation/admin-impersonation.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [
    AppConfigModule, // This includes ConfigModule from @nestjs/config
    PrismaModule,
    RedisModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    NotificationsModule,
    DomainMappingModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const isDevelopment = nodeEnv === 'development';

        // More lenient throttling for development, stricter for production
        const defaultLimit = isDevelopment ? 1000 : 100; // 1000 req/min in dev, 100 in prod
        const defaultTtl = 60; // 1 minute window

        return [
          {
            ttl: configService.get<number>('THROTTLE_TTL', defaultTtl) * 1000, // Convert to milliseconds
            limit: configService.get<number>('THROTTLE_LIMIT', defaultLimit),
          },
        ];
      },
      inject: [ConfigService],
    }),
    ShortLinksModule,
    AdminImpersonationModule,
    AdminDashboardModule,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpsEnforcementMiddleware, SecurityHeadersMiddleware).forRoutes('*');
  }
}
