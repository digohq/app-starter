import { IsOptional, IsEmail, MaxLength, IsEnum, IsNotEmpty } from 'class-validator';
import { OrgRole } from '@app-starter/shared';

export class CreateInviteDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(255, { message: 'Email must be less than 255 characters' })
  email?: string;

  @IsEnum(OrgRole, { message: 'role must be a valid organization role' })
  @IsNotEmpty({ message: 'role is required' })
  role: OrgRole;
}
