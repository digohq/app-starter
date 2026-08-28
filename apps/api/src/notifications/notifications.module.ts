import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationDefinitionRegistryService } from './services/notification-definition-registry.service';
import { NotificationDefinitionValidatorService } from './services/notification-definition-validator.service';
import { EmailTemplateEngineService } from './services/email-template-engine.service';
import { NotificationsService } from './services/notifications.service';
import { EmailChannelProvider } from './providers/email-channel.provider';
import { NotificationsController } from './notifications.controller';
import { InAppNotificationsController } from './in-app-notifications.controller';
import { createNotificationDefinitions } from './definitions/notification-definitions';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationWebSocketGateway } from './gateways/notification.gateway';

import { NotificationPreferenceService } from './services/notification-preference.service';

/**
 * Notifications Module
 * Handles all notification-related functionality
 */
@Module({
  imports: [
    EmailModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { algorithm: 'HS256' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [InAppNotificationsController, NotificationsController],
  providers: [
    NotificationDefinitionRegistryService,
    NotificationDefinitionValidatorService,
    EmailTemplateEngineService,
    NotificationsService,
    EmailChannelProvider,
    InAppNotificationService,
    NotificationWebSocketGateway,
    NotificationPreferenceService,
  ],
  exports: [
    NotificationDefinitionRegistryService,
    NotificationDefinitionValidatorService,
    EmailTemplateEngineService,
    NotificationsService,
    EmailChannelProvider,
    InAppNotificationService,
    NotificationWebSocketGateway,
    NotificationPreferenceService,
  ],
})
export class NotificationsModule implements OnModuleInit {
  constructor(
    private readonly registry: NotificationDefinitionRegistryService,
    private readonly validator: NotificationDefinitionValidatorService,
  ) {}

  /**
   * Register all notification definitions on module initialization
   */
  onModuleInit() {
    const definitions = createNotificationDefinitions();

    for (const definition of definitions) {
      // Validate definition before registering
      const validation = this.validator.validateDefinition(definition);
      if (!validation.valid) {
        throw new Error(
          `Invalid notification definition "${definition.name}": ${validation.errors.join(', ')}`,
        );
      }

      // Register definition
      this.registry.register(definition);
    }
  }
}
