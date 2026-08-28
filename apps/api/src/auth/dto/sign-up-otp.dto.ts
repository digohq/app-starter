import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class SignUpWithOtpDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Name must be less than 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  intent?: string;
}
