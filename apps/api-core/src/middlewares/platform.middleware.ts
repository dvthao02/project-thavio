import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class PlatformMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request & { platformUser?: any }, res: Response, next: NextFunction) {
    if (req.originalUrl.includes('/platform/auth/login')) return next();

    const authHeader = req.headers['authorization'] as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ statusCode: 401, error: 'Unauthorized', message: 'Missing token' });
    }

    try {
      const payload = this.jwtService.verify(authHeader.slice(7)) as any;
      if (payload.scope !== 'platform') {
        return res.status(403).json({ statusCode: 403, error: 'Forbidden', message: 'Insufficient scope' });
      }
      req.platformUser = payload;
      next();
    } catch {
      res.status(401).json({ statusCode: 401, error: 'Unauthorized', message: 'Invalid token' });
    }
  }
}
