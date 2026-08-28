import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class AdminImpersonateDto {
  @IsUUID('4', { message: 'targetUserId must be a valid UUID' })
  targetUserId: string;

  @IsString({ message: 'reason is required' })
  @MinLength(3, { message: 'reason must be at least 3 characters' })
  reason: string;

  @IsOptional()
  @IsString({ message: 'actor must be a string' })
  @MinLength(1, { message: 'actor must not be empty' })
  actor?: string;
}
