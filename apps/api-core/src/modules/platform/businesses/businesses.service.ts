import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { eq, ilike, or, count, desc, and, type SQL } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { BusinessDbService } from '@common/database/business-db.service';
import { businesses, businessSubscriptions } from '@schema/platform';
import { env } from '@config/env';
import type { CreateBusinessDto } from './dto/create-business.dto';
import type { ListBusinessesDto } from './dto/list-businesses.dto';
import type { UpdateStatusDto } from './dto/update-status.dto';

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

  async list(dto: ListBusinessesDto) {
    const { page, limit, status, search } = dto;
    const offset = (page - 1) * limit;

    const filters: SQL[] = [];
    if (status) filters.push(eq(businesses.status, status));
    if (search) {
      filters.push(
        or(
          ilike(businesses.legalName!, `%${search}%`),
          ilike(businesses.businessCode!, `%${search}%`),
          ilike(businesses.brandName!, `%${search}%`),
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
        })
        .from(businesses)
        .where(whereClause)
        .orderBy(desc(businesses.createdAt))
        .limit(limit)
        .offset(offset),
      this.platformDb.db
        .select({ total: count() })
        .from(businesses)
        .where(whereClause),
    ]);

    return {
      data: rows,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    };
  }

  async getOne(id: string) {
    const [business] = await this.platformDb.db
      .select()
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);

    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async create(dto: CreateBusinessDto) {
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
      const seedPath = path.join(process.cwd(), '..', '..', 'database', 'seeds', 'seed_business_rbac.sql');
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
      const { rows: staffRows } = await bizPool.query<{ id: string }>(
        `INSERT INTO staff_members (staff_code, full_name, email, password_hash, role, is_active, employment_status, primary_store_id)
         VALUES ('OWN001', $1, $2, $3, 'admin', true, 'active', $4) RETURNING id`,
        [dto.ownerFullName, dto.ownerEmail, passwordHash, storeId],
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
        await this.platformDb.db.delete(businesses).where(eq(businesses.id, businessId)).catch(() => {});
      }
      throw err;
    }
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    const [business] = await this.platformDb.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    if (!business) throw new NotFoundException('Business not found');

    await this.platformDb.db
      .update(businesses)
      .set({ status: dto.status, updatedAt: new Date().toISOString() })
      .where(eq(businesses.id, id));

    return { id, status: dto.status };
  }
}
