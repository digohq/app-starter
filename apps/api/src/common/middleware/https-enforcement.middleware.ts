import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpsEnforcementMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    // Only enforce HTTPS in production
    if (nodeEnv === 'production') {
      // Check if request is already secure (HTTPS)
      const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

      if (!isSecure) {
        // Redirect to HTTPS
        const httpsUrl = `https://${req.headers.host}${req.url}`;
        return res.redirect(301, httpsUrl);
      }
    }

    next();
  }
}
