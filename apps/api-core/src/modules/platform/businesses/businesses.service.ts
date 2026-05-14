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
import { Pool } from 'pg';
import { eq, ilike, or, count, desc, and, inArray, type SQL } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { BusinessDbService } from '@common/database/business-db.service';
import { businesses, businessSubscriptions, accountBusinesses, accounts } from '@schema/platform';
import { env } from '@config/env';
import type { CreateBusinessDto } from './dto/create-business.dto';
import type { ListBusinessesDto } from './dto/list-businesses.dto';
import type { UpdateStatusDto } from './dto/update-status.dto';
import type { UpdateBusinessDto } from './dto/update-business.dto';
import type { AddAssigneeDto } from './dto/manage-assignee.dto';
import type { CreateStaffDto } from './dto/create-staff.dto';

const TRIAL_DAYS = 10;

function deriveSubscriptionStatus(
  businessStatus: string | null,
  createdAt: string | null,
  subStatus: string | null,
  periodEnd: string | null,
): string {
  if (businessStatus === 'suspended') return 'suspended';
  if (businessStatus === 'inactive') return 'cancelled';
  if (businessStatus === 'pending') return 'pending';

  if (subStatus === 'cancelled') return 'cancelled';
  if (subStatus === 'inactive') return 'cancelled';
  if (subStatus === 'pending') return 'pending';

  // DB status='active' — check if expired first
  if (periodEnd && new Date(periodEnd) < new Date()) return 'past_due';

  // Within trial window?
  const msPerDay = 86_400_000;
  const age = createdAt ? (Date.now() - new Date(createdAt).getTime()) / msPerDay : Infinity;
  return age <= TRIAL_DAYS ? 'trialing' : 'active';
}

@Injectable()
export class BusinessesService implements OnModuleInit, OnModuleDestroy {
  private adminPool: Pool;

  constructor(
    private readonly platformDb: PlatformDbService,
    private readonly businessDb: BusinessDbService,
  ) {}

  onModuleInit() {
    this.adminPool = new Pool({ connectionString: env.databaseUrl });
  }

  async onModuleDestroy() {
    await this.adminPool.end();
  }

  async list(dto: ListBusinessesDto, scopeAccountId?: string) {
    const { page, limit, status, search } = dto;
    const offset = (page - 1) * limit;

    const filters: SQL[] = [];

    if (scopeAccountId) {
      const assigned = await this.platformDb.db
        .select({ businessId: accountBusinesses.businessId })
        .from(accountBusinesses)
        .where(and(eq(accountBusinesses.accountId, scopeAccountId), eq(accountBusinesses.status, 'active')));
      const ids = assigned.map((r) => r.businessId).filter(Boolean) as string[];
      if (ids.length === 0) return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
      filters.push(inArray(businesses.id, ids));
    }

    if (status) filters.push(eq(businesses.status, status));
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
    const whereClause = filters.length > 0 ? and(...filters) : undefined;

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
          createdAt: businesses.createdAt,
          _subStatus: businessSubscriptions.status,
          _subPeriodEnd: businessSubscriptions.currentPeriodEnd,
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

    const data = rows.map(({ _subStatus, _subPeriodEnd, ...row }) => {
      const subscriptionStatus = deriveSubscriptionStatus(row.status, row.createdAt, _subStatus, _subPeriodEnd);
      const trialEndsAt = row.createdAt
        ? new Date(new Date(row.createdAt).getTime() + TRIAL_DAYS * 86_400_000).toISOString()
        : null;
      const trialDaysLeft =
        subscriptionStatus === 'trialing' && trialEndsAt
          ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
          : null;

      return {
        ...row,
        subscriptionStatus,
        trialStartedAt: row.createdAt,
        trialEndsAt,
        trialDaysLeft,
        assignedAccount: assignedAccountMap.get(row.id) ?? null,
        firstStore: firstStoreMap.get(row.id) ?? null,
      };
    });

    return {
      data,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    };
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
    await Promise.all(
      targets.map(async ({ id, schemaName }) => {
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
      }),
    );
    return map;
  }

