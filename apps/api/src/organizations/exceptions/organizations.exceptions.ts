import { BadRequestException } from '@nestjs/common';

export class OrganizationValidationException extends BadRequestException {
  constructor(message: string) {
    super(`Organization validation failed: ${message}`);
  }
}
