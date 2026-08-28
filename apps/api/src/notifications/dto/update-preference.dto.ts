import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { NotificationChannel, NotificationType } from '../types/notification.types';

export class UpdatePreferenceDto {
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  organizationId?: string | null;
}
