import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validate } from './config.validation';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: isTest ? ['.env.test.local', '.env.test'] : ['.env.local', '.env'],
      validate,
    }),
  ],
})
export class ConfigModule {}
