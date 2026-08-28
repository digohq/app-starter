import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ShortLinksService } from './short-links.service';
import { CreateShortLinkDto } from './dto/create-short-link.dto';

@Controller('short-links')
export class ShortLinksController {
  constructor(private readonly shortLinksService: ShortLinksService) {}

  @Post()
  create(@Body() createShortLinkDto: CreateShortLinkDto) {
    return this.shortLinksService.create(createShortLinkDto);
  }

  @Get(':slug')
  resolve(@Param('slug') slug: string) {
    return this.shortLinksService.resolve(slug);
  }
}
