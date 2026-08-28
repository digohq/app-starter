import { NotificationChannel, NotificationType } from '../types/notification.types';

export class NotificationPreferenceResponseDto {
  id: string;
  channel: NotificationChannel;
  type: NotificationType;
  enabled: boolean;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}
