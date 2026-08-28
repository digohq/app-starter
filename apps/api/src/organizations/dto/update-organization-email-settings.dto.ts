import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationEmailSettingsDto {
  @ApiPropertyOptional({
    description: 'Custom reply-to email address for speaker communications',
    example: 'contact@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'emailReplyTo must be a valid email address' })
  emailReplyTo?: string;

  @ApiPropertyOptional({
    description: 'Custom sender name for speaker communications',
    example: 'Example Organization',
  })
  @IsOptional()
  @IsString({ message: 'emailSenderName must be a string' })
  @MaxLength(100, { message: 'emailSenderName must be less than 100 characters' })
  emailSenderName?: string;
}
