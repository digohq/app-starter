import { IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString({ message: 'Token is required' })
  @MinLength(1, { message: 'Token must not be empty' })
  token: string;
}
