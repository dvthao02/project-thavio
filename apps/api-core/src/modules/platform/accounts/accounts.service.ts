import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq, ilike, or, count, desc } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { accounts } from '@schema/platform';
import type { CreateAccountDto } from './dto/create-account.dto';
import type { ListAccountsDto } from './dto/list-accounts.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly platformDb: PlatformDbService) {}

  async list(dto: ListAccountsDto) {
    const { page, limit, status, search } = dto;
    const offset = (page - 1) * limit;

    const db = this.platformDb.db;

    const rows = await db
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
      .where(
        status && search
          ? or(ilike(accounts.fullName, `%${search}%`), ilike(accounts.email!, `%${search}%`))
          : status
            ? eq(accounts.status, status)
            : search
              ? or(ilike(accounts.fullName, `%${search}%`), ilike(accounts.email!, `%${search}%`))
              : undefined,
      )
      .orderBy(desc(accounts.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db.select({ total: count() }).from(accounts);

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
    const [existing] = await this.platformDb.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.username, dto.username))
      .limit(1);
    if (existing) throw new ConflictException('Username already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [created] = await this.platformDb.db
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
    const [account] = await this.platformDb.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1);
    if (!account) throw new NotFoundException('Account not found');

    await this.platformDb.db
      .update(accounts)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, id));

    return { id, status };
  }
}
