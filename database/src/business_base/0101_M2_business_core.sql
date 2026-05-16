
-- ════════════════════════════════════════════════════════════════
-- MODULE 2: CORE ENTITIES (Layer 1)
-- ════════════════════════════════════════════════════════════════

-- Cửa hàng / Chi nhánh
CREATE TABLE IF NOT EXISTS stores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    UUID,  -- NULL = cửa hàng gốc (single store), có parent_id = chi nhánh
  store_code   VARCHAR(30)  NOT NULL UNIQUE,  -- AUTO: st123456 hoặc parent_code_N
  store_name   VARCHAR(255) NOT NULL,
  store_type   VARCHAR(30)  NOT NULL DEFAULT 'retail',
  phone        VARCHAR(30),
  email        VARCHAR(255),
  address      TEXT,
  district     VARCHAR(100),
  city         VARCHAR(100),
  latitude     NUMERIC(10,7),
  longitude    NUMERIC(10,7),
  timezone     VARCHAR(50)  NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  open_time    TIME,
  close_time   TIME,
  image_url    VARCHAR(500),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_store_type CHECK (store_type = ANY(ARRAY['retail','warehouse','office','kiosk']))
);

-- Bộ phận / Phòng ban
CREATE TABLE IF NOT EXISTS departments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID,  -- self FK (khai báo trong Block FK)
  department_code VARCHAR(20),
  department_name VARCHAR(150) NOT NULL,
  description     TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO departments (department_code,department_name) VALUES
  ('BGD','Ban Giám Đốc'),('KT','Kế Toán'),('TN','Thu Ngân'),
  ('PV','Phục Vụ'),('BEP','Bếp / Pha Chế'),('KHO','Kho'),('MKT','Marketing')
ON CONFLICT DO NOTHING;

