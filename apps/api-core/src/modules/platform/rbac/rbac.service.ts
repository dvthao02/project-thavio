import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, count, inArray, and, sql } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { PlatformPermissionCacheService } from '@common/auth/platform-permission-cache.service';
import { roles, permissions, rolePermissions, accountRoleBindings, accounts } from '@schema/platform';

@Injectable()
export class RbacService {
  constructor(
    private readonly platformDb: PlatformDbService,
    private readonly permissionCache: PlatformPermissionCacheService,
  ) {}

  private get db() {
    return this.platformDb.db;
  }

  private slugifyRoleName(value: string) {
    return value
      .normalize('NFD')
      // eslint-disable-next-line no-control-regex
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+|\.+$/g, '');
  }

  private async nextAvailableRoleKey(baseKey: string) {
    const [existingBase] = await this.db.select({ id: roles.id }).from(roles).where(eq(roles.roleKey, baseKey)).limit(1);
    if (!existingBase) return baseKey;

    for (let i = 2; i < 1000; i += 1) {
      const candidate = `${baseKey}-${i}`;
      const [existing] = await this.db.select({ id: roles.id }).from(roles).where(eq(roles.roleKey, candidate)).limit(1);
      if (!existing) return candidate;
    }

    throw new ConflictException('Could not generate unique role key');
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
    const platformRoleIds = rows.filter((r) => r.roleScope === 'platform').map((r) => r.id);
    const businessRoles = rows.filter((r) => r.roleScope === 'business');

    // Platform permission counts
    const permCountsPlatform = platformRoleIds.length > 0
      ? await this.db
          .select({ roleId: rolePermissions.roleId, cnt: count() })
          .from(rolePermissions)
          .where(inArray(rolePermissions.roleId, platformRoleIds))
          .groupBy(rolePermissions.roleId)
      : [];

    // Business permission counts from business_template
    const bizPermMap: Record<string, number> = {};
    if (businessRoles.length > 0) {
      const bizResult = await this.db.execute(sql`
        SELECT pr.role_key AS "roleKey", COUNT(brp.id)::int AS cnt
        FROM platform.roles pr
        JOIN business_template.roles btr ON btr.role_key = pr.role_key
        JOIN business_template.role_permissions brp ON brp.role_id = btr.id
        WHERE pr.role_scope = 'business'
        GROUP BY pr.role_key
      `);
      for (const row of bizResult.rows as Array<{ roleKey: string; cnt: number }>) {
        bizPermMap[row.roleKey] = Number(row.cnt);
      }
    }

    const acctCounts = roleIds.length > 0
      ? await this.db
          .select({ roleId: accountRoleBindings.roleId, cnt: count() })
          .from(accountRoleBindings)
          .where(inArray(accountRoleBindings.roleId, roleIds))
          .groupBy(accountRoleBindings.roleId)
      : [];

    const permMapPlatform = Object.fromEntries(permCountsPlatform.map((r) => [r.roleId, Number(r.cnt)]));
    const acctMap = Object.fromEntries(acctCounts.map((r) => [r.roleId, Number(r.cnt)]));

    return rows.map((r) => ({
      ...r,
      permissionCount: r.roleScope === 'business'
        ? (bizPermMap[r.roleKey] ?? 0)
        : (permMapPlatform[r.id] ?? 0),
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

    let perms: Array<{ id: string; permissionKey: string; permissionName: string; moduleKey: string; description: string | null }>;

    if (role.roleScope === 'business') {
      const result = await this.db.execute(sql`
        SELECT bp.id::text, bp.permission_key AS "permissionKey", bp.permission_name AS "permissionName",
               bp.module_key AS "moduleKey", NULL AS description
        FROM business_template.roles btr
        JOIN business_template.role_permissions brp ON brp.role_id = btr.id
        JOIN business_template.permissions bp ON bp.id = brp.permission_id
        WHERE btr.role_key = ${role.roleKey}
        ORDER BY bp.module_key, bp.permission_key
      `);
      perms = result.rows as typeof perms;
    } else {
      perms = await this.db
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
    }

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

  async getRolesForPermission(permissionId: string) {
    const rows = await this.db.execute(sql`
      SELECT r.id::text, r.role_key AS "roleKey", r.role_name AS "roleName",
             r.role_scope AS "roleScope", r.is_system AS "isSystem"
      FROM platform.role_permissions rp
      INNER JOIN platform.roles r ON r.id = rp.role_id
      WHERE rp.permission_id = ${permissionId}::uuid
      ORDER BY r.role_scope, r.role_name
    `);
    return { roles: rows.rows };
  }

  async createRole(dto: { roleKey?: string; roleName: string; description?: string; roleScope: string }) {
    let roleKey = dto.roleKey?.trim();
    if (!roleKey) {
      const slug = this.slugifyRoleName(dto.roleName) || 'custom-role';
      roleKey = `${dto.roleScope}.${slug}`.slice(0, 100);
      roleKey = await this.nextAvailableRoleKey(roleKey);
    } else {
      const [existing] = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.roleKey, roleKey))
        .limit(1);
      if (existing) throw new ConflictException('Role key already exists');
    }

    const [created] = await this.db
      .insert(roles)
      .values({
        roleKey,
        roleName: dto.roleName,
        description: dto.description ?? null,
        roleScope: dto.roleScope,
        isSystem: false,
      })
      .returning({ id: roles.id, roleKey: roles.roleKey, roleName: roles.roleName });

    // Mirror business roles into business_template for permission storage
    if (dto.roleScope === 'business') {
      const desc = dto.description ?? null;
      await this.db.execute(sql`
        INSERT INTO business_template.roles(role_key, role_name, description, is_system)
        VALUES (${roleKey}, ${dto.roleName}, ${desc}, false)
        ON CONFLICT (role_key) DO UPDATE SET
          role_name = EXCLUDED.role_name,
          description = EXCLUDED.description
      `);
    }

    return created;
  }

  async updateRole(id: string, dto: { roleName?: string; description?: string }) {
    const [role] = await this.db.select({ id: roles.id, roleKey: roles.roleKey, roleScope: roles.roleScope }).from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) throw new NotFoundException('Role not found');

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (dto.roleName !== undefined) patch.roleName = dto.roleName;
    if (dto.description !== undefined) patch.description = dto.description;

    await this.db.update(roles).set(patch).where(eq(roles.id, id));

    // Sync name/description update to business_template too
    if (role.roleScope === 'business') {
      const name = dto.roleName;
      const desc = dto.description ?? null;
      if (name !== undefined) {
        await this.db.execute(sql`
          UPDATE business_template.roles
          SET role_name = ${name}, description = ${desc}, updated_at = NOW()
          WHERE role_key = ${role.roleKey}
        `);
      }
    }

    return this.getRole(id);
  }

  async deleteRole(id: string) {
    const [role] = await this.db
      .select({ id: roles.id, isSystem: roles.isSystem, roleKey: roles.roleKey, roleScope: roles.roleScope })
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);
    if (!role) throw new NotFoundException('Role not found');

    await this.db.transaction(async (tx) => {
      if (role.roleScope !== 'business') {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
      }
      await tx.delete(accountRoleBindings).where(eq(accountRoleBindings.roleId, id));
      await tx.delete(roles).where(eq(roles.id, id));
    });

    // CASCADE in business_template handles role_permissions automatically
    if (role.roleScope === 'business') {
      await this.db.execute(sql`
        DELETE FROM business_template.roles WHERE role_key = ${role.roleKey}
      `);
    }

    this.permissionCache.clear();
    return { success: true };
  }

  async addPermission(roleId: string, permissionId: string) {
    const [role] = await this.db
      .select({ id: roles.id, roleKey: roles.roleKey, roleScope: roles.roleScope })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (!role) throw new NotFoundException('Role not found');

    if (role.roleScope === 'business') {
      // Validate permission exists in business_template
      const permCheck = await this.db.execute(sql`
        SELECT id FROM business_template.permissions WHERE id = ${permissionId}::uuid LIMIT 1
      `);
      if ((permCheck.rows as unknown[]).length === 0) throw new NotFoundException('Permission not found');

      // Ensure business_template role exists (handles pre-existing platform roles)
      await this.db.execute(sql`
        INSERT INTO business_template.roles(role_key, role_name, is_system)
        SELECT role_key, role_name, false FROM platform.roles WHERE id = ${roleId}::uuid
        ON CONFLICT (role_key) DO NOTHING
      `);

      // Check for duplicate
      const dupCheck = await this.db.execute(sql`
        SELECT brp.id FROM business_template.role_permissions brp
        JOIN business_template.roles btr ON btr.id = brp.role_id
        WHERE btr.role_key = ${role.roleKey} AND brp.permission_id = ${permissionId}::uuid
        LIMIT 1
      `);
      if ((dupCheck.rows as unknown[]).length > 0) {
        throw new ConflictException('Permission already assigned to this role');
      }

      await this.db.execute(sql`
        INSERT INTO business_template.role_permissions(role_id, permission_id)
        SELECT btr.id, ${permissionId}::uuid
        FROM business_template.roles btr
        WHERE btr.role_key = ${role.roleKey}
      `);
    } else {
      const [perm] = await this.db.select({ id: permissions.id }).from(permissions).where(eq(permissions.id, permissionId)).limit(1);
      if (!perm) throw new NotFoundException('Permission not found');

      const [existing] = await this.db
        .select({ id: rolePermissions.id })
        .from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)))
        .limit(1);
      if (existing) throw new ConflictException('Permission already assigned to this role');

      await this.db.insert(rolePermissions).values({ roleId, permissionId });
    }

    this.permissionCache.clear();
    return { success: true };
  }

  async removePermission(roleId: string, permissionId: string) {
    const [role] = await this.db
      .select({ id: roles.id, roleKey: roles.roleKey, roleScope: roles.roleScope })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (!role) throw new NotFoundException('Role not found');

    if (role.roleScope === 'business') {
      const result = await this.db.execute(sql`
        DELETE FROM business_template.role_permissions
        WHERE permission_id = ${permissionId}::uuid
          AND role_id = (
            SELECT id FROM business_template.roles WHERE role_key = ${role.roleKey} LIMIT 1
          )
        RETURNING id
      `);
      if ((result.rows as unknown[]).length === 0) {
        throw new NotFoundException('Permission not assigned to this role');
      }
    } else {
      const [existing] = await this.db
        .select({ id: rolePermissions.id })
        .from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)))
        .limit(1);
      if (!existing) throw new NotFoundException('Permission not assigned to this role');

      await this.db.delete(rolePermissions).where(
        and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)),
      );
    }

    this.permissionCache.clear();
    return { success: true };
  }
}
