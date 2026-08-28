import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';

export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super('An account with this email already exists');
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Invalid email or password');
  }
}

export class WeakPasswordException extends BadRequestException {
  constructor() {
    super('Password does not meet strength requirements');
  }
}

export class InvalidOtpException extends UnauthorizedException {
  constructor() {
    super('Invalid or expired verification code');
  }
}

export class InvalidRefreshTokenException extends UnauthorizedException {
  constructor() {
    super('Invalid or expired refresh token');
  }
}
