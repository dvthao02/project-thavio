import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq, and } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { accountRoleBindings, rolePermissions, permissions } from '@schema/platform';
import { PERMISSION_KEY } from '@decorators/require-permission.decorator';

@Injectable()
export class PlatformPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly platformDb: PlatformDbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<{ platformUser?: any }>();
    const platformUser = request.platformUser;
    if (!platformUser) return false;

    // Platform owner (isPlatformAdmin flag) bypasses all permission checks
    if (platformUser.isPlatformAdmin) return true;

    const rows = await this.platformDb.db
      .select({ permissionKey: permissions.permissionKey })
      .from(accountRoleBindings)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, accountRoleBindings.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(accountRoleBindings.accountId, platformUser.sub),
          eq(accountRoleBindings.scopeType, 'platform'),
          eq(permissions.permissionKey, requiredPermission),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`);
    }

    return true;
  }
}
