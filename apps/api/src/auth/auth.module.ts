import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { OtpModule } from '../otp/otp.module';
import { RedisModule } from '../redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthService } from './auth.service';
import { JwtUtils } from './jwt.utils';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { UserEmailVerificationService } from './user-email-verification.service';
import { EmailVerifiedGuard } from './email-verified.guard';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    PrismaModule,
    OtpModule,
    RedisModule,
    NotificationsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
          throw new Error(
            'JWT_SECRET environment variable is required. Please set it in your .env file.',
          );
        }

        return {
          secret: jwtSecret,
          signOptions: {
            algorithm: 'HS256',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtUtils,
    JwtStrategy,
    GoogleStrategy,
    UserEmailVerificationService,
    EmailVerifiedGuard,
  ],
  exports: [AuthService, JwtUtils, UserEmailVerificationService, EmailVerifiedGuard],
})
export class AuthModule {}
