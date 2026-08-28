import {
  NotificationChannel,
  NotificationContent,
  NotificationOptions,
  NotificationResult,
} from '../types/notification.types';

/**
 * Channel provider interface for sending notifications through different channels
 */
export interface NotificationChannelProvider {
  readonly channel: NotificationChannel;
  send(
    recipient: string,
    content: NotificationContent,
    options?: NotificationOptions,
  ): Promise<NotificationResult>;
  checkHealth(): Promise<{ status: string; message: string }>;
}
