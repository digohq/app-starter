import { ForbiddenException, NotFoundException } from '@nestjs/common';

export class ProjectNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Project not found: ${identifier}`);
  }
}

export class ProjectAccessDeniedException extends ForbiddenException {
  constructor(action: string) {
    super(`You do not have permission to ${action} this project`);
  }
}
