import { IsEnum, IsBoolean, IsString, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationType,
} from '../types/notification.types';

export type BulkUpdateAction =
  | 'enable_all'
  | 'disable_all'
  | 'reset_to_defaults'
  | 'update_category';

export class NotificationPreferenceUpdateDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  @IsOptional()
  definitionName?: string;

  @IsBoolean()
  enabled: boolean;

  @IsEnum(NotificationCategory)
  @IsOptional()
  category?: NotificationCategory;
}

export class UpdateNotificationPreferencesDto {
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceUpdateDto)
  preferences: NotificationPreferenceUpdateDto[];
}

export class BulkUpdateNotificationPreferencesDto {
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  action: BulkUpdateAction;

  @IsEnum(NotificationCategory)
  @IsOptional()
  category?: NotificationCategory;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  channels?: NotificationChannel[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
