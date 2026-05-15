import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { AuthService } from './auth.service';
import { LoginSchema } from './dto/login.dto';

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
  logout(@Req() req: Request & { platformUser?: any }) {
    const requestId = req.get('x-request-id') ?? randomUUID();
    const sessionId = req.platformUser?.sid ?? req.platformUser?.jti ?? req.get('x-session-id') ?? undefined;
    return this.authService.logout(req.platformUser.sub, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
      sessionId,
    });
  }

  @Get('me')
  getMe(@Req() req: Request & { platformUser?: any }) {
    return this.authService.getMe(req.platformUser.sub);
  }
}
