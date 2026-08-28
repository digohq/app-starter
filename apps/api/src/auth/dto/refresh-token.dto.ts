import { IsString, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  @IsOptional()
  refreshToken?: string;
}
