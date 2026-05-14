import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, or } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { PlatformDbService } from '@common/database/platform-db.service';
import { accounts, auditEvents, accountRoleBindings, rolePermissions, permissions } from '@schema/platform';
import type { LoginDto } from './dto/login.dto';

interface AuthAuditMeta extends Record<string, unknown> {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly platformDb: PlatformDbService,
    private readonly jwtService: JwtService,
  ) {}

  private async writeAuthEvent(input: {
    accountId?: string;
    eventType: 'platform_login_success' | 'platform_login_failed' | 'platform_logout';
    objectId?: string;
    payload?: Record<string, unknown>;
  }) {
    try {
      await this.platformDb.db.insert(auditEvents).values({
        accountId: input.accountId,
        eventType: input.eventType,
        objectType: 'platform_auth',
        objectId: input.objectId,
        eventPayload: input.payload ?? {},
      });
    } catch {
      // Audit failure must not block auth flow.
    }
  }

  async login(dto: LoginDto, meta: AuthAuditMeta = {}) {
    const { identifier, password } = dto;

    const [account] = await this.platformDb.db
      .select()
      .from(accounts)
      .where(
        or(
          eq(accounts.email!, identifier),
          eq(accounts.username, identifier),
          eq(accounts.phone!, identifier),
        ),
      )
      .limit(1);

    if (!account) {
      await this.writeAuthEvent({
        eventType: 'platform_login_failed',
        objectId: identifier,
        payload: { reason: 'account_not_found', identifier, ...meta },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (account.status !== 'active') {
      await this.writeAuthEvent({
        accountId: account.id,
        eventType: 'platform_login_failed',
        objectId: account.id,
        payload: { reason: 'account_not_active', status: account.status, identifier, ...meta },
      });
      throw new UnauthorizedException('Account is not active');
    }

    const valid = await bcrypt.compare(password, account.password);
    if (!valid) {
      await this.writeAuthEvent({
        accountId: account.id,
        eventType: 'platform_login_failed',
        objectId: account.id,
        payload: { reason: 'invalid_password', identifier, ...meta },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.platformDb.db
      .update(accounts)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(accounts.id, account.id));

    await this.writeAuthEvent({
      accountId: account.id,
      eventType: 'platform_login_success',
      objectId: account.id,
      payload: { loginMethod: 'password', identifier, ...meta },
    });

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

  async logout(accountId: string, meta: AuthAuditMeta = {}) {
    await this.writeAuthEvent({
      accountId,
      eventType: 'platform_logout',
      objectId: accountId,
      payload: meta,
    });

    return { ok: true };
  }

  async getMe(accountId: string) {
    const [account] = await this.platformDb.db
      .select({
        id: accounts.id,
        email: accounts.email,
        fullName: accounts.fullName,
        isPlatformAdmin: accounts.isPlatformAdmin,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) throw new UnauthorizedException();

    const perms = await this.platformDb.db
      .selectDistinct({ permissionKey: permissions.permissionKey })
      .from(accountRoleBindings)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, accountRoleBindings.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(accountRoleBindings.accountId, accountId));

    return {
      ...account,
      permissions: perms.map((p) => p.permissionKey),
    };
  }
}
