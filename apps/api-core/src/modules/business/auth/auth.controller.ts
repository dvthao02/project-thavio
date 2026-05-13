import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { LoginSchema } from './dto/login.dto';
import { SelectStoreSchema } from './dto/select-store.dto';

@Controller('business/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  login(@Body() body: unknown) {
    const dto = LoginSchema.parse(body);
    return this.authService.login(dto);
  }

  @Post('select-store')
  selectStore(@Body() body: unknown, @Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.slice(7);
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    if (payload.scope !== 'business') {
      throw new UnauthorizedException('Invalid token scope');
    }
    const dto = SelectStoreSchema.parse(body);
    return this.authService.selectStore(dto, payload);
  }
}
