import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { AuthService } from './auth.service';
import { LoginSchema } from './dto/login.dto';
import { resolvePlatformContext, type PlatformRequest } from '@common/auth/platform-context';

@Controller('platform/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: unknown, @Req() req: Request) {
    const dto = LoginSchema.parse(body);
    const requestId = req.get('x-request-id') ?? randomUUID();
    const sessionId = req.get('x-session-id') ?? undefined;
    return this.authService.login(dto, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
      sessionId,
    });
  }

  @Post('logout')
  logout(@Req() req: PlatformRequest) {
    const ctx = resolvePlatformContext(req);
    const requestId = req.get('x-request-id') ?? randomUUID();
    const tokenSessionId =
      typeof req.platformUser?.sid === 'string'
        ? req.platformUser.sid
        : typeof req.platformUser?.jti === 'string'
          ? req.platformUser.jti
          : undefined;
    const sessionId = tokenSessionId ?? req.get('x-session-id') ?? undefined;
    return this.authService.logout(ctx.accountId, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
      sessionId,
    });
  }

  @Get('me')
  getMe(@Req() req: PlatformRequest) {
    const ctx = resolvePlatformContext(req);
    return this.authService.getMe(ctx.accountId, ctx.permissions);
  }
}
