import { NotFoundException } from '@nestjs/common';

export class VideoNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Video not found: ${identifier}`);
  }
}
