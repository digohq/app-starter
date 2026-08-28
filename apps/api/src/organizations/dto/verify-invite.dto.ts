import { IsString, MinLength } from 'class-validator';

export class VerifyInviteDto {
  @IsString({ message: 'Invitation token is required' })
  @MinLength(1, { message: 'Invitation token must not be empty' })
  inviteToken: string;

  @IsString({ message: 'Verification token is required' })
  @MinLength(1, { message: 'Verification token must not be empty' })
  verifyToken: string;
}