-- Tài khoản đăng nhập trong phạm vi doanh nghiệp
CREATE TABLE IF NOT EXISTS accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code   VARCHAR(30),
  username       VARCHAR(80),
  email          VARCHAR(255),
  phone          VARCHAR(30),
  password_hash  VARCHAR(255) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'active',
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_accounts_status CHECK (status = ANY(ARRAY['active','locked','disabled']))
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_username_unique ON accounts (LOWER(username)) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique ON accounts (LOWER(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_phone_unique ON accounts (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_account_code_unique ON accounts (account_code) WHERE account_code IS NOT NULL;

-- Nhân viên
CREATE TABLE IF NOT EXISTS staff_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_code          VARCHAR(30)  NOT NULL,  -- AUTO: NV000001
  account_id          UUID UNIQUE REFERENCES accounts(id),
  full_name           VARCHAR(255) NOT NULL,
  display_name        VARCHAR(100),
  phone               VARCHAR(30),
  email               VARCHAR(255),
  password_hash       VARCHAR(255),  -- bcrypt (nếu app standalone)
  pin_hash            VARCHAR(255),  -- PIN 4-6 số POS
  position            VARCHAR(100),  -- Tên chức danh hiển thị
  role                VARCHAR(30)  NOT NULL DEFAULT 'staff',
  department_id       UUID         REFERENCES departments(id),
  primary_store_id    UUID         REFERENCES stores(id),
  avatar_url          VARCHAR(500),
  contract_type       VARCHAR(30)  NOT NULL DEFAULT 'full_time',
  hire_date           DATE,
  termination_date    DATE,
  base_salary         NUMERIC(15,2) NOT NULL DEFAULT 0,
  hourly_rate         NUMERIC(10,2) NOT NULL DEFAULT 0,
  national_id         VARCHAR(20),
  bank_account        VARCHAR(30),
  bank_name           VARCHAR(100),
  bank_master_id      UUID,
  employment_status   VARCHAR(20)  NOT NULL DEFAULT 'active',
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_staff_role       CHECK (role = ANY(ARRAY['admin','manager','cashier','staff','kitchen','delivery','inventory'])),
  CONSTRAINT chk_contract_type    CHECK (contract_type = ANY(ARRAY['full_time','part_time','freelance','probation'])),
  CONSTRAINT chk_emp_status       CHECK (employment_status = ANY(ARRAY['active','inactive','terminated','on_leave']))
);

-- Khách hàng
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID         REFERENCES customer_groups(id),
  customer_code VARCHAR(50)  NOT NULL,  -- AUTO: KH000001
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(30),
  email         VARCHAR(255),
  gender        VARCHAR(10),
  date_of_birth DATE,
  address       TEXT,
  tax_code      VARCHAR(50),
  loyalty_points NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_spent   NUMERIC(18,2) NOT NULL DEFAULT 0,
  visit_count   INTEGER       NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  source        VARCHAR(50),  -- walk_in/online/referral/import
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',
  note          TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_customer_gender CHECK (gender IS NULL OR gender = ANY(ARRAY['male','female','other'])),
  CONSTRAINT chk_customer_status CHECK (status = ANY(ARRAY['active','inactive','blacklisted']))
);

-- Địa chỉ khách hàng
CREATE TABLE IF NOT EXISTS customer_addresses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID         NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_label  VARCHAR(100),  -- "Nhà", "Cơ quan"
  recipient_name VARCHAR(255),
  phone          VARCHAR(30),
  address_line1  TEXT         NOT NULL,
  address_line2  TEXT,
  city           VARCHAR(100),
  province       VARCHAR(100),
  is_default     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Nhà cung cấp
CREATE TABLE IF NOT EXISTS suppliers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code  VARCHAR(30)  NOT NULL,  -- AUTO: NC000001
  supplier_name  VARCHAR(255) NOT NULL,
  contact_person VARCHAR(150),
  phone          VARCHAR(30),
  email          VARCHAR(255),
  address        TEXT,
  tax_code       VARCHAR(50),
  payment_terms  INTEGER      NOT NULL DEFAULT 30,  -- Số ngày công nợ
  bank_account   VARCHAR(30),
  bank_name      VARCHAR(100),
  bank_master_id UUID,
  total_debt     NUMERIC(18,2) NOT NULL DEFAULT 0,  -- Tự động cập nhật bởi trigger
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  note           TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Vị trí kho (stock location per store)
CREATE TABLE IF NOT EXISTS stock_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID         NOT NULL REFERENCES stores(id),
  location_code VARCHAR(30)  NOT NULL,  -- AUTO: LO000001
  location_name VARCHAR(255) NOT NULL,
  location_type VARCHAR(30)  NOT NULL DEFAULT 'main',  -- main/transit/return
  is_sellable   BOOLEAN      NOT NULL DEFAULT TRUE,   -- Được phép xuất kho bán
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Quầy thu ngân
CREATE TABLE IF NOT EXISTS registers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID         NOT NULL REFERENCES stores(id),
  register_code    VARCHAR(30)  NOT NULL,  -- AUTO: QU000001
  register_name    VARCHAR(100) NOT NULL,
  status           VARCHAR(20)  NOT NULL DEFAULT 'closed',
  ip_address       VARCHAR(45),
  device_id        VARCHAR(255),
  current_staff_id UUID         REFERENCES staff_members(id),  -- Thu ngân hiện tại
  last_open_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_register_status CHECK (status = ANY(ARRAY['open','closed','maintenance']))
);

-- Sơ đồ tầng (F&B)
CREATE TABLE IF NOT EXISTS floor_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID         NOT NULL REFERENCES stores(id),
  floor_code    VARCHAR(50)  NOT NULL,
  floor_name    VARCHAR(255) NOT NULL,
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, floor_code)
);

-- Bàn (F&B)
CREATE TABLE IF NOT EXISTS dining_tables (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID         NOT NULL REFERENCES stores(id),
  floor_id   UUID         REFERENCES floor_plans(id),
  table_code VARCHAR(50)  NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  capacity   INTEGER      NOT NULL DEFAULT 4,
  status     VARCHAR(20)  NOT NULL DEFAULT 'available',
  pos_x      INTEGER,
  pos_y      INTEGER,
  shape      VARCHAR(20)  NOT NULL DEFAULT 'rectangle',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_table_status CHECK (status = ANY(ARRAY['available','occupied','reserved','cleaning','inactive'])),
  CONSTRAINT chk_table_shape  CHECK (shape  = ANY(ARRAY['rectangle','circle','square']))
);
