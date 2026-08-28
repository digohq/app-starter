import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

/**
 * DTO for admin dashboard impersonation.
 * reason is optional; when omitted a default is used server-side.
 */
export class AdminDashboardImpersonateDto {
  @IsUUID('4', { message: 'targetUserId must be a valid UUID' })
  targetUserId: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'reason must be at least 3 characters when provided' })
  reason?: string;
}
