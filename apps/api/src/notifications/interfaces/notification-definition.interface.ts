import {
  NotificationType,
  NotificationChannel,
  NotificationSeverity,
  NotificationCategory,
} from '../types/notification.types';
import { NotificationTemplate } from './notification-template.interface';

/**
 * Notification Definition - defines a notification type with its template, channels, and properties
 */
export interface NotificationDefinition {
  readonly name: string; // Unique identifier
  readonly type: NotificationType; // TRANSACTIONAL or SYSTEM
  readonly channels: NotificationChannel[]; // Supported channels (e.g., [EMAIL, SMS])
  readonly severity: NotificationSeverity;
  readonly mandatory: boolean; // If true, cannot be disabled by user preferences
  readonly template: NotificationTemplate;

  // New fields for preference management
  readonly category: NotificationCategory;
  readonly displayName: string;
  readonly description: string;
  readonly defaultEnabled: boolean;
}
