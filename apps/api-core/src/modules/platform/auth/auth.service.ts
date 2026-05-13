import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { PlatformDbService } from '@common/database/platform-db.service';
import { accounts } from '@schema/platform';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly platformDb: PlatformDbService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const [account] = await this.platformDb.db
      .select()
      .from(accounts)
      .where(eq(accounts.email, dto.email))
      .limit(1);

    if (!account) throw new UnauthorizedException('Invalid credentials');
    if (account.status !== 'active') throw new UnauthorizedException('Account is not active');

    const valid = await bcrypt.compare(dto.password, account.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: account.id,
      email: account.email,
      scope: 'platform',
      isPlatformAdmin: account.isPlatformAdmin,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      account: {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        isPlatformAdmin: account.isPlatformAdmin,
      },
    };
  }
}
