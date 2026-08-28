import { Module } from '@nestjs/common';
import { DomainMappingService } from './domain-mapping.service';
import { DomainMappingController } from './domain-mapping.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrganizationsModule } from '../organizations.module';
import { RedisModule } from '../../redis/redis.module';
import { DnsService } from '../../common/services/dns.service';

@Module({
  imports: [PrismaModule, OrganizationsModule, RedisModule],
  controllers: [DomainMappingController],
  providers: [DomainMappingService, DnsService],
  exports: [DomainMappingService],
})
export class DomainMappingModule {}
