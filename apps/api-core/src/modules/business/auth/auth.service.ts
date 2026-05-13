import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { BusinessDbService } from '@common/database/business-db.service';
import { businesses } from '@schema/platform';
import type { LoginDto } from './dto/login.dto';
import type { SelectStoreDto } from './dto/select-store.dto';

interface StaffRow {
  id: string;
  email: string;
  full_name: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  employment_status: string;
  password_hash: string;
}

interface StoreRow {
  id: string;
  store_name: string;
  store_code: string;
  is_active: boolean;
}

interface JwtPayload {
  sub: string;
  businessCode: string;
  schemaName: string;
  role: string;
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
    const [business] = await this.platformDb.db
      .select()
      .from(businesses)
      .where(eq(businesses.businessCode, dto.businessCode))
      .limit(1);

    if (!business || business.status !== 'active') {
      throw new UnauthorizedException('Business not found or inactive');
    }

    const pool = this.businessDb.getPool(business.schemaName!);
    const { rows } = await pool.query<StaffRow>(
      `SELECT id, email, full_name, display_name, role, is_active, employment_status, password_hash
       FROM staff_members WHERE email = $1 LIMIT 1`,
      [dto.email],
    );

    const staff = rows[0];
    if (!staff) throw new UnauthorizedException('Invalid credentials');
    if (!staff.is_active || staff.employment_status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    const valid = await bcrypt.compare(dto.password, staff.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await pool.query(`UPDATE staff_members SET last_login_at = NOW() WHERE id = $1`, [staff.id]);

    const payload: JwtPayload = {
      sub: staff.id,
      businessCode: business.businessCode!,
      schemaName: business.schemaName!,
      role: staff.role,
      scope: 'business',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      staff: {
        id: staff.id,
        email: staff.email,
        fullName: staff.full_name,
        displayName: staff.display_name,
        role: staff.role,
      },
    };
  }

  async selectStore(dto: SelectStoreDto, jwtPayload: JwtPayload) {
    const pool = this.businessDb.getPool(jwtPayload.schemaName);

    const { rows: storeRows } = await pool.query<StoreRow>(
      `SELECT id, store_name, store_code, is_active FROM stores WHERE id = $1 LIMIT 1`,
      [dto.storeId],
    );

    const store = storeRows[0];
    if (!store || !store.is_active) {
      throw new UnauthorizedException('Store not found or inactive');
    }

    const { rows: bindingRows } = await pool.query(
      `SELECT id FROM staff_role_bindings
       WHERE staff_id = $1 AND status = 'active'
         AND (store_id = $2 OR store_id IS NULL)
       LIMIT 1`,
      [jwtPayload.sub, dto.storeId],
    );

    if (bindingRows.length === 0) {
      throw new UnauthorizedException('No access to this store');
    }

    const payload: JwtPayload = {
      sub: jwtPayload.sub,
      businessCode: jwtPayload.businessCode,
      schemaName: jwtPayload.schemaName,
      role: jwtPayload.role,
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
