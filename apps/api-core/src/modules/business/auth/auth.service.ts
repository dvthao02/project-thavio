import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { BusinessDbService } from '@common/database/business-db.service';
import { businesses } from '@schema/platform';
import type { LoginDto } from './dto/login.dto';
import type { SelectStoreDto } from './dto/select-store.dto';

interface BusinessAccountRow {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  password_hash: string;
  staff_id: string;
  full_name: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  employment_status: string;
}

interface StoreContextRow {
  store_id: string;
  store_name: string;
  store_code: string;
  role_id: string;
  role: string;
}

interface StoreRow {
  id: string;
  store_name: string;
  store_code: string;
  is_active: boolean;
}

interface JwtPayload {
  sub: string;
  staffId: string;
  businessId: string;
  currentBusinessId: string;
  businessCode: string;
  schemaName: string;
  role: string;
  currentRoleId?: string;
  currentStoreId?: string;
  storeId?: string;
  scope: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly platformDb: PlatformDbService,
    private readonly businessDb: BusinessDbService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const businessCode = dto.businessCode.trim();
    const identifier = dto.identifier.trim();

    const [business] = await this.platformDb.db
      .select()
      .from(businesses)
      .where(eq(businesses.businessCode, businessCode))
      .limit(1);

    if (!business || business.status !== 'active') {
      throw new UnauthorizedException('Không tìm thấy doanh nghiệp hoặc doanh nghiệp chưa hoạt động');
    }

    const pool = this.businessDb.getPool(business.schemaName!);
    const phoneIdentifier = identifier.replace(/[\s.-]/g, '');
    const { rows } = await pool.query<BusinessAccountRow>(
      `SELECT
          ba.id::text,
          ba.username,
          ba.email,
          ba.phone,
          ba.status,
          ba.password_hash,
          sm.id::text AS staff_id,
          sm.full_name,
          sm.display_name,
          sm.role,
          sm.is_active,
          sm.employment_status
       FROM accounts ba
       JOIN staff_members sm ON sm.account_id = ba.id
       WHERE LOWER(ba.email) = LOWER($1)
          OR LOWER(ba.username) = LOWER($1)
          OR ba.phone = $2
          OR LOWER(sm.staff_code) = LOWER($1)
       LIMIT 1`,
      [identifier, phoneIdentifier],
    );

    const account = rows[0];
    if (!account) throw new UnauthorizedException('Thông tin đăng nhập không đúng');
    if (account.status !== 'active' || !account.is_active || account.employment_status !== 'active') {
      throw new UnauthorizedException('Tài khoản đã bị khóa hoặc không còn hoạt động');
    }

    const valid = await bcrypt.compare(dto.password, account.password_hash);
    if (!valid) throw new UnauthorizedException('Thông tin đăng nhập không đúng');

    await Promise.all([
      pool.query(`UPDATE accounts SET last_login_at = NOW() WHERE id = $1`, [account.id]),
      pool.query(`UPDATE staff_members SET last_login_at = NOW() WHERE id = $1`, [account.staff_id]),
    ]);

    const contexts = await this.getStoreContexts(pool, account.staff_id);
    const selectedContext = contexts.length === 1 ? contexts[0] : null;

    const payload: JwtPayload = {
      sub: account.id,
      staffId: account.staff_id,
      businessId: business.id,
      currentBusinessId: business.id,
      businessCode: business.businessCode!,
      schemaName: business.schemaName!,
      role: selectedContext?.role ?? account.role,
      currentRoleId: selectedContext?.role_id,
      currentStoreId: selectedContext?.store_id,
      storeId: selectedContext?.store_id,
      scope: 'business',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      requiresContextSelection: contexts.length > 1,
      contexts,
      account: {
        id: account.id,
        username: account.username,
        email: account.email,
        phone: account.phone,
      },
      staff: {
        id: account.staff_id,
        fullName: account.full_name,
        displayName: account.display_name,
        role: account.role,
      },
    };
  }

  private async getStoreContexts(pool: ReturnType<BusinessDbService['getPool']>, staffId: string): Promise<StoreContextRow[]> {
    const { rows } = await pool.query<StoreContextRow>(
      `SELECT
         s.id::text AS store_id,
         s.store_name,
         s.store_code,
         r.id::text AS role_id,
         LOWER(r.role_key) AS role
       FROM staff_role_bindings rb
       JOIN stores s ON s.id = rb.store_id
       JOIN roles r ON r.id = rb.role_id
       WHERE rb.staff_id = $1
         AND rb.status = 'active'
         AND s.is_active = true
       ORDER BY s.store_name`,
      [staffId],
    );
    return rows;
  }

  async selectStore(dto: SelectStoreDto, jwtPayload: JwtPayload) {
    const pool = this.businessDb.getPool(jwtPayload.schemaName);

    const { rows: storeRows } = await pool.query<StoreRow>(
      `SELECT id, store_name, store_code, is_active FROM stores WHERE id = $1 LIMIT 1`,
      [dto.storeId],
    );

    const store = storeRows[0];
    if (!store || !store.is_active) {
      throw new UnauthorizedException('Không tìm thấy cửa hàng hoặc cửa hàng chưa hoạt động');
    }

    const { rows: bindingRows } = await pool.query<{ role_id: string; role: string }>(
      `SELECT r.id::text AS role_id, LOWER(r.role_key) AS role
       FROM staff_role_bindings rb
       JOIN roles r ON r.id = rb.role_id
       WHERE rb.staff_id = $1 AND rb.status = 'active'
         AND (rb.store_id = $2 OR rb.store_id IS NULL)
       LIMIT 1`,
      [jwtPayload.staffId, dto.storeId],
    );

    const binding = bindingRows[0];
    if (!binding) {
      throw new UnauthorizedException('Tài khoản không có quyền truy cập cửa hàng này');
    }

    const payload: JwtPayload = {
      sub: jwtPayload.sub,
      staffId: jwtPayload.staffId,
      businessId: jwtPayload.businessId,
      currentBusinessId: jwtPayload.currentBusinessId,
      businessCode: jwtPayload.businessCode,
      schemaName: jwtPayload.schemaName,
      role: binding.role,
      currentRoleId: binding.role_id,
      currentStoreId: dto.storeId,
      storeId: dto.storeId,
      scope: 'business',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      store: {
        id: store.id,
        storeName: store.store_name,
        storeCode: store.store_code,
      },
    };
  }
}
