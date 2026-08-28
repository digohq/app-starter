import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../redis/redis.module';
import { OtpService } from './otp.service';
import { EmailService } from '../email/email.service';

@Module({
  imports: [ConfigModule, RedisModule],
  providers: [OtpService, EmailService],
  exports: [OtpService, EmailService],
})
export class OtpModule {}
