import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { Pool, type PoolClient } from 'pg';
import { eq, ilike, or, count, desc, and, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { BusinessDbService } from '@common/database/business-db.service';
import {
  TRIAL_DAYS,
  resolveSubscriptionLifecycle,
  resolveTrialEndsAt,
  type SubscriptionLifecycleStatus,
} from '@common/platform/subscription-lifecycle';
import { normalizeEmail, normalizePhone, normalizeUsername, normalizeTaxCode } from '@common/platform/normalize';
import { businesses, businessSubscriptions, accountBusinesses, accounts } from '@schema/platform';
import { env } from '@config/env';
import type { CreateBusinessDto } from './dto/create-business.dto';
import type { ListBusinessesDto } from './dto/list-businesses.dto';
import type { UpdateStatusDto } from './dto/update-status.dto';
import type { UpdateBusinessDto } from './dto/update-business.dto';
import type { AddAssigneeDto } from './dto/manage-assignee.dto';
import type { CreateStaffDto, StaffRoleValue } from './dto/create-staff.dto';
import type { UpdateStaffDto } from './dto/update-staff.dto';
import type { CreateStoreDto } from './dto/create-store.dto';

const FIRST_STORE_QUERY_CONCURRENCY = 5;
const STAFF_ROLE_KEY_MAP: Record<string, string> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  cashier: 'CASHIER',
  inventory: 'INVENTORY',
  kitchen: 'KITCHEN',
  delivery: 'DELIVERY',
  staff: 'STAFF',
};

type StaffStoreRole = {
  storeId: string;
  role: string;
};

type Queryable = Pool | PoolClient;

type BusinessIdentityFields = {
  email?: string | null;
  phone?: string | null;
  taxCode?: string | null;
};

type PgError = Error & {
  code?: string;
  constraint?: string;
};

function normalizeBusinessIdentity(fields: BusinessIdentityFields): BusinessIdentityFields {
  return {
    email: normalizeEmail(fields.email),
    phone: normalizePhone(fields.phone),
    taxCode: normalizeTaxCode(fields.taxCode),
  };
}

@Injectable()
export class BusinessesService implements OnModuleInit, OnModuleDestroy {
  private adminPool!: Pool;

  constructor(
    private readonly platformDb: PlatformDbService,
    private readonly businessDb: BusinessDbService,
  ) {}

  private async assertBusinessIdentityUnique(fields: BusinessIdentityFields, excludeBusinessId?: string) {
    const filters: SQL[] = [];

    if (fields.taxCode) {
      filters.push(sql`LOWER(${businesses.taxCode}) = ${fields.taxCode.toLowerCase()}`);
    }
    if (filters.length === 0) return;

    const identityWhere = filters.length === 1 ? filters[0] : (or(...filters) as SQL);
    const whereClause = excludeBusinessId ? and(identityWhere, ne(businesses.id, excludeBusinessId)) : identityWhere;

    const [duplicate] = await this.platformDb.db
      .select({
        email: businesses.email,
        phone: businesses.phone,
        taxCode: businesses.taxCode,
      })
      .from(businesses)
      .where(whereClause)
      .limit(1);

    if (!duplicate) return;

    if (fields.taxCode && duplicate.taxCode?.toLowerCase() === fields.taxCode.toLowerCase()) {
      throw new ConflictException('Mã số thuế doanh nghiệp đã tồn tại');
    }
    throw new ConflictException('Thông tin định danh doanh nghiệp đã tồn tại');
  }

  private mapBusinessIdentityConflict(err: unknown): ConflictException | null {
    const pgError = err as PgError;
    if (pgError?.code !== '23505') return null;

    const constraint = pgError.constraint ?? '';
    if (constraint.includes('businesses_tax_code')) {
      return new ConflictException('Mã số thuế doanh nghiệp đã tồn tại');
    }
    if (constraint.includes('businesses_business_code')) {
      return new ConflictException('Mã doanh nghiệp đã tồn tại');
    }
    return null;
  }

  private async ensureBusinessAccountLoginUnique(
    db: Queryable,
    fields: { username?: string | null; email?: string | null; phone?: string | null },
    excludeAccountId?: string,
  ) {
    const clauses: string[] = [];
    const values: unknown[] = [];
    const addValue = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };

    if (fields.email) {
      clauses.push(`LOWER(email) = LOWER(${addValue(fields.email)})`);
    }
    if (fields.phone) {
      clauses.push(`phone = ${addValue(fields.phone)}`);
    }
    if (fields.username) {
      clauses.push(`LOWER(username) = LOWER(${addValue(fields.username)})`);
    }
    if (clauses.length === 0) return;

    let excludeSql = '';
    if (excludeAccountId) {
      excludeSql = `AND id <> ${addValue(excludeAccountId)}::uuid`;
    }

    const { rows } = await db.query<{ username: string | null; email: string | null; phone: string | null }>(
      `SELECT username, email, phone
       FROM accounts
       WHERE (${clauses.join(' OR ')}) ${excludeSql}
       LIMIT 1`,
      values,
    );
    const duplicate = rows[0];
    if (!duplicate) return;