  async getOne(id: string, scopeAccountId?: string) {
    if (scopeAccountId) {
      const [access] = await this.platformDb.db
        .select({ id: accountBusinesses.id })
        .from(accountBusinesses)
        .where(
          and(
            eq(accountBusinesses.accountId, scopeAccountId),
            eq(accountBusinesses.businessId, id),
            eq(accountBusinesses.status, 'active'),
          ),
        )
        .limit(1);
      if (!access) throw new ForbiddenException('Access denied');
    }

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
        timezoneName: businesses.timezoneName,
        note: businesses.note,
        subscriptionExpiresAt: businesses.subscriptionExpiresAt,
        createdAt: businesses.createdAt,
        updatedAt: businesses.updatedAt,
        _subStatus: businessSubscriptions.status,
        _subPeriodStart: businessSubscriptions.currentPeriodStart,
        _subPeriodEnd: businessSubscriptions.currentPeriodEnd,
        _subRenewedAt: businessSubscriptions.renewedAt,
      })
      .from(businesses)
      .leftJoin(businessSubscriptions, eq(businessSubscriptions.businessId, businesses.id))
      .where(eq(businesses.id, id))
      .limit(1);

    if (!business) throw new NotFoundException('Business not found');

    const { _subStatus, _subPeriodStart, _subPeriodEnd, _subRenewedAt, ...row } = business;
    const subscriptionStatus = deriveSubscriptionStatus(row.status, row.createdAt, _subStatus, _subPeriodEnd);
    const trialEndsAt = row.createdAt
      ? new Date(new Date(row.createdAt).getTime() + TRIAL_DAYS * 86_400_000).toISOString()
      : null;
    const trialDaysLeft =
      subscriptionStatus === 'trialing' && trialEndsAt
        ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
        : null;

    return {
      ...row,
      subscriptionStatus,
      trialStartedAt: row.createdAt,
      trialEndsAt,
      trialDaysLeft,
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
    if (!biz) throw new NotFoundException('Business not found');
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

  private async getStaffCountsByStore(schemaName: string, storeIds: string[]): Promise<Map<string, number>> {
    if (storeIds.length === 0) return new Map();
    try {
      const { rows } = await this.adminPool.query<{ store_id: string; cnt: string }>(
        `SELECT primary_store_id AS store_id, COUNT(*)::text AS cnt
         FROM "${schemaName}".staff_members
         WHERE primary_store_id = ANY($1) AND is_active = true
         GROUP BY primary_store_id`,
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
      .where(and(eq(accountBusinesses.businessId, businessId), eq(accountBusinesses.status, 'active')))
      .orderBy(accountBusinesses.createdAt);
    return { data: rows };
  }

  async addAssignee(businessId: string, dto: AddAssigneeDto) {
    const [biz] = await this.platformDb.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    if (!biz) throw new NotFoundException('Business not found');

    const [account] = await this.platformDb.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, dto.accountId))
      .limit(1);
    if (!account) throw new NotFoundException('Account not found');

    await this.platformDb.db
      .insert(accountBusinesses)
      .values({
        accountId: dto.accountId,
        businessId,
        accessLevel: dto.accessLevel,
        status: 'active',
      })
      .onConflictDoNothing();

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
    if (!business) throw new NotFoundException('Business not found');

    const patch: Partial<typeof businesses.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (dto.legalName !== undefined) patch.legalName = dto.legalName;
    if (dto.brandName !== undefined) patch.brandName = dto.brandName;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.taxCode !== undefined) patch.taxCode = dto.taxCode;
    if (dto.currencyCode !== undefined) patch.currencyCode = dto.currencyCode;
    if (dto.timezoneName !== undefined) patch.timezoneName = dto.timezoneName;
    if (dto.note !== undefined) patch.note = dto.note;

    const doUpdate = (db: typeof this.platformDb.db) =>
      db.update(businesses).set(patch).where(eq(businesses.id, id));

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
      throw new BadRequestException('Invalid businessCode format');
    }

    const [existing] = await this.platformDb.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.businessCode!, dto.businessCode))
      .limit(1);
    if (existing) throw new ConflictException('businessCode already exists');

    const { rows: schemaCheck } = await this.adminPool.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName],
    );
    if (schemaCheck.length > 0) throw new ConflictException('Schema already exists');

    let schemaCreated = false;
    let businessId: string | null = null;

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
          email: dto.email,
          phone: dto.phone,
          subscriptionPlan: dto.plan ?? 'standard',
          timezoneName: dto.timezone ?? 'Asia/Ho_Chi_Minh',
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
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);
        await this.platformDb.db.insert(businessSubscriptions).values({
          businessId,
          planCode: dto.plan ?? 'standard',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
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
        `INSERT INTO stores (store_code, store_name, store_type, address, city)
         VALUES ($1, $2, 'retail', $3, $4) RETURNING id`,
        [
          dto.firstStore.storeCode ?? 'STORE001',
          dto.firstStore.storeName,
          dto.firstStore.address ?? null,
          dto.firstStore.city ?? null,
        ],
      );
      const storeId = storeRows[0].id;

      // Step 9: Create owner staff member
      const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);
      const ownerCode = dto.ownerStaffCode ?? 'OWN001';
      const { rows: staffRows } = await bizPool.query<{ id: string }>(
        `INSERT INTO staff_members (staff_code, full_name, email, phone, password_hash, role, is_active, employment_status, primary_store_id)
         VALUES ($1, $2, $3, $4, $5, 'admin', true, 'active', $6) RETURNING id`,
        [ownerCode, dto.ownerFullName, dto.ownerEmail ?? null, dto.ownerPhone ?? null, passwordHash, storeId],
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

      return { id: businessId, schemaName, status: 'created' };
    } catch (err) {
      if (schemaCreated) {
        await this.adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => {});
      }
      if (businessId) {
        await this.platformDb.db.delete(businessSubscriptions).where(eq(businessSubscriptions.businessId, businessId)).catch(() => {});
        await this.platformDb.db.delete(businesses).where(eq(businesses.id, businessId)).catch(() => {});
      }
      throw err;
    }
  }

  async getStaff(businessId: string, storeId?: string) {
    const [biz] = await this.platformDb.db
      .select({ schemaName: businesses.schemaName })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    if (!biz) throw new NotFoundException('Business not found');
    if (!biz.schemaName) return { data: [] };

    try {
      const params: unknown[] = [];
      let where = '';
      if (storeId) {
        params.push(storeId);
        where = `WHERE sm.primary_store_id = $1::uuid`;
      }
      const { rows } = await this.adminPool.query(
        `SELECT sm.id::text, sm.staff_code AS "staffCode", sm.full_name AS "fullName",
                sm.email, sm.phone, sm.role, sm.is_active AS "isActive",
                sm.employment_status AS "employmentStatus",
                sm.primary_store_id::text AS "primaryStoreId",
                sm.last_login_at AS "lastLoginAt", sm.created_at AS "createdAt",
                s.store_name AS "storeName", s.store_code AS "storeCode"
         FROM "${biz.schemaName}".staff_members sm
         LEFT JOIN "${biz.schemaName}".stores s ON s.id = sm.primary_store_id
         ${where}
         ORDER BY sm.created_at`,
        params,
      );
      return { data: rows };
    } catch {
      return { data: [] };
    }
  }

  async createStaff(businessId: string, dto: CreateStaffDto) {
    const [biz] = await this.platformDb.db
      .select({ schemaName: businesses.schemaName })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    if (!biz) throw new NotFoundException('Business not found');
    if (!biz.schemaName) throw new BadRequestException('Business schema not ready');

    const bizPool = this.businessDb.getPool(biz.schemaName);

    // Auto-generate staffCode if not provided
    let staffCode = dto.staffCode;
    if (!staffCode) {
      const { rows: countRows } = await bizPool.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM staff_members`,
      );
      const n = parseInt(countRows[0]?.cnt ?? '0', 10) + 1;
      staffCode = `STAFF${String(n).padStart(3, '0')}`;
    }

    // Check storeId exists
    const { rows: storeRows } = await bizPool.query<{ id: string }>(
      `SELECT id FROM stores WHERE id = $1 LIMIT 1`,
      [dto.primaryStoreId],
    );
    if (storeRows.length === 0) throw new NotFoundException('Store not found');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { rows } = await bizPool.query<{ id: string }>(
      `INSERT INTO staff_members
         (staff_code, full_name, email, phone, password_hash, role, is_active, employment_status, primary_store_id)
       VALUES ($1, $2, $3, $4, $5, $6, true, 'active', $7)
       RETURNING id::text`,
      [staffCode, dto.fullName, dto.email ?? null, dto.phone ?? null, passwordHash, dto.role, dto.primaryStoreId],
    );
    const staffId = rows[0].id;

    // Bind to matching system role
    const roleKeyMap: Record<string, string> = {
      admin: 'ADMIN', cashier: 'CASHIER', inventory: 'INVENTORY',
      kitchen: 'KITCHEN', delivery: 'DELIVERY', staff: 'STAFF',
    };
    const roleKey = roleKeyMap[dto.role] ?? 'STAFF';
    const { rows: roleRows } = await bizPool.query<{ id: string }>(
      `SELECT id FROM roles WHERE role_key = $1 LIMIT 1`,
      [roleKey],
    );
    if (roleRows.length > 0) {
      await bizPool.query(
        `INSERT INTO staff_role_bindings (staff_id, role_id, store_id, status) VALUES ($1, $2, $3, 'active')
         ON CONFLICT DO NOTHING`,
        [staffId, roleRows[0].id, dto.primaryStoreId],
      );
    }

    return { id: staffId, staffCode };
  }

  async updateStatus(id: string, dto: UpdateStatusDto, actorId?: string) {
    const [business] = await this.platformDb.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    if (!business) throw new NotFoundException('Business not found');

    const doUpdate = (db: typeof this.platformDb.db) =>
      db.update(businesses).set({ status: dto.status, updatedAt: new Date().toISOString() }).where(eq(businesses.id, id));

    if (actorId) {
      await this.platformDb.runWithActor(actorId, doUpdate);
    } else {
      await doUpdate(this.platformDb.db);
    }

    return { id, status: dto.status };
  }
}
