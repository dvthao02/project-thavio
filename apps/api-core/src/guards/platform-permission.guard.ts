import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq, and } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { PlatformPermissionCacheService } from '@common/auth/platform-permission-cache.service';
import { accountRoleBindings, rolePermissions, permissions } from '@schema/platform';
import { PERMISSION_KEY } from '@decorators/require-permission.decorator';

@Injectable()
export class PlatformPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly platformDb: PlatformDbService,
    private readonly permissionCache: PlatformPermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());

    const request = context.switchToHttp().getRequest<{ platformUser?: any }>();
    const platformUser = request.platformUser;

    // No permission required on this endpoint (e.g. /auth/login) — allow without DB query
    if (!requiredPermission && !platformUser) return true;
    if (!platformUser) return false;
    if (!platformUser.sub) return false;

    let permSet = this.permissionCache.get(platformUser.sub);
    if (!permSet) {
      // Load all permissions once so controllers can reuse them for row-level scoping.
      const rows = await this.platformDb.db
        .selectDistinct({ permissionKey: permissions.permissionKey })
        .from(accountRoleBindings)
        .innerJoin(rolePermissions, eq(rolePermissions.roleId, accountRoleBindings.roleId))
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(
          and(
            eq(accountRoleBindings.accountId, platformUser.sub),
            eq(accountRoleBindings.scopeType, 'platform'),
          ),
        );

      permSet = this.permissionCache.set(platformUser.sub, rows.map((r) => r.permissionKey));
    }
    request.platformUser = { ...platformUser, userPermissions: permSet };

    if (!requiredPermission) return true;

    if (!permSet.has(requiredPermission)) {
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`);
    }

    return true;
  }
}
