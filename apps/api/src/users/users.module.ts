import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../common/storage/storage.module';
import { FileStorageService } from '../common/services/file-storage.service';

@Module({
  imports: [PrismaModule, ConfigModule, StorageModule],
  controllers: [UsersController],
  providers: [UsersService, FileStorageService],
  exports: [UsersService],
})
export class UsersModule {}