    if (fields.username && duplicate.username?.toLowerCase() === fields.username.toLowerCase()) {
      throw new ConflictException('Username đã được sử dụng trong doanh nghiệp này');
    }
    if (fields.email && duplicate.email?.toLowerCase() === fields.email.toLowerCase()) {
      throw new ConflictException('Email đã được sử dụng trong doanh nghiệp này');
    }
    if (fields.phone && duplicate.phone === fields.phone) {
      throw new ConflictException('Số điện thoại đã được sử dụng trong doanh nghiệp này');
    }
  }

  onModuleInit() {
    this.adminPool = new Pool({ connectionString: env.databaseUrl });
  }

  async onModuleDestroy() {
    await this.adminPool.end();
  }

  async list(dto: ListBusinessesDto, scopeAccountId?: string) {
    const { page, limit, status, search, assigneeId } = dto;
    const offset = (page - 1) * limit;

    const whereClause = await this.buildBusinessListWhere(dto, scopeAccountId);

    const [rows, [{ total }]] = await Promise.all([
      this.platformDb.db
        .select({
          id: businesses.id,
          businessCode: businesses.businessCode,
          schemaName: businesses.schemaName,
          legalName: businesses.legalName,
          brandName: businesses.brandName,
          status: businesses.status,
          subscriptionPlan: businesses.subscriptionPlan,
          email: businesses.email,
          phone: businesses.phone,
          timezoneName: businesses.timezoneName,
          subscriptionExpiresAt: businesses.subscriptionExpiresAt,
          createdAt: businesses.createdAt,
          trialEndsAt: businesses.trialEndsAt,
          _subStatus: businessSubscriptions.status,
          _subPeriodEnd: businessSubscriptions.currentPeriodEnd,
          _subRenewedAt: businessSubscriptions.renewedAt,
        })
        .from(businesses)
        .leftJoin(businessSubscriptions, eq(businessSubscriptions.businessId, businesses.id))
        .where(whereClause)
        .orderBy(desc(businesses.createdAt))
        .limit(limit)
        .offset(offset),
      this.platformDb.db
        .select({ total: count() })
        .from(businesses)
        .where(whereClause),
    ]);

    if (rows.length === 0) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }

    const businessIds = rows.map((r) => r.id);
    const schemaTargets = rows.map((r) => ({ id: r.id, schemaName: r.schemaName }));

    const [assignedAccountMap, firstStoreMap] = await Promise.all([
      this.fetchAssignedAccounts(businessIds),
      this.fetchFirstStores(schemaTargets),
    ]);

    const data = rows.map(({ _subStatus, _subPeriodEnd, _subRenewedAt, ...row }) => {
      const lifecycle = resolveSubscriptionLifecycle({
        businessStatus: row.status,
        createdAt: row.createdAt,
        trialEndsAt: row.trialEndsAt,
        subscriptionStatus: _subStatus,
        periodEnd: _subPeriodEnd,
        renewedAt: _subRenewedAt,
        subscriptionExpiresAt: row.subscriptionExpiresAt,
      });

      return {
        ...row,
        subscriptionStatus: lifecycle.status,
        trialStartedAt: row.createdAt,
        trialEndsAt: lifecycle.trialEndsAt,
        trialDaysLeft: lifecycle.trialDaysLeft,
        assignedAccount: assignedAccountMap.get(row.id) ?? null,
        firstStore: firstStoreMap.get(row.id) ?? null,
      };
    });

    return {
      data,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    };
  }

  private trialDeadlineSql(): SQL {
    return sql`COALESCE(${businesses.trialEndsAt}, ${businesses.createdAt} + INTERVAL '10 days')`;
  }

  private paidSubscriptionSql(): SQL {
    return sql`
      COALESCE(${businessSubscriptions.status}, '') = 'active'
      AND (${businessSubscriptions.renewedAt} IS NOT NULL OR ${businesses.subscriptionExpiresAt} IS NOT NULL)
    `;
  }

  private subscriptionStatusWhere(status: SubscriptionLifecycleStatus): SQL {
    const trialDeadline = this.trialDeadlineSql();
    const paidSubscription = this.paidSubscriptionSql();

    switch (status) {
      case 'suspended':
        return sql`${businesses.status} = 'suspended'`;
      case 'cancelled':
        return sql`(${businesses.status} = 'inactive' OR ${businessSubscriptions.status} IN ('inactive', 'cancelled'))`;
      case 'pending':
        return sql`(${businesses.status} = 'pending' OR ${businessSubscriptions.status} = 'pending')`;
      case 'trialing':
        return sql`${businesses.status} = 'active' AND NOT (${paidSubscription}) AND ${trialDeadline} >= NOW()`;
      case 'trial_expired':
        return sql`${businesses.status} = 'active' AND NOT (${paidSubscription}) AND ${trialDeadline} < NOW()`;
      case 'past_due':
        return sql`
          ${businesses.status} = 'active'
          AND (${paidSubscription})
          AND ${businessSubscriptions.currentPeriodEnd} IS NOT NULL
          AND ${businessSubscriptions.currentPeriodEnd} < NOW()
        `;
      case 'active':
      default:
        return sql`
          ${businesses.status} = 'active'
          AND (${paidSubscription})
          AND (${businessSubscriptions.currentPeriodEnd} IS NULL OR ${businessSubscriptions.currentPeriodEnd} >= NOW())
        `;
    }
  }

  private trialWhere(trial: NonNullable<ListBusinessesDto['trial']>): SQL {
    const trialDeadline = this.trialDeadlineSql();
    const trialing = this.subscriptionStatusWhere('trialing');

    if (trial === 'expired') return this.subscriptionStatusWhere('trial_expired');
    if (trial === 'expiring') return sql`${trialing} AND ${trialDeadline} <= NOW() + INTERVAL '2 days'`;
    return sql`${trialing} AND ${trialDeadline} > NOW() + INTERVAL '2 days'`;
  }

  async summary(dto: ListBusinessesDto, scopeAccountId?: string) {
    const whereClause = await this.buildBusinessListWhere(dto, scopeAccountId);
    const trialingSql = this.subscriptionStatusWhere('trialing');
    const expiringSql = sql`${trialingSql} AND ${this.trialDeadlineSql()} <= NOW() + INTERVAL '2 days'`;
    const pastDueSql = this.subscriptionStatusWhere('past_due');

    const [row] = await this.platformDb.db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${businesses.status} = 'active')`,
        pending: sql<number>`COUNT(*) FILTER (WHERE ${businesses.status} = 'pending')`,
        suspended: sql<number>`COUNT(*) FILTER (WHERE ${businesses.status} = 'suspended')`,
        inactive: sql<number>`COUNT(*) FILTER (WHERE ${businesses.status} = 'inactive')`,
        trialing: sql<number>`COUNT(*) FILTER (WHERE ${trialingSql})`,
        expiring: sql<number>`COUNT(*) FILTER (WHERE ${expiringSql})`,
        pastDue: sql<number>`COUNT(*) FILTER (WHERE ${pastDueSql})`,
      })
      .from(businesses)
      .leftJoin(businessSubscriptions, eq(businessSubscriptions.businessId, businesses.id))
      .where(whereClause);

    return {
      total: Number(row?.total ?? 0),
      access: {
        active: Number(row?.active ?? 0),
        pending: Number(row?.pending ?? 0),
        suspended: Number(row?.suspended ?? 0),
        inactive: Number(row?.inactive ?? 0),
      },
      subscription: {
        trialing: Number(row?.trialing ?? 0),
        expiring: Number(row?.expiring ?? 0),
        pastDue: Number(row?.pastDue ?? 0),
      },
    };
  }

  private async buildBusinessListWhere(
    dto: ListBusinessesDto,
    scopeAccountId?: string,
  ): Promise<SQL | undefined> {
    const { status, search, assigneeId, assignedAccountId, plan, subscriptionStatus, trial } = dto;
    const filters: SQL[] = [];

    const assignmentAccountIds = [...new Set([scopeAccountId, assigneeId, assignedAccountId].filter(Boolean))] as string[];
    if (assignmentAccountIds.length > 0) {
      const assignedByAccount = await this.fetchActiveAssignedBusinessIds(assignmentAccountIds);
      let allowedIds: Set<string> | null = null;

      for (const accountId of assignmentAccountIds) {
        const ids = new Set(assignedByAccount.get(accountId) ?? []);
        if (allowedIds) {
          const intersection = new Set<string>();
          for (const businessId of allowedIds) {
            if (ids.has(businessId)) intersection.add(businessId);
          }
          allowedIds = intersection;
        } else {
          allowedIds = ids;
        }
      }

      const ids = [...(allowedIds ?? new Set<string>())];
      filters.push(ids.length > 0 ? inArray(businesses.id, ids) : sql`1=0`);
    }

    if (status) filters.push(eq(businesses.status, status));
    if (plan) filters.push(eq(businesses.subscriptionPlan, plan));
    if (subscriptionStatus) filters.push(this.subscriptionStatusWhere(subscriptionStatus));
    if (trial) filters.push(this.trialWhere(trial));
    if (search) {
      filters.push(
        or(
          ilike(businesses.legalName!, `%${search}%`),
          ilike(businesses.businessCode!, `%${search}%`),
          ilike(businesses.brandName!, `%${search}%`),
          ilike(businesses.email!, `%${search}%`),
        ) as SQL,
      );
    }

    return filters.length > 0 ? and(...filters) : undefined;
  }

  private async fetchActiveAssignedBusinessIds(accountIds: string[]): Promise<Map<string, string[]>> {
    if (accountIds.length === 0) return new Map();

    const rows = await this.platformDb.db
      .select({
        accountId: accountBusinesses.accountId,
        businessId: accountBusinesses.businessId,
      })
      .from(accountBusinesses)
      .where(
        and(
          inArray(accountBusinesses.accountId, accountIds),
          eq(accountBusinesses.status, 'active'),
        ),
      );

    const map = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.accountId || !row.businessId) continue;
      const list = map.get(row.accountId) ?? [];
      list.push(row.businessId);
      map.set(row.accountId, list);
    }
    return map;
  }

  private async fetchAssignedAccounts(
    businessIds: string[],
  ): Promise<Map<string, { id: string; fullName: string; email: string | null }>> {
    const { rows } = await this.adminPool.query<{
      business_id: string;
      id: string;
      full_name: string;
      email: string | null;
    }>(
      `SELECT DISTINCT ON (ab.business_id)
         ab.business_id, a.id, a.full_name, a.email
       FROM platform.account_businesses ab
       JOIN platform.accounts a ON a.id = ab.account_id
       WHERE ab.business_id = ANY($1)
         AND ab.status = 'active'
         AND a.is_platform_admin = true
         AND ab.access_level != 'owner'
       ORDER BY ab.business_id,
         CASE
           WHEN a.is_platform_admin = true AND ab.access_level = 'admin' THEN 1
           WHEN a.is_platform_admin = true THEN 2
           WHEN ab.access_level = 'admin' THEN 3
           ELSE 4
         END`,
      [businessIds],
    );
    const map = new Map<string, { id: string; fullName: string; email: string | null }>();
    for (const r of rows) {
      map.set(r.business_id, { id: r.id, fullName: r.full_name, email: r.email });
    }
    return map;
  }

  private async fetchFirstStores(
    targets: { id: string; schemaName: string | null }[],
  ): Promise<Map<string, { storeCode: string; storeName: string }>> {
    const map = new Map<string, { storeCode: string; storeName: string }>();
    await this.mapWithConcurrency(targets, FIRST_STORE_QUERY_CONCURRENCY, async ({ id, schemaName }) => {
      if (!schemaName) return;
      try {
        const { rows } = await this.adminPool.query<{ storeCode: string; storeName: string }>(
          `SELECT store_code AS "storeCode", store_name AS "storeName"
           FROM "${schemaName}".stores ORDER BY created_at LIMIT 1`,
        );
        if (rows[0]) map.set(id, rows[0]);
      } catch {
        // schema not provisioned yet
      }
    });
    return map;
  }

  private async mapWithConcurrency<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>,
  ): Promise<void> {
    let cursor = 0;
    const workerCount = Math.min(concurrency, items.length);

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (cursor < items.length) {
          const item = items[cursor++];
          await worker(item);
        }
      }),
    );
  }

  async getOne(slug: string, scopeAccountId?: string) {
    const [business] = await this.platformDb.db
      .select({
        id: businesses.id,
        businessCode: businesses.businessCode,
        schemaName: businesses.schemaName,
        legalName: businesses.legalName,
        brandName: businesses.brandName,
        status: businesses.status,
        subscriptionPlan: businesses.subscriptionPlan,
        email: businesses.email,
        phone: businesses.phone,
        taxCode: businesses.taxCode,
        currencyCode: businesses.currencyCode,
        website: businesses.website,
        legalAddress: businesses.legalAddress,
        timezoneName: businesses.timezoneName,
        note: businesses.note,
        subscriptionExpiresAt: businesses.subscriptionExpiresAt,
        trialEndsAt: businesses.trialEndsAt,
        createdAt: businesses.createdAt,
        updatedAt: businesses.updatedAt,
        _subStatus: businessSubscriptions.status,
        _subPeriodStart: businessSubscriptions.currentPeriodStart,
        _subPeriodEnd: businessSubscriptions.currentPeriodEnd,
        _subRenewedAt: businessSubscriptions.renewedAt,
      })
      .from(businesses)
      .leftJoin(businessSubscriptions, eq(businessSubscriptions.businessId, businesses.id))
      .where(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
          ? or(eq(businesses.id, slug), eq(businesses.businessCode!, slug))
          : eq(businesses.businessCode!, slug),
      )
      .limit(1);

    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');

    if (scopeAccountId) {
      const [access] = await this.platformDb.db
        .select({ id: accountBusinesses.id })
        .from(accountBusinesses)
        .where(
          and(
            eq(accountBusinesses.accountId, scopeAccountId),
            eq(accountBusinesses.businessId, business.id),
            eq(accountBusinesses.status, 'active'),
          ),
        )
        .limit(1);
      if (!access) throw new ForbiddenException('Không có quyền truy cập doanh nghiệp này');
    }

    const { _subStatus, _subPeriodStart, _subPeriodEnd, _subRenewedAt, ...row } = business;
    const lifecycle = resolveSubscriptionLifecycle({
      businessStatus: row.status,
      createdAt: row.createdAt,
      trialEndsAt: row.trialEndsAt,
      subscriptionStatus: _subStatus,
      periodEnd: _subPeriodEnd,
      renewedAt: _subRenewedAt,
      subscriptionExpiresAt: row.subscriptionExpiresAt,
    });

    return {
      ...row,
      subscriptionStatus: lifecycle.status,
      trialStartedAt: row.createdAt,
      trialEndsAt: lifecycle.trialEndsAt,
      trialExtendedAt: row.trialEndsAt,
      trialDaysLeft: lifecycle.trialDaysLeft,
      subscription: _subPeriodEnd
        ? {
            planCode: _subStatus ? row.subscriptionPlan : null,
            status: _subStatus,
            periodStart: _subPeriodStart,
            periodEnd: _subPeriodEnd,
            renewedAt: _subRenewedAt,
          }
        : null,
    };
  }

  async getStores(id: string) {
    const [biz] = await this.platformDb.db
      .select({ schemaName: businesses.schemaName })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    if (!biz) throw new NotFoundException('Không tìm thấy doanh nghiệp');
    if (!biz.schemaName) return { data: [] };

    try {
      const { rows } = await this.adminPool.query<{
        id: string;
        storeCode: string;
        storeName: string;
        storeType: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        city: string | null;
        isActive: boolean;
        createdAt: string;
      }>(
        `SELECT id::text, store_code AS "storeCode", store_name AS "storeName",
                store_type AS "storeType", phone, email, address, city,
                is_active AS "isActive", created_at AS "createdAt"
         FROM "${biz.schemaName}".stores ORDER BY created_at`,
      );
      const staffCounts = await this.getStaffCountsByStore(biz.schemaName, rows.map((r) => r.id));
      return {
        data: rows.map((r) => ({ ...r, staffCount: staffCounts.get(r.id) ?? 0 })),
      };
    } catch {
      return { data: [] };
    }
  }

  async createStore(businessId: string, dto: CreateStoreDto) {
    const [biz] = await this.platformDb.db
      .select({ schemaName: businesses.schemaName })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    if (!biz) throw new NotFoundException('Không tìm thấy doanh nghiệp');
    if (!biz.schemaName) throw new BadRequestException('Schema doanh nghiệp chưa sẵn sàng');

    const bizPool = this.businessDb.getPool(biz.schemaName);

    // Auto-generate storeCode if not provided
    let storeCode = dto.storeCode;
    if (!storeCode) {
      const { rows: countRows } = await bizPool.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM stores`,
      );
      const n = parseInt(countRows[0]?.cnt ?? '0', 10) + 1;
      storeCode = `store${String(n).padStart(3, '0')}`;
    }

    // Check storeCode uniqueness
    const { rows: existing } = await bizPool.query<{ id: string }>(
      `SELECT id FROM stores WHERE store_code = $1 LIMIT 1`,
      [storeCode],
    );
    if (existing.length > 0) throw new ConflictException(`Mã cửa hàng "${storeCode}" đã tồn tại`);

    const { rows } = await bizPool.query<{ id: string; storeCode: string; storeName: string }>(
      `INSERT INTO stores (store_code, store_name, store_type, phone, email, address, district, city, timezone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id::text, store_code AS "storeCode", store_name AS "storeName"`,
      [
        storeCode,
        dto.storeName,
        dto.storeType,
        dto.phone ?? null,
        dto.email ?? null,
        dto.address ?? null,
        dto.district ?? null,
        dto.city ?? null,
        dto.timezone ?? 'Asia/Ho_Chi_Minh',
      ],
    );

    return rows[0];
  }

  async updateStore(businessId: string, storeId: string, dto: import('./dto/update-store.dto').UpdateStoreDto) {
    const [biz] = await this.platformDb.db
      .select({ schemaName: businesses.schemaName })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    if (!biz) throw new NotFoundException('Không tìm thấy doanh nghiệp');
    if (!biz.schemaName) throw new BadRequestException('Schema doanh nghiệp chưa sẵn sàng');

    const bizPool = this.businessDb.getPool(biz.schemaName);
    const { rows: existing } = await bizPool.query<{ id: string }>(
      `SELECT id FROM stores WHERE id = $1::uuid LIMIT 1`, [storeId],
    );
    if (!existing.length) throw new NotFoundException('Không tìm thấy cửa hàng');

    if (dto.storeCode) {
      const { rows: dup } = await bizPool.query<{ id: string }>(
        `SELECT id FROM stores WHERE store_code = $1 AND id <> $2::uuid LIMIT 1`,
        [dto.storeCode, storeId],
      );
      if (dup.length > 0) throw new ConflictException(`Mã cửa hàng "${dto.storeCode}" đã tồn tại`);
    }

    const cols: string[] = ['updated_at = NOW()'];
    const vals: unknown[] = [];
    const add = (col: string, v: unknown) => { vals.push(v); cols.push(`${col} = $${vals.length}`); };

    if (dto.storeName !== undefined) add('store_name', dto.storeName);
    if (dto.storeCode !== undefined) add('store_code', dto.storeCode);
    if (dto.storeType !== undefined) add('store_type', dto.storeType);
    if (dto.phone !== undefined) add('phone', dto.phone);
    if (dto.email !== undefined) add('email', dto.email);
    if (dto.address !== undefined) add('address', dto.address);
    if (dto.district !== undefined) add('district', dto.district);
    if (dto.city !== undefined) add('city', dto.city);
    if (dto.timezone !== undefined) add('timezone', dto.timezone);
    if (dto.isActive !== undefined) add('is_active', dto.isActive);

    vals.push(storeId);
    const { rows } = await bizPool.query<{
      id: string; storeCode: string; storeName: string; storeType: string;
      phone: string | null; email: string | null; address: string | null;
      city: string | null; isActive: boolean;
    }>(
      `UPDATE stores SET ${cols.join(', ')} WHERE id = $${vals.length}::uuid
       RETURNING id::text, store_code AS "storeCode", store_name AS "storeName",
                 store_type AS "storeType", phone, email, address, city,
                 is_active AS "isActive"`,
      vals,
    );
    return rows[0];
  }

  private async getStaffCountsByStore(schemaName: string, storeIds: string[]): Promise<Map<string, number>> {
    if (storeIds.length === 0) return new Map();
    try {
      const { rows } = await this.adminPool.query<{ store_id: string; cnt: string }>(
        `SELECT store_id, COUNT(DISTINCT staff_id)::text AS cnt
         FROM (
           SELECT primary_store_id::text AS store_id, id::text AS staff_id
           FROM "${schemaName}".staff_members
           WHERE primary_store_id = ANY($1::uuid[]) AND is_active = true
           UNION
           SELECT srb.store_id::text AS store_id, srb.staff_id::text AS staff_id
           FROM "${schemaName}".staff_role_bindings srb
           JOIN "${schemaName}".staff_members sm ON sm.id = srb.staff_id
           WHERE srb.store_id = ANY($1::uuid[])
             AND srb.status = 'active'
             AND sm.is_active = true
         ) assigned
         WHERE store_id IS NOT NULL
         GROUP BY store_id`,
        [storeIds],
      );
      return new Map(rows.map((r) => [r.store_id, parseInt(r.cnt, 10)]));
    } catch {
      return new Map();
    }
  }

  async getAssignees(businessId: string) {
    const rows = await this.platformDb.db
      .select({
        id: accountBusinesses.id,
        accountId: accounts.id,
        fullName: accounts.fullName,
        email: accounts.email,
        username: accounts.username,
        isPlatformAdmin: accounts.isPlatformAdmin,
        accessLevel: accountBusinesses.accessLevel,
        status: accountBusinesses.status,
        createdAt: accountBusinesses.createdAt,
      })
      .from(accountBusinesses)
      .innerJoin(accounts, eq(accounts.id, accountBusinesses.accountId))
      .where(
        and(
          eq(accountBusinesses.businessId, businessId),
          eq(accountBusinesses.status, 'active'),
          eq(accounts.isPlatformAdmin, true),
        ),
      )
      .orderBy(accountBusinesses.createdAt);
    return { data: rows };
  }

  async addAssignee(businessId: string, dto: AddAssigneeDto, actorId?: string) {
    const [biz] = await this.platformDb.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    if (!biz) throw new NotFoundException('Không tìm thấy doanh nghiệp');

    const [account] = await this.platformDb.db
      .select({ id: accounts.id, status: accounts.status, isPlatformAdmin: accounts.isPlatformAdmin })
      .from(accounts)
      .where(eq(accounts.id, dto.accountId))
      .limit(1);
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản');
    if (account.status !== 'active') {
      throw new BadRequestException('Tài khoản chưa hoạt động hoặc đã bị khóa');
    }
    if (!account.isPlatformAdmin) {
      throw new BadRequestException('Chỉ tài khoản quản trị nền tảng mới có thể được gán phụ trách');
    }

    const accessLevel = dto.accessLevel ?? 'admin';
    const doInsert = (db: typeof this.platformDb.db) =>
      db
        .insert(accountBusinesses)
        .values({
          accountId: dto.accountId,
          businessId,
          accessLevel,
          status: 'active',
        })
        .onConflictDoUpdate({
          target: [accountBusinesses.accountId, accountBusinesses.businessId],
          set: {
            accessLevel,
            status: 'active',
            updatedAt: new Date().toISOString(),
          },
        });

    if (actorId) {
      await this.platformDb.runWithActor(actorId, doInsert);
    } else {
      await doInsert(this.platformDb.db);
    }

    return { ok: true };
  }

  async removeAssignee(businessId: string, accountId: string) {
    await this.platformDb.db
      .delete(accountBusinesses)
      .where(
        and(
          eq(accountBusinesses.businessId, businessId),
          eq(accountBusinesses.accountId, accountId),
        ),
      );
    return { ok: true };
  }

  async update(id: string, dto: UpdateBusinessDto, actorId?: string) {
    const [business] = await this.platformDb.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');

    const normalizedIdentity = normalizeBusinessIdentity({
      email: dto.email,
      phone: dto.phone,
      taxCode: dto.taxCode,
    });
    await this.assertBusinessIdentityUnique(normalizedIdentity, id);

    const patch: Partial<typeof businesses.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (dto.legalName !== undefined) patch.legalName = dto.legalName;
    if (dto.brandName !== undefined) patch.brandName = dto.brandName;
    if (dto.email !== undefined) patch.email = normalizedIdentity.email ?? null;
    if (dto.phone !== undefined) patch.phone = normalizedIdentity.phone ?? null;
    if (dto.taxCode !== undefined) patch.taxCode = normalizedIdentity.taxCode ?? null;
    if (dto.currencyCode !== undefined) patch.currencyCode = dto.currencyCode;
    if (dto.website !== undefined) patch.website = dto.website;
    if (dto.legalAddress !== undefined) patch.legalAddress = dto.legalAddress;
    if (dto.timezoneName !== undefined) patch.timezoneName = dto.timezoneName;
    if (dto.note !== undefined) patch.note = dto.note;

    const doUpdate = (db: typeof this.platformDb.db) =>
      db.update(businesses).set(patch).where(eq(businesses.id, id));

    try {
      if (actorId) {
        await this.platformDb.runWithActor(actorId, doUpdate);
      } else {
        await doUpdate(this.platformDb.db);
      }
    } catch (err) {
      throw this.mapBusinessIdentityConflict(err) ?? err;
    }

    return this.getOne(id);
  }

  async extendTrial(id: string, extraDays: number, actorId?: string) {
    const [business] = await this.platformDb.db
      .select({ id: businesses.id, createdAt: businesses.createdAt, trialEndsAt: businesses.trialEndsAt })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');

    const baseDate = business.trialEndsAt
      ? new Date(business.trialEndsAt)
      : new Date(new Date(business.createdAt!).getTime() + TRIAL_DAYS * 86_400_000);

    if (baseDate < new Date()) baseDate.setTime(Date.now());
    baseDate.setDate(baseDate.getDate() + extraDays);

    const newTrialEndsAt = baseDate.toISOString();

    const doUpdate = (db: typeof this.platformDb.db) =>
      db.update(businesses).set({ trialEndsAt: newTrialEndsAt, updatedAt: new Date().toISOString() }).where(eq(businesses.id, id));

    if (actorId) {
      await this.platformDb.runWithActor(actorId, doUpdate);
    } else {
      await doUpdate(this.platformDb.db);
    }

    return this.getOne(id);
  }

  async create(dto: CreateBusinessDto, createdByAccountId?: string) {
    const schemaName = `business_${dto.businessCode}`;

    if (!/^[a-z0-9_]{3,50}$/.test(dto.businessCode)) {
      throw new BadRequestException('Mã doanh nghiệp không đúng định dạng');
    }

    const [existing] = await this.platformDb.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.businessCode!, dto.businessCode))
      .limit(1);
    if (existing) throw new ConflictException('Mã doanh nghiệp đã tồn tại');

    const normalizedIdentity = normalizeBusinessIdentity({
      email: dto.email,
      phone: dto.phone,
      taxCode: dto.taxCode,
    });
    await this.assertBusinessIdentityUnique(normalizedIdentity);
    const normalizedOwnerEmail = normalizeEmail(dto.ownerEmail);
    const normalizedOwnerPhone = normalizePhone(dto.ownerPhone);

    const { rows: schemaCheck } = await this.adminPool.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName],
    );
    if (schemaCheck.length > 0) throw new ConflictException('Schema doanh nghiệp đã tồn tại');

    let schemaCreated = false;
    let businessId: string | null = null;
    const trialEndsAt = resolveTrialEndsAt(new Date())!;

    try {
      // Step 1: Create schema
      await this.adminPool.query(`CREATE SCHEMA "${schemaName}"`);
      schemaCreated = true;

      // Step 2: Clone all tables from business_template
      const { rows: tables } = await this.adminPool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'business_template' AND table_type = 'BASE TABLE'
         ORDER BY table_name`,
      );
      for (const { table_name } of tables) {
        await this.adminPool.query(
          `CREATE TABLE "${schemaName}"."${table_name}" (LIKE business_template."${table_name}" INCLUDING ALL)`,
        );
      }

      // Step 3: Apply triggers + business functions
      await this.adminPool.query(`SELECT platform.fn_apply_business_logic($1)`, [schemaName]);
      await this.adminPool.query(`SELECT platform.fn_apply_auto_codes($1)`, [schemaName]);

      // Step 4: Register in platform.businesses
      const [inserted] = await this.platformDb.db
        .insert(businesses)
        .values({
          businessCode: dto.businessCode,
          schemaName,
          legalName: dto.legalName,
          brandName: dto.brandName ?? dto.legalName,
          email: normalizedIdentity.email ?? null,
          phone: normalizedIdentity.phone ?? null,
          taxCode: normalizedIdentity.taxCode ?? null,
          currencyCode: dto.currencyCode ?? 'VND',
          website: dto.website ?? null,
          legalAddress: dto.legalAddress ?? null,
          note: dto.note ?? null,
          subscriptionPlan: dto.plan ?? 'standard',
          timezoneName: dto.timezone ?? 'Asia/Ho_Chi_Minh',
          trialEndsAt: trialEndsAt.toISOString(),
          status: 'active',
        })
        .returning({ id: businesses.id });
      businessId = inserted.id;

      // Step 4.5: Link creating admin as phụ trách (access_level='admin')
      if (createdByAccountId) {
        try {
          await this.platformDb.db
            .insert(accountBusinesses)
            .values({ accountId: createdByAccountId, businessId, accessLevel: 'admin', status: 'active' })
            .onConflictDoNothing();
        } catch {
          // Non-critical
        }
      }

      // Step 5: Create subscription record
      try {
        await this.platformDb.db.insert(businessSubscriptions).values({
          businessId,
          planCode: dto.plan ?? 'standard',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: trialEndsAt.toISOString(),
        });
      } catch {
        // Subscription insert is non-critical; continue if plan_code FK fails
      }

      const bizPool = this.businessDb.getPool(schemaName);

      // Step 6: Seed system roles
      await bizPool.query(`
        INSERT INTO roles (role_key, role_name, is_system) VALUES
          ('OWNER',     'Chủ cửa hàng',  true),
          ('ADMIN',     'Quản trị viên', true),
          ('CASHIER',   'Thu ngân',       true),
          ('INVENTORY', 'Thủ kho',        true),
          ('KITCHEN',   'Bếp / Pha chế', true),
          ('DELIVERY',  'Giao hàng',      true),
          ('STAFF',     'Nhân viên',      true)
        ON CONFLICT (role_key) DO NOTHING
      `);

      // Step 7: Seed RBAC permissions + role_permissions
      const seedPath = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'database', 'src', 'business_extensions', '0290_seed_business_full_rbac.sql');
      const rawSql = fs.readFileSync(seedPath, 'utf-8');
      const cleanSql = rawSql
        .split('\n')
        .filter((l) => !l.trimStart().startsWith('SET ') && !l.trimStart().startsWith('SELECT set_config'))
        .join('\n');
      await bizPool.query(cleanSql);

      // Step 8: Create first store
      const { rows: storeRows } = await bizPool.query<{ id: string }>(
        `INSERT INTO stores (store_code, store_name, store_type, phone, email, address, city)
         VALUES ($1, $2, 'retail', $3, $4, $5, $6) RETURNING id`,
        [
          dto.firstStore.storeCode ?? 'STORE001',
          dto.firstStore.storeName,
          dto.firstStore.phone ?? null,
          dto.firstStore.email ?? null,
          dto.firstStore.address ?? null,
          dto.firstStore.city ?? null,
        ],
      );
      const storeId = storeRows[0].id;

      // Step 9: Create owner staff member
      const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);
      const ownerCode = dto.ownerStaffCode ?? 'OWN001';
      const ownerUsername = dto.ownerUsername ?? ownerCode.toLowerCase();
      const { rows: staffRows } = await bizPool.query<{ id: string }>(
        `WITH created_account AS (
           INSERT INTO accounts (username, email, phone, password_hash, status)
           VALUES ($1, $2, $3, $4, 'active')
           RETURNING id
         )
         INSERT INTO staff_members (staff_code, account_id, full_name, email, phone, password_hash, role, is_active, employment_status, primary_store_id)
         SELECT $5, id, $6, $2, $3, $4, 'admin', true, 'active', $7
         FROM created_account
         RETURNING id`,
        [
          ownerUsername,
          normalizedOwnerEmail ?? null,
          normalizedOwnerPhone ?? null,
          passwordHash,
          ownerCode,
          dto.ownerFullName,
          storeId,
        ],
      );

      // Step 10: Bind OWNER role
      const { rows: roleRows } = await bizPool.query<{ id: string }>(
        `SELECT id FROM roles WHERE role_key = 'OWNER' LIMIT 1`,
      );
      if (roleRows.length > 0) {
        await bizPool.query(
          `INSERT INTO staff_role_bindings (staff_id, role_id, store_id, status) VALUES ($1, $2, $3, 'active')`,
          [staffRows[0].id, roleRows[0].id, storeId],
        );
      }

      return { id: businessId, businessCode: dto.businessCode, schemaName, status: 'created' };
    } catch (err) {
      if (schemaCreated) {
        await this.adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => {});
      }
      if (businessId) {
        await this.platformDb.db.delete(businessSubscriptions).where(eq(businessSubscriptions.businessId, businessId)).catch(() => {});
        await this.platformDb.db.delete(businesses).where(eq(businesses.id, businessId)).catch(() => {});
      }
      throw this.mapBusinessIdentityConflict(err) ?? err;
    }
  }

  async getStaff(businessId: string, storeId?: string) {
    const [biz] = await this.platformDb.db
      .select({ schemaName: businesses.schemaName })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    if (!biz) throw new NotFoundException('Không tìm thấy doanh nghiệp');
    if (!biz.schemaName) return { data: [] };

    try {
      const params: unknown[] = [];
      let where = '';
      if (storeId) {
        params.push(storeId);
        where = `WHERE sm.primary_store_id = $1::uuid
          OR EXISTS (
            SELECT 1
            FROM "${biz.schemaName}".staff_role_bindings srb_filter
            WHERE srb_filter.staff_id = sm.id
              AND srb_filter.store_id = $1::uuid
              AND srb_filter.status = 'active'
          )`;
      }
      const { rows } = await this.adminPool.query(
        `SELECT sm.id::text, sm.staff_code AS "staffCode", sm.full_name AS "fullName",
                ba.username, ba.email, ba.phone, sm.role, sm.is_active AS "isActive",
                sm.employment_status AS "employmentStatus",
                sm.primary_store_id::text AS "primaryStoreId",
                ba.last_login_at AS "lastLoginAt", sm.created_at AS "createdAt",
                s.store_name AS "storeName", s.store_code AS "storeCode",
                COALESCE(
                  jsonb_agg(
                    DISTINCT jsonb_build_object(
                      'storeId', rb.store_id::text,
                      'storeName', rs.store_name,
                      'storeCode', rs.store_code,
                      'role', lower(r.role_key)
                    )
                  ) FILTER (WHERE rb.id IS NOT NULL),
                  '[]'::jsonb
                ) AS "storeAssignments"
         FROM "${biz.schemaName}".staff_members sm
         LEFT JOIN "${biz.schemaName}".accounts ba ON ba.id = sm.account_id
         LEFT JOIN "${biz.schemaName}".stores s ON s.id = sm.primary_store_id
         LEFT JOIN "${biz.schemaName}".staff_role_bindings rb
           ON rb.staff_id = sm.id AND rb.status = 'active' AND rb.store_id IS NOT NULL
         LEFT JOIN "${biz.schemaName}".roles r ON r.id = rb.role_id
         LEFT JOIN "${biz.schemaName}".stores rs ON rs.id = rb.store_id
         ${where}
         GROUP BY sm.id, ba.username, ba.email, ba.phone, ba.last_login_at, s.store_name, s.store_code
         ORDER BY sm.created_at`,
        params,
      );
      return { data: rows };
    } catch {
      return { data: [] };
    }
  }

  private normalizeStaffStoreRoles(
    primaryStoreId: string,
    primaryRole: StaffRoleValue,
    storeRoles?: StaffStoreRole[],
  ): StaffStoreRole[] {
    const byStore = new Map<string, string>();
    for (const item of storeRoles ?? []) {
      byStore.set(item.storeId, item.role);
    }
    if (!byStore.has(primaryStoreId)) {
      byStore.set(primaryStoreId, primaryRole);
    }
    return [...byStore.entries()].map(([storeId, role]) => ({ storeId, role }));
  }

  private async assertStoresExist(db: Queryable, storeIds: string[]) {
    const uniqueIds = [...new Set(storeIds)];
    if (uniqueIds.length === 0) return;

    const { rows } = await db.query<{ id: string }>(
      `SELECT id::text FROM stores WHERE id = ANY($1::uuid[])`,
      [uniqueIds],
    );
    const foundIds = new Set(rows.map((row) => row.id));
    const missingIds = uniqueIds.filter((storeId) => !foundIds.has(storeId));
    if (missingIds.length > 0) {
      throw new NotFoundException('Một hoặc nhiều cửa hàng không tồn tại');
    }
  }

  private async replaceStaffStoreRoles(db: Queryable, staffId: string, storeRoles: StaffStoreRole[]) {
    await db.query(
      `DELETE FROM staff_role_bindings WHERE staff_id = $1 AND store_id IS NOT NULL`,
      [staffId],
    );

    if (storeRoles.length === 0) return;

    const roleKeys = [...new Set(storeRoles.map((item) => STAFF_ROLE_KEY_MAP[item.role]))];
    const { rows: roleRows } = await db.query<{ id: string; role_key: string }>(
      `SELECT id::text, role_key FROM roles WHERE role_key = ANY($1::text[])`,
      [roleKeys],
    );
    const roleIds = new Map(roleRows.map((row) => [row.role_key, row.id]));

    for (const item of storeRoles) {
      const roleKey = STAFF_ROLE_KEY_MAP[item.role];
      const roleId = roleIds.get(roleKey);
      if (!roleId) {
        throw new NotFoundException(`Vai trò ${item.role} chưa được cấu hình`);
      }

      await db.query(
        `INSERT INTO staff_role_bindings (staff_id, role_id, store_id, status)
         VALUES ($1, $2, $3, 'active')`,
        [staffId, roleId, item.storeId],
      );
    }
  }

  private async ensureStaffUniqueFields(
    db: Queryable,
    fields: { staffCode?: string | null; email?: string | null; phone?: string | null; username?: string | null },
    exclude?: { staffId?: string; accountId?: string | null },
  ) {
    const excludeSql = exclude?.staffId ? 'AND id <> $2::uuid' : '';
    const excludeParams = exclude?.staffId ? [exclude.staffId] : [];

    if (fields.staffCode) {
      const { rows } = await db.query<{ id: string }>(
        `SELECT id FROM staff_members WHERE staff_code = $1 ${excludeSql} LIMIT 1`,
        [fields.staffCode, ...excludeParams],
      );
      if (rows.length > 0) throw new ConflictException(`Mã nhân viên "${fields.staffCode}" đã tồn tại`);
    }

    await this.ensureBusinessAccountLoginUnique(
      db,
      {
        email: fields.email,
        phone: fields.phone,
        username: fields.username,
      },
      exclude?.accountId ?? undefined,
    );
  }

  async createStaff(businessId: string, dto: CreateStaffDto) {
    const [biz] = await this.platformDb.db
      .select({ schemaName: businesses.schemaName })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    if (!biz) throw new NotFoundException('Không tìm thấy doanh nghiệp');
    if (!biz.schemaName) throw new BadRequestException('Schema doanh nghiệp chưa sẵn sàng');

    const bizPool = this.businessDb.getPool(biz.schemaName);
    const normalizedStaffCode = dto.staffCode?.trim();
    const normalizedUsername = normalizeUsername(dto.username);
    const normalizedEmail = normalizeEmail(dto.email);
    const normalizedPhone = normalizePhone(dto.phone);

    // Auto-generate staffCode if not provided
    let staffCode = normalizedStaffCode;
    if (!staffCode) {
      const { rows: countRows } = await bizPool.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM staff_members`,
      );
      const n = parseInt(countRows[0]?.cnt ?? '0', 10) + 1;
      staffCode = `STAFF${String(n).padStart(3, '0')}`;
    }

    const storeRoles = this.normalizeStaffStoreRoles(dto.primaryStoreId, dto.role, dto.storeRoles);
    const primaryRole = storeRoles.find((item) => item.storeId === dto.primaryStoreId)?.role ?? dto.role;

    await this.ensureStaffUniqueFields(bizPool, {
      staffCode,
      username: normalizedUsername,
      email: normalizedEmail,
      phone: normalizedPhone,
    });
    await this.assertStoresExist(bizPool, storeRoles.map((item) => item.storeId));

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const client = await bizPool.connect();
    try {
      await client.query('BEGIN');
      const account = await client.query<{ id: string }>(
        `INSERT INTO accounts (username, email, phone, password_hash, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id::text`,
        [normalizedUsername ?? null, normalizedEmail ?? null, normalizedPhone ?? null, passwordHash],
      );
      const accountId = account.rows[0]?.id;
      if (!accountId) {
        throw new ConflictException('Không thể tạo tài khoản đăng nhập');
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO staff_members
           (staff_code, account_id, full_name, email, phone, password_hash, role, is_active, employment_status, primary_store_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'active', $8)
         RETURNING id::text`,
        [
          staffCode,
          accountId,
          dto.fullName,
          normalizedEmail ?? null,
          normalizedPhone ?? null,
          passwordHash,
          primaryRole,
          dto.primaryStoreId,
        ],
      );
      const staffId = inserted.rows[0]?.id;
      if (!staffId) {
        throw new ConflictException('Không thể tạo tài khoản nhân viên');
      }

      await this.replaceStaffStoreRoles(client, staffId, storeRoles);
      await client.query('COMMIT');
      return { id: staffId, staffCode };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === '23505') {
        const constraint = pgError.constraint ?? '';
        if (constraint.includes('email')) {
          throw new ConflictException('Email đã tồn tại');
        }
        if (constraint.includes('phone')) {
          throw new ConflictException('Số điện thoại đã tồn tại');
        }
        if (constraint.includes('username')) {
          throw new ConflictException('Username đã tồn tại');
        }
        if (constraint.includes('staff_code') || constraint.includes('staff_members_staff_code_unique') || constraint.includes('uq_staff_members_staff_code')) {
          throw new ConflictException(`Mã nhân viên "${staffCode}" đã tồn tại`);
        }
        throw new ConflictException('Tài khoản doanh nghiệp đã tồn tại (mã nhân viên, username, email hoặc số điện thoại)');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStaff(businessId: string, staffId: string, dto: UpdateStaffDto) {
    const [biz] = await this.platformDb.db
      .select({ schemaName: businesses.schemaName })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    if (!biz) throw new NotFoundException('Không tìm thấy doanh nghiệp');
    if (!biz.schemaName) throw new BadRequestException('Schema doanh nghiệp chưa sẵn sàng');

    const bizPool = this.businessDb.getPool(biz.schemaName);
    const { rows: existingRows } = await bizPool.query<{
      id: string;
      staff_code: string;
      account_id: string | null;
      password_hash: string;
      role: StaffRoleValue;
      primary_store_id: string;
    }>(
      `SELECT id::text, staff_code, account_id::text, password_hash, role, primary_store_id::text
       FROM staff_members
       WHERE id = $1::uuid
       LIMIT 1`,
      [staffId],
    );
    const existing = existingRows[0];
    if (!existing) throw new NotFoundException('Không tìm thấy nhân viên');

    const normalizedFullName = dto.fullName === null ? null : dto.fullName?.trim();
    const normalizedStaffCode = dto.staffCode === null ? null : dto.staffCode?.trim();
    const normalizedUsername = normalizeUsername(dto.username);
    const normalizedEmail = normalizeEmail(dto.email);
    const normalizedPhone = normalizePhone(dto.phone);
    const nextPrimaryStoreId = dto.primaryStoreId ?? existing.primary_store_id;
    const fallbackRole = dto.role ?? existing.role;
    const storeRoles = dto.storeRoles
      ? this.normalizeStaffStoreRoles(nextPrimaryStoreId, fallbackRole, dto.storeRoles)
      : undefined;
    const nextRole = storeRoles?.find((item) => item.storeId === nextPrimaryStoreId)?.role ?? fallbackRole;
    const nextMemberRole = nextRole === 'owner' ? 'admin' : nextRole;

    await this.ensureStaffUniqueFields(
      bizPool,
      {
        staffCode: normalizedStaffCode === undefined ? undefined : normalizedStaffCode,
        username: normalizedUsername === undefined ? undefined : normalizedUsername,
        email: normalizedEmail === undefined ? undefined : normalizedEmail,
        phone: normalizedPhone === undefined ? undefined : normalizedPhone,
      },
      { staffId, accountId: existing.account_id },
    );

    if (dto.primaryStoreId || storeRoles) {
      await this.assertStoresExist(bizPool, [
        nextPrimaryStoreId,
        ...(storeRoles ?? []).map((item) => item.storeId),
      ]);
    }

    const assignments: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    const addValue = (column: string, value: unknown) => {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    };

    if (normalizedFullName !== undefined) addValue('full_name', normalizedFullName);
    if (normalizedStaffCode !== undefined) addValue('staff_code', normalizedStaffCode);
    if (normalizedEmail !== undefined) addValue('email', normalizedEmail);
    if (normalizedPhone !== undefined) addValue('phone', normalizedPhone);
    if (dto.role !== undefined || storeRoles) addValue('role', nextMemberRole);
    if (dto.primaryStoreId !== undefined || storeRoles) addValue('primary_store_id', nextPrimaryStoreId);
    if (dto.isActive !== undefined) addValue('is_active', dto.isActive);
    if (dto.employmentStatus !== undefined) addValue('employment_status', dto.employmentStatus);
    if (dto.password) addValue('password_hash', await bcrypt.hash(dto.password, 10));

    const client = await bizPool.connect();
    try {
      await client.query('BEGIN');
      let accountId = existing.account_id;
      if (!accountId) {
        const createdAccount = await client.query<{ id: string }>(
          `INSERT INTO accounts (username, email, phone, password_hash, status)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id::text`,
          [
            normalizedUsername ?? null,
            normalizedEmail ?? null,
            normalizedPhone ?? null,
            dto.password ? await bcrypt.hash(dto.password, 10) : existing.password_hash,
            dto.isActive === false ? 'disabled' : 'active',
          ],
        );
        accountId = createdAccount.rows[0]?.id ?? null;
        if (!accountId) throw new ConflictException('Không thể tạo tài khoản đăng nhập');
        addValue('account_id', accountId);
      } else {
        const accountAssignments: string[] = ['updated_at = NOW()'];
        const accountValues: unknown[] = [];
        const addAccountValue = (column: string, value: unknown) => {
          accountValues.push(value);
          accountAssignments.push(`${column} = $${accountValues.length}`);
        };

        if (normalizedUsername !== undefined) addAccountValue('username', normalizedUsername);
        if (normalizedEmail !== undefined) addAccountValue('email', normalizedEmail);
        if (normalizedPhone !== undefined) addAccountValue('phone', normalizedPhone);
        if (dto.password) addAccountValue('password_hash', await bcrypt.hash(dto.password, 10));
        if (dto.isActive !== undefined) addAccountValue('status', dto.isActive ? 'active' : 'disabled');

        if (accountValues.length > 0) {
          accountValues.push(accountId);
          await client.query(
            `UPDATE accounts SET ${accountAssignments.join(', ')} WHERE id = $${accountValues.length}::uuid`,
            accountValues,
          );
        }
      }

      values.push(staffId);
      await client.query(
        `UPDATE staff_members SET ${assignments.join(', ')} WHERE id = $${values.length}::uuid`,
        values,
      );
      if (storeRoles) {
        await this.replaceStaffStoreRoles(client, staffId, storeRoles);
      }
      await client.query('COMMIT');
      return { ok: true };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === '23505') {
        const constraint = pgError.constraint ?? '';
        if (constraint.includes('email')) {
          throw new ConflictException('Email đã tồn tại');
        }
        if (constraint.includes('phone')) {
          throw new ConflictException('Số điện thoại đã tồn tại');
        }
        if (constraint.includes('username')) {
          throw new ConflictException('Username đã tồn tại');
        }
        if (constraint.includes('staff_code') || constraint.includes('staff_members_staff_code_unique') || constraint.includes('uq_staff_members_staff_code')) {
          throw new ConflictException(`Mã nhân viên "${normalizedStaffCode ?? existing.staff_code}" đã tồn tại`);
        }
        throw new ConflictException('Tài khoản doanh nghiệp đã tồn tại (mã nhân viên, username, email hoặc số điện thoại)');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, dto: UpdateStatusDto, actorId?: string) {
    const [business] = await this.platformDb.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');

    const doUpdate = (db: typeof this.platformDb.db) =>
      db.update(businesses).set({ status: dto.status, updatedAt: new Date().toISOString() }).where(eq(businesses.id, id));

    if (actorId) {
      await this.platformDb.runWithActor(actorId, doUpdate);
    } else {
      await doUpdate(this.platformDb.db);
    }

    return { id, status: dto.status };
  }

  async updatePlan(id: string, plan: string, actorId?: string) {
    const VALID_PLANS = ['starter', 'standard', 'professional', 'enterprise'];
    if (!VALID_PLANS.includes(plan)) {
      throw new BadRequestException('Gói dịch vụ không hợp lệ');
    }

    const [business] = await this.platformDb.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');

    const doUpdate = (db: typeof this.platformDb.db) =>
      db.update(businesses).set({ subscriptionPlan: plan, updatedAt: new Date().toISOString() }).where(eq(businesses.id, id));

    if (actorId) {
      await this.platformDb.runWithActor(actorId, doUpdate);
    } else {
      await doUpdate(this.platformDb.db);
    }

    return { id, plan };
  }

  async delete(id: string) {
    const [business] = await this.platformDb.db
      .select({ id: businesses.id, schemaName: businesses.schemaName })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    if (!business) throw new NotFoundException('Không tìm thấy doanh nghiệp');

    if (business.schemaName) {
      await this.adminPool.query(`DROP SCHEMA IF EXISTS "${business.schemaName}" CASCADE`);
    }

    await this.platformDb.db.delete(businessSubscriptions).where(eq(businessSubscriptions.businessId, id));
    await this.platformDb.db.delete(accountBusinesses).where(eq(accountBusinesses.businessId, id));
    await this.platformDb.db.delete(businesses).where(eq(businesses.id, id));

    return { ok: true };
  }
}
