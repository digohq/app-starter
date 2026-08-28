import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrganizationsController } from './organizations.controller';
import { InvitesController } from './invites.controller';

import { OrganizationsService } from './organizations.service';
import { OrganizationInvitesService } from './organization-invites.service';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmailService } from '../email/email.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    forwardRef(() => AuthModule),
    NotificationsModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [OrganizationsController, InvitesController],
  providers: [OrganizationsService, OrganizationInvitesService, EmailService],
  exports: [OrganizationsService, OrganizationInvitesService],
})
export class OrganizationsModule {}
