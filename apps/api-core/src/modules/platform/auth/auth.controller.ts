import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginSchema } from './dto/login.dto';

@Controller('platform/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: unknown, @Req() req: Request) {
    const dto = LoginSchema.parse(body);
    return this.authService.login(dto, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Post('logout')
  logout(@Req() req: Request & { platformUser?: any }) {
    return this.authService.logout(req.platformUser.sub, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}
