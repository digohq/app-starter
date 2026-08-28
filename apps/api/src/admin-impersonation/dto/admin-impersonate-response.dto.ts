import { IsIn, IsInt, IsString, Min } from 'class-validator';

export class AdminImpersonateResponseDto {
  @IsString()
  accessToken: string;

  @IsInt()
  @Min(1)
  expiresIn: number;

  @IsString()
  @IsIn(['Bearer'])
  tokenType: 'Bearer';
}
