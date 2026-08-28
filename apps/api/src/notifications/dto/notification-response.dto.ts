import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '../types/notification.types';

export class NotificationResponseDto {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  definitionName: string;
  subject: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  sentAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
