import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  GoneException,
} from '@nestjs/common';

export class InviteValidationException extends BadRequestException {
  constructor(message: string) {
    super(`Invitation validation failed: ${message}`);
  }
}

export class InvitePermissionException extends ForbiddenException {
  constructor() {
    super('You do not have permission to create invitations for this organization');
  }
}

export class InviteNotFoundException extends NotFoundException {
  constructor(inviteId?: string) {
    super(inviteId ? `Invitation with id ${inviteId} not found` : 'Invitation not found');
  }
}

export class InviteTokenNotFoundException extends NotFoundException {
  constructor() {
    super('Invitation with specified token does not exist or is invalid');
  }
}

export class InviteAccessDeniedException extends ForbiddenException {
  constructor(message: string) {
    super(`Access denied: ${message}`);
  }
}

export class InviteAlreadyAcceptedException extends ConflictException {
  constructor() {
    super('This invitation has already been accepted');
  }
}

export class InviteCancelledException extends ConflictException {
  constructor() {
    super('This invitation has been cancelled by the organization admin');
  }
}

export class InviteExpiredException extends ConflictException {
  constructor() {
    super('This invitation has expired');
  }
}

export class EmailVerificationNotFoundException extends NotFoundException {
  constructor() {
    super('Verification token does not exist or is invalid');
  }
}

export class EmailVerificationExpiredException extends GoneException {
  constructor() {
    super('This verification link has expired. Please request a new invitation.');
  }
}

export class EmailVerificationAlreadyUsedException extends ConflictException {
  constructor() {
    super('This verification link has already been used');
  }
}
