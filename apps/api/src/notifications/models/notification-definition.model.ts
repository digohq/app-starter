import {
  NotificationType,
  NotificationChannel,
  NotificationSeverity,
  NotificationCategory,
} from '../types/notification.types';
import { NotificationDefinition } from '../interfaces/notification-definition.interface';
import { NotificationTemplate } from '../interfaces/notification-template.interface';

/**
 * Notification Definition class - defines a notification type with its template, channels, and properties
 */
export class NotificationDefinitionModel implements NotificationDefinition {
  readonly name: string;
  readonly type: NotificationType;
  readonly channels: NotificationChannel[];
  readonly severity: NotificationSeverity;
  readonly mandatory: boolean;
  readonly template: NotificationTemplate;
  readonly category: NotificationCategory;
  readonly displayName: string;
  readonly description: string;
  readonly defaultEnabled: boolean;

  constructor(config: {
    name: string;
    type: NotificationType;
    channels: NotificationChannel[];
    severity: NotificationSeverity;
    mandatory: boolean;
    template: NotificationTemplate;
    category?: NotificationCategory;
    displayName?: string;
    description?: string;
    defaultEnabled?: boolean;
  }) {
    this.name = config.name;
    this.type = config.type;
    this.channels = config.channels;
    this.severity = config.severity;
    this.mandatory = config.mandatory;
    this.template = config.template;
    this.category = config.category || NotificationCategory.SYSTEM;
    this.displayName = config.displayName || config.name;
    this.description = config.description || '';
    this.defaultEnabled = config.defaultEnabled ?? true;
  }
}
