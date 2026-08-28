import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminImpersonationController } from './admin-impersonation.controller';
import { AdminImpersonationService } from './admin-impersonation.service';
import { ImpersonationApiKeyGuard } from './guards/impersonation-api-key.guard';

@Module({
  imports: [ConfigModule, PrismaModule, JwtModule, AuthModule],
  controllers: [AdminImpersonationController],
  providers: [AdminImpersonationService, ImpersonationApiKeyGuard],
  exports: [AdminImpersonationService],
})
export class AdminImpersonationModule {}
