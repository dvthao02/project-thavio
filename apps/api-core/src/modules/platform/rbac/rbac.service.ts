import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { eq, count, inArray, and, sql } from 'drizzle-orm';
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

  async listPermissions(scope: 'platform' | 'business' = 'platform') {
    type PermRow = { id: string; permissionKey: string; permissionName: string; moduleKey: string; description: string | null; roleCount: number };
    let rows: PermRow[];

    if (scope === 'business') {
      const result = await this.db.execute(sql.raw(
        `SELECT id::text, permission_key AS "permissionKey", permission_name AS "permissionName",
                module_key AS "moduleKey", NULL AS description, 0 AS "roleCount"
         FROM business_template.permissions
         ORDER BY module_key, permission_key`,
      ));
      rows = result.rows as PermRow[];
    } else {
      const result = await this.db.execute(sql.raw(
        `SELECT p.id::text, p.permission_key AS "permissionKey", p.permission_name AS "permissionName",
                p.module_key AS "moduleKey", p.description,
                COUNT(rp.role_id)::int AS "roleCount"
         FROM platform.permissions p
         LEFT JOIN platform.role_permissions rp ON rp.permission_id = p.id
         GROUP BY p.id
         ORDER BY p.module_key, p.permission_key`,
      ));
      rows = result.rows as PermRow[];
    }

    const grouped: Record<string, PermRow[]> = {};
    for (const row of rows) {
      if (!grouped[row.moduleKey]) grouped[row.moduleKey] = [];
      grouped[row.moduleKey].push(row);
    }

    return {
      total: rows.length,
      modules: Object.entries(grouped).map(([moduleKey, items]) => ({
        moduleKey: moduleKey.toUpperCase(),
        count: items.length,
        permissions: items,
      })),
    };
  }

  async createRole(dto: { roleKey: string; roleName: string; description?: string; roleScope: string }) {
    const [existing] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.roleKey, dto.roleKey))
      .limit(1);
    if (existing) throw new ConflictException('Role key already exists');

    const [created] = await this.db
      .insert(roles)
      .values({
        roleKey: dto.roleKey,
        roleName: dto.roleName,
        description: dto.description ?? null,
        roleScope: dto.roleScope,
        isSystem: false,
      })
      .returning({ id: roles.id, roleKey: roles.roleKey, roleName: roles.roleName });

    return created;
  }

  async updateRole(id: string, dto: { roleName?: string; description?: string }) {
    const [role] = await this.db.select({ id: roles.id, isSystem: roles.isSystem }).from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) throw new NotFoundException('Role not found');

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (dto.roleName !== undefined) patch.roleName = dto.roleName;
    if (dto.description !== undefined) patch.description = dto.description;

    await this.db.update(roles).set(patch).where(eq(roles.id, id));
    return this.getRole(id);
  }

  async deleteRole(id: string) {
    const [role] = await this.db.select({ id: roles.id, isSystem: roles.isSystem }).from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot delete system role');

    await this.db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    await this.db.delete(accountRoleBindings).where(eq(accountRoleBindings.roleId, id));
    await this.db.delete(roles).where(eq(roles.id, id));
    return { success: true };
  }

  async addPermission(roleId: string, permissionId: string) {
    const [role] = await this.db.select({ id: roles.id }).from(roles).where(eq(roles.id, roleId)).limit(1);
    if (!role) throw new NotFoundException('Role not found');

    const [perm] = await this.db.select({ id: permissions.id }).from(permissions).where(eq(permissions.id, permissionId)).limit(1);
    if (!perm) throw new NotFoundException('Permission not found');

    const [existing] = await this.db
      .select({ id: rolePermissions.id })
      .from(rolePermissions)
      .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)))
      .limit(1);
    if (existing) throw new ConflictException('Permission already assigned to this role');

    await this.db.insert(rolePermissions).values({ roleId, permissionId });
    return { success: true };
  }

  async removePermission(roleId: string, permissionId: string) {
    const [existing] = await this.db
      .select({ id: rolePermissions.id })
      .from(rolePermissions)
      .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)))
      .limit(1);
    if (!existing) throw new NotFoundException('Permission not assigned to this role');

    await this.db.delete(rolePermissions).where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
    return { success: true };
  }
}
