import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor() {
    super({
      accessType: 'offline',
    });
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    // If this is a callback (has code), don't pass state in options
    // This prevents passport from getting confused about state validation
    if (req.query.code) {
      return {
        accessType: 'offline',
      };
    }

    return {
      state: req.query.state,
      accessType: 'offline',
    };
  }
}
