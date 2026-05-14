import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, count, inArray } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { roles, permissions, rolePermissions, accountRoleBindings, accounts } from '@schema/platform';

@Injectable()
export class RbacService {
  constructor(private readonly platformDb: PlatformDbService) {}

  private get db() {
    return this.platformDb.db;
  }

  async listRoles() {
    const rows = await this.db
      .select({
        id: roles.id,
        roleKey: roles.roleKey,
        roleName: roles.roleName,
        description: roles.description,
        roleScope: roles.roleScope,
        isSystem: roles.isSystem,
        sortOrder: roles.sortOrder,
        createdAt: roles.createdAt,
      })
      .from(roles)
      .orderBy(roles.sortOrder, roles.roleName);

    if (rows.length === 0) return [];

    const roleIds = rows.map((r) => r.id);

    const permCounts = await this.db
      .select({ roleId: rolePermissions.roleId, cnt: count() })
      .from(rolePermissions)
      .where(inArray(rolePermissions.roleId, roleIds))
      .groupBy(rolePermissions.roleId);

    const accountCounts = await this.db
      .select({ roleId: accountRoleBindings.roleId, cnt: count() })
      .from(accountRoleBindings)
      .where(inArray(accountRoleBindings.roleId, roleIds))
      .groupBy(accountRoleBindings.roleId);

    const permMap = Object.fromEntries(permCounts.map((r) => [r.roleId, Number(r.cnt)]));
    const acctMap = Object.fromEntries(accountCounts.map((r) => [r.roleId, Number(r.cnt)]));

    return rows.map((r) => ({
      ...r,
      permissionCount: permMap[r.id] ?? 0,
      accountCount: acctMap[r.id] ?? 0,
    }));
  }

  async getRole(id: string) {
    const [role] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (!role) throw new NotFoundException('Role not found');

    const perms = await this.db
      .select({
        id: permissions.id,
        permissionKey: permissions.permissionKey,
        permissionName: permissions.permissionName,
        moduleKey: permissions.moduleKey,
        description: permissions.description,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.roleId, id))
      .orderBy(permissions.moduleKey, permissions.permissionKey);

    const accountRows = await this.db
      .select({
        id: accounts.id,
        fullName: accounts.fullName,
        email: accounts.email,
        scopeType: accountRoleBindings.scopeType,
      })
      .from(accountRoleBindings)
      .innerJoin(accounts, eq(accounts.id, accountRoleBindings.accountId))
      .where(eq(accountRoleBindings.roleId, id))
      .limit(20);

    return {
      ...role,
      permissions: perms,
      accounts: accountRows,
    };
  }

  async listPermissions() {
    const rows = await this.db
      .select({
        id: permissions.id,
        permissionKey: permissions.permissionKey,
        permissionName: permissions.permissionName,
        moduleKey: permissions.moduleKey,
        description: permissions.description,
      })
      .from(permissions)
      .orderBy(permissions.moduleKey, permissions.permissionKey);

    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      if (!grouped[row.moduleKey]) grouped[row.moduleKey] = [];
      grouped[row.moduleKey].push(row);
    }

    return {
      total: rows.length,
      modules: Object.entries(grouped).map(([moduleKey, items]) => ({
        moduleKey,
        count: items.length,
        permissions: items,
      })),
    };
  }
}
