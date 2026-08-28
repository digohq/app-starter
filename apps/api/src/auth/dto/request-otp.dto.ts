import { IsEmail } from 'class-validator';

export class RequestOtpDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;
}
