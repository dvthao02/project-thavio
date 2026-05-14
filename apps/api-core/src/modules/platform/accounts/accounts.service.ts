import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq, ilike, or, and, count, desc, type SQL } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { accounts } from '@schema/platform';
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
    const [account] = await this.platformDb.db
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
      .where(eq(accounts.id, id))
      .limit(1);

    if (!account) throw new NotFoundException('Account not found');
    return account;
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

  async updateStatus(id: string, status: 'active' | 'locked' | 'disabled') {
    const db = this.platformDb.db;

    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1);
    if (!account) throw new NotFoundException('Account not found');

    await db
      .update(accounts)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, id));

    return { id, status };
  }
}
