import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq, ilike, or, and, count, desc, type SQL } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { accounts, accountRoleBindings, roles, accountBusinesses, businesses } from '@schema/platform';
import type { CreateAccountDto } from './dto/create-account.dto';
import type { ListAccountsDto } from './dto/list-accounts.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly platformDb: PlatformDbService) {}

  async list(dto: ListAccountsDto) {
    const { page, limit, status, search, isPlatformAdmin } = dto;
    const offset = (page - 1) * limit;

    const db = this.platformDb.db;

    const filters: SQL[] = [];
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

  async getOne(id: string) {
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

  async update(id: string, dto: { fullName?: string; email?: string; phone?: string }, actorId?: string) {
    const db = this.platformDb.db;
    const [account] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!account) throw new NotFoundException('Account not found');

    if (dto.email) {
      const [conflict] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.email!, dto.email), eq(accounts.id, id)))
        .limit(1);
      // only conflict if another account owns this email
      const [other] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.email!, dto.email))
        .limit(1);
      if (other && other.id !== id) throw new ConflictException('Email already in use');
    }

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (dto.fullName !== undefined) patch.fullName = dto.fullName;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.phone !== undefined) patch.phone = dto.phone;

    const doUpdate = (tx: typeof db) => tx.update(accounts).set(patch).where(eq(accounts.id, id));
    if (actorId) await this.platformDb.runWithActor(actorId, doUpdate);
    else await doUpdate(db);

    return this.getOne(id);
  }

  async resetPassword(id: string, newPassword: string) {
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
    return { success: true };
  }

  async create(dto: CreateAccountDto) {
    const db = this.platformDb.db;

    const [byUsername] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.username, dto.username))
      .limit(1);
    if (byUsername) throw new ConflictException('Username already exists');

    if (dto.email) {
      const [byEmail] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.email!, dto.email))
        .limit(1);
      if (byEmail) throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [created] = await db
      .insert(accounts)
      .values({
        username: dto.username,
        password: passwordHash,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
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

  async updateStatus(id: string, status: 'active' | 'locked' | 'disabled', actorId?: string) {
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
