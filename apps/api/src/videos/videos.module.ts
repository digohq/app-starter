import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { OrkesModule } from '../orkes/orkes.module';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';

@Module({
  imports: [PrismaModule, ProjectsModule, OrkesModule],
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}
