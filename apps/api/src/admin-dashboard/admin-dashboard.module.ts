import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminImpersonationModule } from '../admin-impersonation/admin-impersonation.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { GlobalAdminGuard } from '../auth/global-admin.guard';

@Module({
  imports: [PrismaModule, AdminImpersonationModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService, GlobalAdminGuard],
})
export class AdminDashboardModule {}
