import { IsString, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationRecipient } from '../types/notification.types';

class NotificationRecipientDto {
  @IsString()
  type: 'email' | 'phoneNumber' | 'userId';

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class SendNotificationDto {
  @IsString()
  definitionName: string;

  @ValidateNested()
  @Type(() => NotificationRecipientDto)
  recipient: NotificationRecipient;

  @IsObject()
  variables: Record<string, any>;

  @IsOptional()
  @IsString()
  organizationId?: string;
}
