import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq, ilike, or, and, count, desc, ne, sql, type SQL } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { PlatformPermissionCacheService } from '@common/auth/platform-permission-cache.service';
import { normalizeEmail, normalizePhone, normalizeUsername } from '@common/platform/normalize';
import { accounts, accountRoleBindings, roles, accountBusinesses, businesses } from '@schema/platform';
import type { CreateAccountDto } from './dto/create-account.dto';
import type { ListAccountsDto } from './dto/list-accounts.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly platformDb: PlatformDbService,
    private readonly permissionCache: PlatformPermissionCacheService,
  ) {}

  private async ensurePlatformLoginUnique(
    fields: { username?: string | null; email?: string | null; phone?: string | null },
    excludeAccountId?: string,
  ) {
    const filters: SQL[] = [];
    if (fields.username) filters.push(sql`LOWER(${accounts.username}) = ${fields.username.toLowerCase()}`);
    if (fields.email) filters.push(sql`LOWER(${accounts.email}) = ${fields.email.toLowerCase()}`);
    if (fields.phone) filters.push(eq(accounts.phone, fields.phone));

    if (filters.length > 0) {
      const loginWhere = filters.length === 1 ? filters[0] : (or(...filters) as SQL);
      const whereClause = excludeAccountId ? and(loginWhere, ne(accounts.id, excludeAccountId)) : loginWhere;
      const [duplicateAccount] = await this.platformDb.db
        .select({ username: accounts.username, email: accounts.email, phone: accounts.phone })
        .from(accounts)
        .where(whereClause)
        .limit(1);

      if (duplicateAccount) {
        if (fields.username && duplicateAccount.username?.toLowerCase() === fields.username.toLowerCase()) {
          throw new ConflictException('Username đã được sử dụng bởi tài khoản khác');
        }
        if (fields.email && duplicateAccount.email?.toLowerCase() === fields.email.toLowerCase()) {
          throw new ConflictException('Email đã được sử dụng bởi tài khoản khác');
        }
        if (fields.phone && duplicateAccount.phone === fields.phone) {
          throw new ConflictException('Số điện thoại đã được sử dụng bởi tài khoản khác');
        }
      }
    }
  }

  async list(dto: ListAccountsDto, scopeAccountId?: string) {
    const { page, limit, status, search, isPlatformAdmin } = dto;
    const offset = (page - 1) * limit;

    const db = this.platformDb.db;

    const filters: SQL[] = [];

    if (scopeAccountId) {
      filters.push(eq(accounts.id, scopeAccountId));
    }

    if (status) filters.push(eq(accounts.status, status));
    if (isPlatformAdmin !== undefined) filters.push(eq(accounts.isPlatformAdmin, isPlatformAdmin));
    if (search) {
      filters.push(
        or(
          ilike(accounts.fullName, `%${search}%`),
          ilike(accounts.email!, `%${search}%`),
          ilike(accounts.username, `%${search}%`),
        ) as SQL,
      );
    }
    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: accounts.id,
          username: accounts.username,
          fullName: accounts.fullName,
          email: accounts.email,
          phone: accounts.phone,
          status: accounts.status,
          isPlatformAdmin: accounts.isPlatformAdmin,
          lastLoginAt: accounts.lastLoginAt,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .where(whereClause)
        .orderBy(desc(accounts.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(accounts).where(whereClause),
    ]);

    return {
      data: rows,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    };
  }

  async summary(scopeAccountId?: string) {
    const where = scopeAccountId ? eq(accounts.id, scopeAccountId) : undefined;
    const [row] = await this.platformDb.db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${accounts.status} = 'active')`,
        locked: sql<number>`COUNT(*) FILTER (WHERE ${accounts.status} = 'locked')`,
        disabled: sql<number>`COUNT(*) FILTER (WHERE ${accounts.status} = 'disabled')`,
        platformAdmins: sql<number>`COUNT(*) FILTER (WHERE ${accounts.isPlatformAdmin} = true)`,
        neverLoggedIn: sql<number>`COUNT(*) FILTER (WHERE ${accounts.lastLoginAt} IS NULL)`,
      })
      .from(accounts)
      .where(where);

    return {
      total: Number(row?.total ?? 0),
      active: Number(row?.active ?? 0),
      locked: Number(row?.locked ?? 0),
      disabled: Number(row?.disabled ?? 0),
      platformAdmins: Number(row?.platformAdmins ?? 0),
      neverLoggedIn: Number(row?.neverLoggedIn ?? 0),
    };
  }

  async getOne(id: string, scopeAccountId?: string) {
    if (scopeAccountId && scopeAccountId !== id) {
      throw new ForbiddenException('Access denied');
    }

    const db = this.platformDb.db;

    const [account] = await db
      .select({
        id: accounts.id,
        username: accounts.username,
        fullName: accounts.fullName,
        email: accounts.email,
        phone: accounts.phone,
        status: accounts.status,
        isPlatformAdmin: accounts.isPlatformAdmin,
        lastLoginAt: accounts.lastLoginAt,
        createdAt: accounts.createdAt,
        updatedAt: accounts.updatedAt,
      })
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1);

    if (!account) throw new NotFoundException('Account not found');

    const [assignedRoles, assignedBusinesses] = await Promise.all([
      db
        .select({
          bindingId: accountRoleBindings.id,
          roleId: roles.id,
          roleKey: roles.roleKey,
          roleName: roles.roleName,
          roleScope: roles.roleScope,
          scopeType: accountRoleBindings.scopeType,
          scopeId: accountRoleBindings.scopeId,
        })
        .from(accountRoleBindings)
        .innerJoin(roles, eq(roles.id, accountRoleBindings.roleId))
        .where(eq(accountRoleBindings.accountId, id)),

      db
        .select({
          id: accountBusinesses.id,
          businessId: businesses.id,
          businessCode: businesses.businessCode,
          legalName: businesses.legalName,
          accessLevel: accountBusinesses.accessLevel,
          status: accountBusinesses.status,
        })
        .from(accountBusinesses)
        .innerJoin(businesses, eq(businesses.id, accountBusinesses.businessId))
        .where(eq(accountBusinesses.accountId, id)),
    ]);

    return { ...account, roles: assignedRoles, businesses: assignedBusinesses };
  }

  async update(id: string, dto: { fullName?: string; email?: string; phone?: string }, actorId?: string, scopeAccountId?: string) {
    if (scopeAccountId && scopeAccountId !== id) throw new ForbiddenException('Access denied');
    const db = this.platformDb.db;
    const [account] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!account) throw new NotFoundException('Account not found');

    const normalizedEmail = normalizeEmail(dto.email);
    const normalizedPhone = normalizePhone(dto.phone);
    await this.ensurePlatformLoginUnique({ email: normalizedEmail, phone: normalizedPhone }, id);

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (dto.fullName !== undefined) patch.fullName = dto.fullName;
    if (dto.email !== undefined) patch.email = normalizedEmail ?? null;
    if (dto.phone !== undefined) patch.phone = normalizedPhone ?? null;

    const doUpdate = (tx: typeof db) => tx.update(accounts).set(patch).where(eq(accounts.id, id));
    if (actorId) await this.platformDb.runWithActor(actorId, doUpdate);
    else await doUpdate(db);

    return this.getOne(id);
  }

  async resetPassword(id: string, newPassword: string, scopeAccountId?: string) {
    if (scopeAccountId && scopeAccountId !== id) throw new ForbiddenException('Access denied');
    const db = this.platformDb.db;
    const [account] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!account) throw new NotFoundException('Account not found');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(accounts).set({ password: passwordHash, updatedAt: new Date().toISOString() }).where(eq(accounts.id, id));
    return { success: true };
  }

  async assignRole(accountId: string, roleId: string, scopeType: string, scopeId?: string) {
    const db = this.platformDb.db;

    const [account] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId)).limit(1);
    if (!account) throw new NotFoundException('Account not found');

    const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.id, roleId)).limit(1);
    if (!role) throw new NotFoundException('Role not found');

    const [existing] = await db
      .select({ id: accountRoleBindings.id })
      .from(accountRoleBindings)
      .where(and(eq(accountRoleBindings.accountId, accountId), eq(accountRoleBindings.roleId, roleId)))
      .limit(1);
    if (existing) throw new ConflictException('Role already assigned to this account');

    const [binding] = await db
      .insert(accountRoleBindings)
      .values({ accountId, roleId, scopeType, scopeId: scopeId ?? null })
      .returning({ id: accountRoleBindings.id });

    this.permissionCache.delete(accountId);
    return { bindingId: binding.id };
  }

  async removeRole(accountId: string, bindingId: string) {
    const db = this.platformDb.db;

    const [binding] = await db
      .select({ id: accountRoleBindings.id })
      .from(accountRoleBindings)
      .where(and(eq(accountRoleBindings.id, bindingId), eq(accountRoleBindings.accountId, accountId)))
      .limit(1);
    if (!binding) throw new NotFoundException('Role binding not found');

    await db.delete(accountRoleBindings).where(eq(accountRoleBindings.id, bindingId));
    this.permissionCache.delete(accountId);
    return { success: true };
  }

  async create(dto: CreateAccountDto) {
    const db = this.platformDb.db;
    const normalizedUsername = normalizeUsername(dto.username)!;
    const normalizedEmail = normalizeEmail(dto.email);
    const normalizedPhone = normalizePhone(dto.phone);
    await this.ensurePlatformLoginUnique({
      username: normalizedUsername,
      email: normalizedEmail,
      phone: normalizedPhone,
    });

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [created] = await db
      .insert(accounts)
      .values({
        username: normalizedUsername,
        password: passwordHash,
        fullName: dto.fullName,
        email: normalizedEmail ?? null,
        phone: normalizedPhone ?? null,
        isPlatformAdmin: dto.isPlatformAdmin ?? false,
        status: 'active',
      })
      .returning({
        id: accounts.id,
        username: accounts.username,
        fullName: accounts.fullName,
        email: accounts.email,
        status: accounts.status,
      });

    return created;
  }

  async updateStatus(id: string, status: 'active' | 'locked' | 'disabled', actorId?: string, scopeAccountId?: string) {
    if (scopeAccountId && scopeAccountId !== id) throw new ForbiddenException('Access denied');
    const db = this.platformDb.db;

    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1);
    if (!account) throw new NotFoundException('Account not found');

    const doUpdate = (tx: typeof db) =>
      tx.update(accounts).set({ status, updatedAt: new Date().toISOString() }).where(eq(accounts.id, id));

    if (actorId) {
      await this.platformDb.runWithActor(actorId, doUpdate);
    } else {
      await doUpdate(db);
    }

    return { id, status };
  }
}
