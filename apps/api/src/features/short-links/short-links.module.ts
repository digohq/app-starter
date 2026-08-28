import { Module, Global } from '@nestjs/common';
import { ShortLinksService } from './short-links.service';
import { ShortLinksController } from './short-links.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ShortLinksService],
  controllers: [ShortLinksController],
  exports: [ShortLinksService],
})
export class ShortLinksModule {}
