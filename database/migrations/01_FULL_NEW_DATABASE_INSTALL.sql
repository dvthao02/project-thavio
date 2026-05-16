-- =====================================================================
-- POS/CRM/ERP NEW DATABASE FULL INSTALL v4
-- NEW DATABASE ONLY. Do not run on an existing production database.
-- Run inside an empty database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 01_FULL_NEW_DATABASE_INSTALL.sql
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'platform') THEN
    RAISE EXCEPTION 'NEW DATABASE ONLY: schema platform already exists. Create a fresh database or drop it intentionally.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'business_template') THEN
    RAISE EXCEPTION 'NEW DATABASE ONLY: schema business_template already exists. Create a fresh database or drop it intentionally.';
  END IF;
END $$;

-- =====================================================================
-- FILE: 0000_M0_platform.sql
-- =====================================================================
-- ════════════════════════════════════════════════════════════════
-- MODULE 0-A: EXTENSIONS + PLATFORM SCHEMA
-- Chạy với user superuser (vanthao)
-- ════════════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS platform;
SET search_path TO platform, public;

CREATE EXTENSION IF NOT EXISTS pg_trgm     WITH SCHEMA platform; -- Full-text search
CREATE EXTENSION IF NOT EXISTS pgcrypto    WITH SCHEMA platform; -- gen_random_uuid(), bcrypt
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA platform; -- Query monitor

CREATE SEQUENCE IF NOT EXISTS platform.business_code_seq START 1 INCREMENT 1;


-- bank_master: Danh mục ngân hàng cấp platform
CREATE TABLE IF NOT EXISTS platform.bank_master (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code   VARCHAR(30)  NOT NULL UNIQUE,
  bank_bin    VARCHAR(20),
  bank_name   VARCHAR(255) NOT NULL,
  short_name  VARCHAR(100),
  logo_url    VARCHAR(500),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- platform.roles: Phân quyền platform (platform/business scope)
CREATE TABLE IF NOT EXISTS platform.roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key    VARCHAR(100) NOT NULL UNIQUE,
  role_name   VARCHAR(150) NOT NULL,
  description TEXT,
  role_scope  VARCHAR(20)  NOT NULL,
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order  INTEGER      NOT NULL DEFAULT 900,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_platform_roles_scope CHECK (lower(role_scope) = ANY(ARRAY['platform','business']))
);

-- platform.permissions
CREATE TABLE IF NOT EXISTS platform.permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key VARCHAR(150) NOT NULL UNIQUE,
  permission_name VARCHAR(150) NOT NULL,
  module_key     VARCHAR(50)  NOT NULL,
  description    TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- platform.flyway_schema_history
CREATE TABLE IF NOT EXISTS platform.flyway_schema_history (
  installed_rank INTEGER  NOT NULL,
  version        VARCHAR(50),
  description    VARCHAR(200) NOT NULL,
  type           VARCHAR(20)  NOT NULL,
  script         VARCHAR(1000) NOT NULL,
  checksum       INTEGER,
  installed_by   VARCHAR(100) NOT NULL,
  installed_on   TIMESTAMP    NOT NULL DEFAULT NOW(),
  execution_time INTEGER      NOT NULL,
  success        BOOLEAN      NOT NULL,
  CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank)
);

-- accounts: Tài khoản đăng nhập (shared across tenants)
CREATE TABLE IF NOT EXISTS platform.accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username          VARCHAR(80)  NOT NULL UNIQUE,
  password          VARCHAR(255) NOT NULL,  -- bcrypt hash
  full_name         VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(30),
  avatar_url        VARCHAR(500),
  status            VARCHAR(20)  NOT NULL DEFAULT 'active',
  is_platform_admin BOOLEAN      NOT NULL DEFAULT FALSE,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_accounts_status CHECK (status = ANY(ARRAY['pending','active','locked','disabled']))
);

-- device_identities: Thiết bị đăng nhập
CREATE TABLE IF NOT EXISTS platform.device_identities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID,  -- NULL khi chưa gắn tài khoản
  device_uid       VARCHAR(120) NOT NULL UNIQUE,
  device_name      VARCHAR(255),
  device_type      VARCHAR(30)  NOT NULL,
  client_type      VARCHAR(30)  NOT NULL,
  os_name          VARCHAR(50),
  os_version       VARCHAR(50),
  app_version      VARCHAR(50),
  fingerprint_hash VARCHAR(255),
  trusted_status   VARCHAR(20)  NOT NULL DEFAULT 'pending',
  last_seen_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_device_type    CHECK (device_type  = ANY(ARRAY['pos_terminal','tablet','phone','desktop','kiosk','printer_box'])),
  CONSTRAINT chk_client_type    CHECK (client_type  = ANY(ARRAY['pos','web_admin','web_customer','mobile_staff','mobile_customer'])),
  CONSTRAINT chk_trusted_status CHECK (trusted_status = ANY(ARRAY['pending','trusted','blocked']))
);

-- auth_sessions: Phiên đăng nhập
CREATE TABLE IF NOT EXISTS platform.auth_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID         NOT NULL,
  device_identity_id   UUID,
  business_id            UUID,
  session_token_hash   VARCHAR(255) NOT NULL UNIQUE,
  refresh_token_hash   VARCHAR(255),
  login_method         VARCHAR(30)  NOT NULL DEFAULT 'password',
  session_status       VARCHAR(20)  NOT NULL DEFAULT 'active',
  ip_address           VARCHAR(100),
  user_agent           VARCHAR(1000),
  started_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ,
  revoked_at           TIMESTAMPTZ,
  last_activity_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_login_method   CHECK (login_method   = ANY(ARRAY['password','otp','social','api_key','sso'])),
  CONSTRAINT chk_session_status CHECK (session_status = ANY(ARRAY['active','expired','revoked','locked']))
);

-- account_mfa_methods: Xác thực 2 lớp
CREATE TABLE IF NOT EXISTS platform.account_mfa_methods (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     UUID         NOT NULL,
  method_type    VARCHAR(30)  NOT NULL,
  method_label   VARCHAR(100),
  secret_hash    VARCHAR(255),
  target_masked  VARCHAR(255),
  is_primary     BOOLEAN      NOT NULL DEFAULT FALSE,
  status         VARCHAR(20)  NOT NULL DEFAULT 'active',
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_mfa_method_type CHECK (method_type = ANY(ARRAY['totp','sms','email','backup_code'])),
  CONSTRAINT chk_mfa_status      CHECK (status      = ANY(ARRAY['active','inactive','revoked']))
);

-- platform.businesses: Khách hàng thuê (B2B)
CREATE TABLE IF NOT EXISTS platform.businesses (
  id                     UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  business_code            VARCHAR(50)  NOT NULL UNIQUE,  -- "acafe", "bar97"
  schema_name            VARCHAR(63)  NOT NULL UNIQUE,  -- "tenant_acafe"
  legal_name             VARCHAR(255) NOT NULL,
  brand_name             VARCHAR(255),
  subscription_plan      VARCHAR(50)  NOT NULL DEFAULT 'standard',
  status                 VARCHAR(20)  NOT NULL DEFAULT 'active',
  timezone_name          VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  currency_code          CHAR(3)      NOT NULL DEFAULT 'VND',
  phone                  VARCHAR(30),
  email                  VARCHAR(255),
  tax_code               VARCHAR(50),
  note                   TEXT,
  store_public_code      VARCHAR(12),
  subscription_expires_at TIMESTAMPTZ,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_businesses_status CHECK (status = ANY(ARRAY['trial','active','suspended','closed']))
);

CREATE UNIQUE INDEX IF NOT EXISTS businesses_tax_code_unique
  ON platform.businesses (LOWER(tax_code))
  WHERE tax_code IS NOT NULL;

-- Demo business seed removed for clean new database install.

-- business_branches: Chi nhánh / cửa hàng map sang business schema
CREATE TABLE IF NOT EXISTS platform.business_branches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID         NOT NULL,
  branch_code       VARCHAR(50)  NOT NULL,
  branch_name       VARCHAR(255) NOT NULL,
  source_schema_name VARCHAR(63) NOT NULL,
  source_branch_id  UUID,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, branch_code)
);

-- account_businesses: Liên kết tài khoản - business
CREATE TABLE IF NOT EXISTS platform.account_businesses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID        NOT NULL,
  business_id        UUID        NOT NULL,
  access_level     VARCHAR(30) NOT NULL DEFAULT 'staff',
  default_branch_code VARCHAR(50),
  status           VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, business_id),
  CONSTRAINT chk_at_access  CHECK (access_level = ANY(ARRAY['owner','admin','manager','cashier','kitchen','inventory','delivery','auditor','api','staff'])),
  CONSTRAINT chk_at_status  CHECK (status = ANY(ARRAY['active','disabled']))
);

-- account_role_bindings: Gán role cho account
CREATE TABLE IF NOT EXISTS platform.account_role_bindings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id              UUID        NOT NULL,
  role_id                 UUID        NOT NULL,
  scope_type              VARCHAR(20) NOT NULL,  -- platform/business/store
  scope_id                UUID,
  support_grant_until     TIMESTAMPTZ,
  granted_by_account_id   UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_arb_scope CHECK (scope_type = ANY(ARRAY['platform','business','store']))
);

-- account_branch_access: Truy cập cấp branch
CREATE TABLE IF NOT EXISTS platform.account_branch_access (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_business_id UUID        NOT NULL,
  tenant_branch_id  UUID        NOT NULL,
  access_level      VARCHAR(30) NOT NULL,
  is_default        BOOLEAN     NOT NULL DEFAULT FALSE,
  status            VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_business_id, tenant_branch_id),
  CONSTRAINT chk_aba_access CHECK (access_level = ANY(ARRAY['owner','admin','manager','cashier','kitchen','inventory','delivery','auditor','api','staff'])),
  CONSTRAINT chk_aba_status CHECK (status = ANY(ARRAY['active','disabled']))
);

-- platform.role_permissions
CREATE TABLE IF NOT EXISTS platform.role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID        NOT NULL,
  permission_id UUID        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id, permission_id)
);

-- api_clients: API key cho tích hợp
CREATE TABLE IF NOT EXISTS platform.api_clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID         NOT NULL,
  client_code  VARCHAR(50)  NOT NULL,
  client_name  VARCHAR(255) NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  scopes       JSONB        NOT NULL DEFAULT '[]',
  status       VARCHAR(20)  NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_api_status CHECK (status = ANY(ARRAY['active','disabled','expired']))
);

-- webhook_endpoints: Webhook outbound
CREATE TABLE IF NOT EXISTS platform.webhook_endpoints (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID          NOT NULL,
  endpoint_code VARCHAR(50)   NOT NULL,
  endpoint_url  VARCHAR(1000) NOT NULL,
  secret_hash   VARCHAR(255),
  event_types   JSONB         NOT NULL DEFAULT '[]',
  status        VARCHAR(20)   NOT NULL DEFAULT 'active',
  retry_limit   INTEGER       NOT NULL DEFAULT 5,
  last_success_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_webhook_status CHECK (status = ANY(ARRAY['active','disabled']))
);

-- renewal_keys: Mã gia hạn subscription
CREATE TABLE IF NOT EXISTS platform.renewal_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code      TEXT         NOT NULL UNIQUE,
  business_id     UUID,
  extend_months INTEGER      NOT NULL,
  created_by    UUID,
  used_by       UUID,
  used_at       TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ  NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'active',
  note          TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_renewal_status CHECK (status = ANY(ARRAY['active','used','expired']))
);

-- subscription_plans: Bang gia goi dich vu cho CRM Admin
CREATE TABLE IF NOT EXISTS platform.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(50) NOT NULL UNIQUE,
  plan_name VARCHAR(150) NOT NULL,
  monthly_price_vnd BIGINT NOT NULL DEFAULT 0,
  max_stores INTEGER,
  max_devices INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- business_subscriptions: Trang thai goi hien hanh cua doanh nghiep
CREATE TABLE IF NOT EXISTS platform.business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES platform.businesses(id),
  plan_code VARCHAR(50) NOT NULL REFERENCES platform.subscription_plans(plan_code),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  renewed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_business_subscriptions_status CHECK (
    status = ANY(ARRAY['trial','active','past_due','cancelled','suspended'])
  )
);

-- billing_events: Ledger su kien goi va thanh toan cho CRM Admin
CREATE TABLE IF NOT EXISTS platform.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES platform.businesses(id),
  event_type VARCHAR(50) NOT NULL,
  plan_code VARCHAR(50) NOT NULL,
  amount_vnd BIGINT NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'VND',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  renewal_key TEXT,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(120),
  handled_by VARCHAR(120),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_billing_events_type CHECK (
    event_type = ANY(ARRAY['subscription_created','subscription_renewed','subscription_changed','subscription_cancelled'])
  )
);

-- audit_events: Audit log platform
CREATE TABLE IF NOT EXISTS platform.audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID,
  account_id    UUID,
  event_type    VARCHAR(50)  NOT NULL,
  object_type   VARCHAR(50)  NOT NULL,
  object_id     VARCHAR(100),
  event_payload JSONB        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- FILE: 0100_M1_tenant_lookup.sql
-- =====================================================================
-- ════════════════════════════════════════════════════════════════
-- MODULE 1: TENANT TEMPLATE — Layer 0: Lookup/Reference (no FK)
-- ════════════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS business_template;
SET search_path TO business_template, platform, public;

-- Số thứ tự chứng từ (per store + doc_type)
CREATE TABLE IF NOT EXISTS document_sequences (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID,  -- NULL = toàn business
  doc_type     VARCHAR(50)  NOT NULL,  -- sales_order, purchase_order, product...
  prefix       VARCHAR(20)  NOT NULL DEFAULT '',
  suffix       VARCHAR(20)  NOT NULL DEFAULT '',
  pad_length   INTEGER      NOT NULL DEFAULT 6,
  last_number  BIGINT       NOT NULL DEFAULT 0,
  reset_period VARCHAR(20)  NOT NULL DEFAULT 'never',
  last_reset_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, doc_type),
  CONSTRAINT chk_reset_period CHECK (reset_period = ANY(ARRAY['never','daily','monthly','yearly']))
);

-- Phương thức thanh toán
CREATE TABLE IF NOT EXISTS payment_methods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID,  -- NULL = toàn business
  method_code  VARCHAR(50)  NOT NULL,
  method_name  VARCHAR(255) NOT NULL,
  method_type  VARCHAR(30)  NOT NULL DEFAULT 'cash',
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  display_order INTEGER     NOT NULL DEFAULT 0,
  config       JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payment_method_type CHECK (
    method_type = ANY(ARRAY['cash','card','qr_code','bank_transfer','e_wallet','loyalty_point','credit','voucher','other']))
);

INSERT INTO payment_methods (method_code,method_name,method_type,display_order) VALUES
  ('CASH',  'Tiền mặt',       'cash',          1),
  ('CARD',  'Thẻ (Visa/MC)',  'card',          2),
  ('QR_VCB','QR VietcomBank',  'qr_code',       3),
  ('MOMO',  'Ví MoMo',          'e_wallet',      4),
  ('ZALOPAY','ZaloPay',        'e_wallet',      5),
  ('VNPAY', 'VNPay QR',        'qr_code',       6),
  ('TRANSFER','Chuyển khoản', 'bank_transfer', 7),
  ('POINT', 'Điểm loyalty',    'loyalty_point', 8),
  ('VOUCHER','Voucher',        'voucher',       9)
ON CONFLICT DO NOTHING;

-- Tài khoản kế toán
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      UUID,  -- self FK (khai báo sau trong Block FK)
  account_code   VARCHAR(20)  NOT NULL UNIQUE,
  account_name   VARCHAR(255) NOT NULL,
  account_type   VARCHAR(30)  NOT NULL,
  normal_balance VARCHAR(10)  NOT NULL DEFAULT 'debit',
  is_system      BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  description    TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_account_type    CHECK (account_type    = ANY(ARRAY['asset','liability','equity','revenue','expense','cogs'])),
  CONSTRAINT chk_normal_balance  CHECK (normal_balance  = ANY(ARRAY['debit','credit']))
);

-- Nhóm khách hàng (VIP, wholesale, retail)
CREATE TABLE IF NOT EXISTS customer_groups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code       VARCHAR(50)  NOT NULL UNIQUE,
  group_name       VARCHAR(255) NOT NULL,
  discount_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  point_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1,
  min_spend        NUMERIC(18,2),
  description      TEXT,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO customer_groups (group_code,group_name,discount_rate,point_multiplier) VALUES
  ('RETAIL',    'Khách lẻ',   0,   1.0),
  ('MEMBER',    'Thành viên',  0,   1.5),
  ('SILVER',    'Bạc',         2,   2.0),
  ('GOLD',      'Vàng',         5,   3.0),
  ('VIP',       'VIP',          10,  4.0),
  ('WHOLESALE', 'Sỹ',          15,  1.0)
ON CONFLICT DO NOTHING;

-- Kỳ kinh doanh
CREATE TABLE IF NOT EXISTS business_periods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID,
  period_code VARCHAR(20)  NOT NULL,
  period_name VARCHAR(100) NOT NULL,
  period_type VARCHAR(20)  NOT NULL DEFAULT 'month',
  start_date  DATE         NOT NULL,
  end_date    DATE         NOT NULL,
  is_closed   BOOLEAN      NOT NULL DEFAULT FALSE,
  closed_at   TIMESTAMPTZ,
  closed_by   UUID,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_period_type  CHECK (period_type = ANY(ARRAY['day','week','month','quarter','year'])),
  CONSTRAINT chk_period_dates CHECK (start_date <= end_date)
);

-- =====================================================================
-- FILE: 0101_M2_tenant_core.sql
-- =====================================================================

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

-- Nhân viên
CREATE TABLE IF NOT EXISTS staff_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_code          VARCHAR(30)  NOT NULL,  -- AUTO: NV000001
  username            VARCHAR(80),
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

CREATE UNIQUE INDEX IF NOT EXISTS staff_members_username_unique
  ON staff_members (LOWER(username))
  WHERE username IS NOT NULL;

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
  CONSTRAINT chk_customer_gender CHECK (gender = ANY(ARRAY['male','female','other',NULL])),
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
-- =====================================================================
-- FILE: 0102_M3_tenant_catalog.sql
-- =====================================================================

-- Danh mục sản phẩm (tree)
CREATE TABLE IF NOT EXISTS product_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID,  -- self FK
  category_code   VARCHAR(30),  -- AUTO: DM000001
  category_name   VARCHAR(150) NOT NULL,
  category_type   VARCHAR(50)  NOT NULL DEFAULT 'product',
  track_inventory BOOLEAN      NOT NULL DEFAULT TRUE,
  display_order   INTEGER      NOT NULL DEFAULT 0,
  color_code      VARCHAR(7),
  icon_url        TEXT,
  slug            VARCHAR(255),
  description     TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_category_type CHECK (category_type = ANY(ARRAY['product','service','combo']))
);

-- Thương hiệu
CREATE TABLE IF NOT EXISTS brands (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name VARCHAR(150) NOT NULL,
  logo_url   TEXT,
  description TEXT,
  display_order INTEGER    NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Đơn vị tính
CREATE TABLE IF NOT EXISTS units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_name   VARCHAR(50) NOT NULL,
  unit_symbol VARCHAR(10),
  unit_type   VARCHAR(20) NOT NULL DEFAULT 'piece',
  display_order INTEGER   NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_unit_type CHECK (unit_type = ANY(ARRAY['weight','volume','piece','portion','length','area']))
);

INSERT INTO units (unit_name,unit_symbol,unit_type,display_order) VALUES
  ('Cái','cái','piece',1),('Hộp','hộp','piece',2),('Túi','túi','piece',3),
  ('Gói','gói','piece',4),('Ly','ly','piece',5),('Phần','phần','portion',6),
  ('Suất','suất','portion',7),('Kilogram','kg','weight',8),('Gram','g','weight',9),
  ('Lít','L','volume',10),('Mililit','ml','volume',11),('Chai','chai','piece',12),
  ('Lon','lon','piece',13),('Thùng','thùng','piece',14),('Tá','tá','piece',15),
  ('Bộ','bộ','piece',16),('Đôi','đôi','piece',17)
ON CONFLICT DO NOTHING;

-- Thuế
CREATE TABLE IF NOT EXISTS tax_classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_code    VARCHAR(20)  NOT NULL UNIQUE,
  tax_name    VARCHAR(100) NOT NULL,
  tax_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  display_order INTEGER    NOT NULL DEFAULT 0,
  is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO tax_classes (tax_code,tax_name,tax_rate,is_default,display_order) VALUES
  ('TAX0','Miễn thuế',0.00,FALSE,1),('TAX5','VAT 5%',5.00,FALSE,2),
  ('TAX8','VAT 8%',8.00,FALSE,3),   ('TAX10','VAT 10%',10.00,TRUE,4)
ON CONFLICT DO NOTHING;

-- Nhóm thuộc tính sản phẩm (kích cỡ, độ đường, topping...)
CREATE TABLE IF NOT EXISTS product_attribute_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name    VARCHAR(100) NOT NULL,
  input_type    VARCHAR(20)  NOT NULL DEFAULT 'single',
  is_required   BOOLEAN      NOT NULL DEFAULT FALSE,
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_input_type CHECK (input_type = ANY(ARRAY['single','multiple']))
);

INSERT INTO product_attribute_groups (group_name,input_type,is_required,display_order) VALUES
  ('Kích cỡ','single',TRUE,1),('Độ đường','single',FALSE,2),
  ('Đá','single',FALSE,3),('Topping','multiple',FALSE,4),
  ('Màu sắc','single',FALSE,5),('Suất','single',TRUE,6),
  ('Nhiệt độ','single',FALSE,7),('Ghi chú bếp','multiple',FALSE,8)
ON CONFLICT DO NOTHING;

-- Giá trị thuộc tính
CREATE TABLE IF NOT EXISTS product_attribute_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID         NOT NULL REFERENCES product_attribute_groups(id) ON DELETE CASCADE,
  value_name    VARCHAR(100) NOT NULL,
  extra_price   NUMERIC(15,2) NOT NULL DEFAULT 0,
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Tag sản phẩm
CREATE TABLE IF NOT EXISTS product_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name   VARCHAR(100) NOT NULL,
  tag_color  VARCHAR(7)   NOT NULL DEFAULT '#6366f1',
  slug       VARCHAR(100),
  display_order INTEGER   NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO product_tags (tag_name,tag_color,slug,display_order) VALUES
  ('Bán chạy','#ef4444','ban-chay',1),('Mới','#22c55e','moi',2),
  ('Sale','#f97316','sale',3),('Đặc biệt','#8b5cf6','dac-biet',4),
  ('Theo mùa','#06b6d4','theo-mua',5),('Combo','#ec4899','combo',6),
  ('Giới hạn','#eab308','gioi-han',7),('Hết hàng','#6b7280','het-hang',8)
ON CONFLICT DO NOTHING;

-- Sản phẩm
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code    VARCHAR(50),    -- AUTO: SP000001
  product_name    VARCHAR(255) NOT NULL,
  category_id     UUID         REFERENCES product_categories(id),
  brand_id        UUID         REFERENCES brands(id),
  tax_id          UUID         REFERENCES tax_classes(id),
  unit_id         UUID         REFERENCES units(id),
  sku             VARCHAR(100),
  barcode         VARCHAR(100),
  sell_price      NUMERIC(18,4)  NOT NULL DEFAULT 0,
  cost_price      NUMERIC(18,4)  NOT NULL DEFAULT 0,
  compare_price   NUMERIC(18,4),  -- Giá gạch ngang khi sale
  earn_points     INTEGER        NOT NULL DEFAULT 0,
  weight_gram     INTEGER,
  min_stock_level NUMERIC(12,3),  -- Cảnh báo tồn kho thấp
  slug            VARCHAR(255),
  short_desc      TEXT,
  full_desc       TEXT,
  image_url       VARCHAR(500),
  gallery_images  JSONB          NOT NULL DEFAULT '[]',
  display_order   INTEGER        NOT NULL DEFAULT 0,
  show_on_pos     BOOLEAN        NOT NULL DEFAULT TRUE,
  show_online     BOOLEAN        NOT NULL DEFAULT TRUE,
  allow_backorder BOOLEAN        NOT NULL DEFAULT FALSE,
  track_inventory BOOLEAN        NOT NULL DEFAULT TRUE,
  has_variants    BOOLEAN        NOT NULL DEFAULT FALSE,
  product_type    VARCHAR(30)    NOT NULL DEFAULT 'simple',
  pos_color       VARCHAR(7),
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_product_type CHECK (product_type = ANY(ARRAY['simple','variant','combo','service']))
);

-- Biến thể sản phẩm
CREATE TABLE IF NOT EXISTS product_variants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name VARCHAR(255) NOT NULL,
  sku          VARCHAR(100),
  barcode      VARCHAR(100),
  sell_price   NUMERIC(18,4),
  cost_price   NUMERIC(18,4),
  attributes   JSONB        NOT NULL DEFAULT '{}',  -- {"Kích cỡ":"M","Màu":"Đen"}
  image_url    VARCHAR(500),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Mapping tag - sản phẩm
CREATE TABLE IF NOT EXISTS product_tag_mappings (
  product_id UUID NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- Combo items (thành phần combo)
CREATE TABLE IF NOT EXISTS combo_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_product_id  UUID          NOT NULL REFERENCES products(id),  -- SP loại combo
  item_product_id   UUID          NOT NULL REFERENCES products(id),  -- Thành phần
  item_variant_id   UUID,
  quantity          NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_name         VARCHAR(50),
  is_optional       BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Đơn vị tính sản phẩm (chuyển đổi đơn vị)
CREATE TABLE IF NOT EXISTS product_units (
  product_id        UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_id           UUID          NOT NULL REFERENCES units(id),
  conversion_factor NUMERIC(10,4) NOT NULL DEFAULT 1,
  is_base_unit      BOOLEAN       NOT NULL DEFAULT FALSE,
  PRIMARY KEY (product_id, unit_id)
);

-- Giảm giá / Khuyến mãi đơn giản
CREATE TABLE IF NOT EXISTS discounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID,
  discount_code   VARCHAR(50)  NOT NULL,
  discount_name   VARCHAR(255) NOT NULL,
  discount_type   VARCHAR(30)  NOT NULL DEFAULT 'percentage',
  discount_value  NUMERIC(18,4) NOT NULL,
  min_order_value NUMERIC(18,2),
  max_discount    NUMERIC(18,2),
  apply_scope     VARCHAR(30)  NOT NULL DEFAULT 'order',
  start_date      DATE,
  end_date        DATE,
  usage_limit     INTEGER,
  used_count      INTEGER      NOT NULL DEFAULT 0,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_discount_type  CHECK (discount_type = ANY(ARRAY['percentage','fixed_amount','buy_x_get_y','free_item'])),
  CONSTRAINT chk_apply_scope    CHECK (apply_scope   = ANY(ARRAY['order','product','category','customer_group']))
);
-- =====================================================================
-- FILE: 0103_M4_tenant_inventory.sql
-- =====================================================================

-- Tồn kho (aggregated balance per product/location/variant/unit)
CREATE TABLE IF NOT EXISTS stock_balances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID          NOT NULL REFERENCES stock_locations(id),
  product_id  UUID          NOT NULL REFERENCES products(id),
  variant_id  UUID,
  unit_name   VARCHAR(50)   NOT NULL DEFAULT 'piece',
  quantity    NUMERIC(18,4) NOT NULL DEFAULT 0,
  reserved_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  avg_cost    NUMERIC(18,4) NOT NULL DEFAULT 0,
  last_cost   NUMERIC(18,4) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (location_id, product_id, variant_id, unit_name)
);

-- Giao dịch kho (tất cả chuyển động kho)
CREATE TABLE IF NOT EXISTS stock_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID          NOT NULL REFERENCES stores(id),
  location_id  UUID          NOT NULL REFERENCES stock_locations(id),
  product_id   UUID          NOT NULL REFERENCES products(id),
  variant_id   UUID,
  unit_name    VARCHAR(50)   NOT NULL DEFAULT 'piece',
  txn_type     VARCHAR(30)   NOT NULL,
  ref_type     VARCHAR(50),  -- sales_order, purchase_order, stocktake...
  ref_id       UUID,
  ref_code     VARCHAR(50),
  quantity     NUMERIC(18,4) NOT NULL,
  unit_cost    NUMERIC(18,4),
  total_cost   NUMERIC(18,4),
  balance_after NUMERIC(18,4),  -- Tự động cập nhật bởi trigger
  note         TEXT,
  created_by   UUID,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_stock_txn_type CHECK (txn_type = ANY(ARRAY[
    'purchase_in','return_in','transfer_in','adjustment_in','production_in','opening_balance',
    'sale_out','return_out','transfer_out','adjustment_out','production_out'
  ]))
);

-- Bảng giá (giá chuẩn, giá VIP, Happy Hour, giá sỹ)
CREATE TABLE IF NOT EXISTS price_books (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID,
  book_code    VARCHAR(50),
  book_name    VARCHAR(150) NOT NULL,
  book_type    VARCHAR(30)  NOT NULL DEFAULT 'standard',
  priority     INTEGER      NOT NULL DEFAULT 0,
  valid_from   DATE,
  valid_to     DATE,
  time_start   TIME,
  time_end     TIME,
  days_of_week JSONB        NOT NULL DEFAULT '[1,2,3,4,5,6,7]',
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_book_type CHECK (book_type = ANY(ARRAY['standard','tiered','time_based','customer_group']))
);

INSERT INTO price_books (book_name,book_type,priority) VALUES
  ('Giá chuẩn','standard',0),('Happy Hour','time_based',1),
  ('Khách VIP','customer_group',2),('Giá sỹ','tiered',3),('Giá nhân viên','customer_group',4)
ON CONFLICT DO NOTHING;

-- Item trong bảng giá
CREATE TABLE IF NOT EXISTS price_book_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_book_id UUID          NOT NULL,
  product_id    UUID          NOT NULL,
  variant_id    UUID,
  unit_name     VARCHAR(50),
  sale_price    NUMERIC(18,4) NOT NULL,
  min_qty       INTEGER       NOT NULL DEFAULT 1,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  UNIQUE (price_book_id, product_id, variant_id, min_qty)
);

-- Đơn nhập hàng
CREATE TABLE IF NOT EXISTS purchase_orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID         NOT NULL REFERENCES stores(id),
  supplier_id    UUID         NOT NULL REFERENCES suppliers(id),
  po_code        VARCHAR(50)  NOT NULL,  -- AUTO: PO000001
  status         VARCHAR(20)  NOT NULL DEFAULT 'draft',
  sub_total      NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
  grand_total    NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_amount    NUMERIC(18,2) NOT NULL DEFAULT 0,
  order_date     DATE         NOT NULL DEFAULT CURRENT_DATE,
  expected_date  DATE,
  received_date  DATE,
  note           TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_po_status CHECK (status = ANY(ARRAY['draft','confirmed','partial_received','received','cancelled','closed']))
);

-- Dòng đơn nhập hàng
CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id        UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id   UUID          NOT NULL REFERENCES products(id),
  variant_id   UUID,
  unit_name    VARCHAR(50)   NOT NULL,
  ordered_qty  NUMERIC(12,3) NOT NULL DEFAULT 0,
  received_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit_cost    NUMERIC(18,4) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount   NUMERIC(18,2) NOT NULL DEFAULT 0,
  line_total   NUMERIC(18,2) NOT NULL DEFAULT 0,
  note         TEXT
);

-- Kiểm kê
CREATE TABLE IF NOT EXISTS stocktakes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID         NOT NULL REFERENCES stores(id),
  location_id    UUID         NOT NULL REFERENCES stock_locations(id),
  stocktake_code VARCHAR(50),
  status         VARCHAR(20)  NOT NULL DEFAULT 'draft',
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_by     UUID,
  note           TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_stocktake_status CHECK (status = ANY(ARRAY['draft','in_progress','completed','cancelled']))
);

-- Dòng kiểm kê
CREATE TABLE IF NOT EXISTS stocktake_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_id UUID          NOT NULL REFERENCES stocktakes(id) ON DELETE CASCADE,
  product_id   UUID          NOT NULL REFERENCES products(id),
  variant_id   UUID,
  unit_name    VARCHAR(50)   NOT NULL,
  system_qty   NUMERIC(12,3) NOT NULL DEFAULT 0,
  actual_qty   NUMERIC(12,3) NOT NULL DEFAULT 0,
  variance_qty NUMERIC(12,3) GENERATED ALWAYS AS (actual_qty - system_qty) STORED,
  unit_cost    NUMERIC(18,4) NOT NULL DEFAULT 0,
  note         TEXT
);

-- Yêu cầu chuyển kho
CREATE TABLE IF NOT EXISTS stock_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID         NOT NULL REFERENCES stores(id),
  transfer_code    VARCHAR(50)  NOT NULL,
  from_location_id UUID         NOT NULL REFERENCES stock_locations(id),
  to_location_id   UUID         NOT NULL REFERENCES stock_locations(id),
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending',
  requested_by     UUID,
  approved_by      UUID,
  requested_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  approved_at      TIMESTAMPTZ,
  shipped_at       TIMESTAMPTZ,
  received_at      TIMESTAMPTZ,
  note             TEXT,
  CONSTRAINT chk_transfer_status CHECK (status = ANY(ARRAY['pending','approved','shipped','received','cancelled']))
);

-- Dòng chuyển kho
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id   UUID          NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id    UUID          NOT NULL REFERENCES products(id),
  variant_id    UUID,
  unit_name     VARCHAR(50)   NOT NULL,
  requested_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  shipped_qty   NUMERIC(12,3) NOT NULL DEFAULT 0,
  received_qty  NUMERIC(12,3) NOT NULL DEFAULT 0,
  note          TEXT
);

-- Quy tắc tồn kho (cảnh báo tự động)
CREATE TABLE IF NOT EXISTS stock_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID          NOT NULL,
  location_id   UUID,
  min_stock     NUMERIC(12,3) NOT NULL DEFAULT 0,
  max_stock     NUMERIC(12,3),
  reorder_point NUMERIC(12,3) NOT NULL DEFAULT 0,
  reorder_qty   NUMERIC(12,3) NOT NULL DEFAULT 0,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE
);
-- =====================================================================
-- FILE: 0104_M5_tenant_sales.sql
-- =====================================================================

-- Ca làm việc
CREATE TABLE IF NOT EXISTS work_shifts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID         NOT NULL REFERENCES stores(id),
  register_id   UUID         REFERENCES registers(id),
  staff_id      UUID         NOT NULL REFERENCES staff_members(id),
  shift_code    VARCHAR(30)  NOT NULL,  -- AUTO: CA000001
  shift_date    DATE         NOT NULL,
  planned_start TIMESTAMPTZ,
  planned_end   TIMESTAMPTZ,
  actual_start  TIMESTAMPTZ,
  actual_end    TIMESTAMPTZ,
  opening_cash  NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_cash  NUMERIC(18,2),
  expected_cash NUMERIC(18,2),
  cash_variance NUMERIC(18,2),
  status        VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
  note          TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_shift_status CHECK (status = ANY(ARRAY['scheduled','open','closed','cancelled']))
);

-- Đơn hàng (header)
CREATE TABLE IF NOT EXISTS sales_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID         NOT NULL REFERENCES stores(id),
  register_id     UUID         REFERENCES registers(id),
  shift_id        UUID         REFERENCES work_shifts(id),
  order_code      VARCHAR(50)  NOT NULL,  -- AUTO: SO260420000001
  order_type      VARCHAR(20)  NOT NULL DEFAULT 'pos',
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
  cashier_id      UUID         REFERENCES staff_members(id),
  customer_id     UUID         REFERENCES customers(id),
  customer_name   VARCHAR(255),  -- Snapshot khi đặt hàng
  table_id        VARCHAR(50),   -- UUID gửi dạng string tương thích dining_tables
  table_name      VARCHAR(100),
  party_size      INTEGER       NOT NULL DEFAULT 1,
  sub_total       NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  delivery_fee    NUMERIC(18,2) NOT NULL DEFAULT 0,
  grand_total     NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
  change_amount   NUMERIC(18,2) NOT NULL DEFAULT 0,
  loyalty_points_used INTEGER   NOT NULL DEFAULT 0,
  loyalty_points_earned INTEGER NOT NULL DEFAULT 0,
  voucher_code    VARCHAR(50),
  note            TEXT,
  kitchen_note    TEXT,
  delivery_address TEXT,
  delivery_eta    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_order_type   CHECK (order_type = ANY(ARRAY['pos','table','takeaway','delivery','online'])),
  CONSTRAINT chk_order_status CHECK (status = ANY(ARRAY['pending','confirmed','processing','ready',
    'partial_paid','completed','cancelled','refunded','partial_refund']))
);

-- Dòng đơn hàng
CREATE TABLE IF NOT EXISTS sales_order_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID          NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id      UUID          NOT NULL REFERENCES products(id),
  variant_id      UUID          REFERENCES product_variants(id),
  product_name    VARCHAR(255),  -- Snapshot tại thời điểm bán
  quantity        NUMERIC(18,4)  NOT NULL DEFAULT 1,
  unit_name       VARCHAR(50)    NOT NULL DEFAULT 'piece',
  unit_price      NUMERIC(18,4)  NOT NULL DEFAULT 0,
  cost_price      NUMERIC(18,4)  NOT NULL DEFAULT 0,  -- Snapshot giá vốn
  discount_amount NUMERIC(18,2)  NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(18,2)  NOT NULL DEFAULT 0,
  line_total      NUMERIC(18,2)  NOT NULL DEFAULT 0,
  modifiers       JSONB          NOT NULL DEFAULT '[]',  -- Tùy chọn thêm (topping...)
  note            TEXT,
  kitchen_status  VARCHAR(20)    NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_kitchen_status CHECK (kitchen_status = ANY(ARRAY['pending','sent','cooking','ready','served','cancelled']))
);

-- Thanh toán đơn
CREATE TABLE IF NOT EXISTS order_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID          NOT NULL REFERENCES sales_orders(id),
  payment_method_id UUID          REFERENCES payment_methods(id),
  method_code       VARCHAR(50)   NOT NULL,
  method_name       VARCHAR(255)  NOT NULL,
  amount            NUMERIC(18,2) NOT NULL,
  tender_amount     NUMERIC(18,2),  -- Tiền khách đưa
  change_amount     NUMERIC(18,2)  NOT NULL DEFAULT 0,
  transaction_ref   VARCHAR(255),   -- Mã GD ngân hàng/ví
  status            VARCHAR(20)    NOT NULL DEFAULT 'completed',
  paid_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payment_status CHECK (status = ANY(ARRAY['pending','completed','failed','refunded']))
);

-- Hoàn trả đơn
CREATE TABLE IF NOT EXISTS order_returns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID         NOT NULL REFERENCES stores(id),
  original_order_id UUID         NOT NULL REFERENCES sales_orders(id),
  return_code       VARCHAR(50)  NOT NULL,
  return_reason     TEXT,
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending',
  refund_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
  refund_method     VARCHAR(50),
  processed_by      UUID,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_return_status CHECK (status = ANY(ARRAY['pending','approved','completed','rejected']))
);

-- Dòng hoàn trả
CREATE TABLE IF NOT EXISTS order_return_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id       UUID          NOT NULL REFERENCES order_returns(id) ON DELETE CASCADE,
  order_line_id   UUID          NOT NULL REFERENCES sales_order_lines(id),
  product_id      UUID          NOT NULL REFERENCES products(id),
  variant_id      UUID,
  quantity        NUMERIC(18,4) NOT NULL,
  unit_price      NUMERIC(18,4) NOT NULL,
  return_to_stock BOOLEAN       NOT NULL DEFAULT TRUE,
  note            TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Phiên bàn (F&B)
CREATE TABLE IF NOT EXISTS table_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id    UUID         NOT NULL REFERENCES dining_tables(id),
  store_id    UUID         NOT NULL REFERENCES stores(id),
  session_code VARCHAR(50) NOT NULL,
  order_id    UUID         REFERENCES sales_orders(id),
  party_size  INTEGER      NOT NULL DEFAULT 1,
  status      VARCHAR(20)  NOT NULL DEFAULT 'open',
  opened_by   UUID,
  opened_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ,
  note        TEXT,
  CONSTRAINT chk_session_status CHECK (status = ANY(ARRAY['open','closed','cancelled']))
);

-- Phiếu bếp
CREATE TABLE IF NOT EXISTS kitchen_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID         NOT NULL REFERENCES stores(id),
  order_id      UUID         NOT NULL REFERENCES sales_orders(id),
  ticket_code   VARCHAR(50)  NOT NULL,
  ticket_type   VARCHAR(20)  NOT NULL DEFAULT 'new',
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
  printed_at    TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_by    UUID,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ticket_type   CHECK (ticket_type = ANY(ARRAY['new','modification','cancellation','void'])),
  CONSTRAINT chk_ticket_status CHECK (status = ANY(ARRAY['pending','in_progress','completed','cancelled']))
);

-- Dòng phiếu bếp
CREATE TABLE IF NOT EXISTS kitchen_ticket_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID          NOT NULL REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
  order_line_id UUID          NOT NULL REFERENCES sales_order_lines(id),
  product_name  VARCHAR(255)  NOT NULL,
  quantity      NUMERIC(18,4) NOT NULL,
  modifiers     JSONB         NOT NULL DEFAULT '[]',
  note          TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- =====================================================================
-- FILE: 0105_M6_tenant_crm.sql
-- =====================================================================

-- Sổ giao dịch khách hàng (chi tiêu + điểm)
CREATE TABLE IF NOT EXISTS customer_ledgers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID          NOT NULL REFERENCES customers(id),
  store_id     UUID,
  txn_type     VARCHAR(30)   NOT NULL,
  amount       NUMERIC(18,2) NOT NULL,
  balance_after NUMERIC(18,2) NOT NULL,
  ref_type     VARCHAR(50),  -- sales_order, manual, gift...
  ref_id       UUID,
  note         TEXT,
  created_by   UUID,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ledger_txn_type CHECK (txn_type = ANY(ARRAY[
    'purchase','return','point_earn','point_redeem','point_expire','adjustment','deposit','withdrawal'
  ]))
);

-- Lịch hẹn (Spa, salon, dịch vụ)
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID         NOT NULL REFERENCES stores(id),
  customer_id     UUID         REFERENCES customers(id),
  customer_name   VARCHAR(255),
  customer_phone  VARCHAR(30),
  order_id        UUID,  -- Liên kết đơn hàng khi thanh toán
  appt_code       VARCHAR(50)  NOT NULL,
  appt_date       DATE         NOT NULL,
  start_time      TIMESTAMPTZ  NOT NULL,
  end_time        TIMESTAMPTZ  NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
  staff_id        UUID,
  total_amount    NUMERIC(18,2) NOT NULL DEFAULT 0,
  deposit_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
  note            TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_appt_status CHECK (status = ANY(ARRAY['scheduled','confirmed','in_service','completed','cancelled','no_show']))
);

-- Dòng lịch hẹn
CREATE TABLE IF NOT EXISTS appointment_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id    UUID          NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_product_id UUID         NOT NULL REFERENCES products(id),
  variant_id        UUID,
  staff_id          UUID,
  quantity          NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price        NUMERIC(18,4) NOT NULL,
  duration_mins     INTEGER,
  note              TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- =====================================================================
-- FILE: 0106_M7_tenant_hr_finance.sql
-- =====================================================================

-- Chấm công
CREATE TABLE IF NOT EXISTS timekeeping_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID        NOT NULL REFERENCES staff_members(id),
  store_id    UUID        NOT NULL REFERENCES stores(id),
  shift_id    UUID        REFERENCES work_shifts(id),
  event_type  VARCHAR(20) NOT NULL,
  event_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method      VARCHAR(20) NOT NULL DEFAULT 'manual',
  latitude    NUMERIC(10,7),
  longitude   NUMERIC(10,7),
  photo_url   TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_timekeep_event  CHECK (event_type = ANY(ARRAY['check_in','check_out','break_start','break_end'])),
  CONSTRAINT chk_timekeep_method CHECK (method = ANY(ARRAY['manual','qr','face','pin','gps']))
);

-- Kỳ lương
CREATE TABLE IF NOT EXISTS payroll_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID,
  period_code   VARCHAR(30)  NOT NULL,
  period_name   VARCHAR(100) NOT NULL,
  start_date    DATE         NOT NULL,
  end_date      DATE         NOT NULL,
  payment_date  DATE,
  status        VARCHAR(20)  NOT NULL DEFAULT 'open',
  note          TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payroll_status  CHECK (status = ANY(ARRAY['open','processing','paid','cancelled']))
);

-- Bảng lương nhân viên
CREATE TABLE IF NOT EXISTS payroll_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id     UUID          NOT NULL REFERENCES payroll_periods(id),
  staff_id      UUID          NOT NULL REFERENCES staff_members(id),
  worked_hours  NUMERIC(8,2)  NOT NULL DEFAULT 0,
  worked_days   NUMERIC(5,1)  NOT NULL DEFAULT 0,
  base_pay      NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances    NUMERIC(15,2) NOT NULL DEFAULT 0,
  bonuses       NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions    NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_pay       NUMERIC(15,2) GENERATED ALWAYS AS (base_pay + allowances + bonuses - deductions) STORED,
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending',
  note          TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (period_id, staff_id),
  CONSTRAINT chk_payroll_item_status CHECK (status = ANY(ARRAY['pending','approved','paid','rejected']))
);

-- Tài khoản quỹ / ngân hàng
CREATE TABLE IF NOT EXISTS cash_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID,
  bank_master_id  UUID,
  account_code    VARCHAR(50)  NOT NULL,
  account_name    VARCHAR(255) NOT NULL,
  account_type    VARCHAR(30)  NOT NULL DEFAULT 'cash',
  account_number  VARCHAR(100),
  current_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cash_account_type CHECK (account_type = ANY(ARRAY['cash','bank','e_wallet','credit_line']))
);

-- Giao dịch quỹ
CREATE TABLE IF NOT EXISTS cash_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID          NOT NULL REFERENCES stores(id),
  cash_account_id UUID          NOT NULL REFERENCES cash_accounts(id),
  txn_code        VARCHAR(50)   NOT NULL,
  txn_type        VARCHAR(30)   NOT NULL,
  amount          NUMERIC(18,2) NOT NULL,
  balance_after   NUMERIC(18,2) NOT NULL,
  ref_type        VARCHAR(50),
  ref_id          UUID,
  description     TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cash_txn_type CHECK (txn_type = ANY(ARRAY[
    'sale_in','purchase_out','return_in','return_out',
    'deposit','withdrawal','transfer_in','transfer_out','expense','adjustment'
  ]))
);

-- Bút toán kế toán
CREATE TABLE IF NOT EXISTS journal_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID         NOT NULL REFERENCES stores(id),
  entry_code   VARCHAR(50)  NOT NULL,
  entry_date   DATE         NOT NULL,
  entry_type   VARCHAR(50)  NOT NULL DEFAULT 'manual',
  ref_type     VARCHAR(50),
  ref_id       UUID,
  description  TEXT,
  total_debit  NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  status       VARCHAR(20)  NOT NULL DEFAULT 'draft',
  created_by   UUID,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_journal_balanced CHECK (total_debit = total_credit),
  CONSTRAINT chk_journal_status   CHECK (status = ANY(ARRAY['draft','posted','reversed']))
);

-- Dòng bút toán
CREATE TABLE IF NOT EXISTS journal_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID          NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id    UUID          NOT NULL REFERENCES chart_of_accounts(id),
  debit_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  description   TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_journal_line_sign CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE OR REPLACE FUNCTION fn_sync_journal_entry_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID := COALESCE(NEW.entry_id, OLD.entry_id);
  v_total_debit NUMERIC(18,2);
  v_total_credit NUMERIC(18,2);
BEGIN
  SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_lines
  WHERE entry_id = v_entry_id;

  UPDATE journal_entries
  SET total_debit = v_total_debit,
      total_credit = v_total_credit,
      updated_at = NOW()
  WHERE id = v_entry_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validate_posted_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_line_count INTEGER;
  v_total_debit NUMERIC(18,2);
  v_total_credit NUMERIC(18,2);
BEGIN
  IF NEW.status = 'posted' THEN
    SELECT COUNT(*), COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
    INTO v_line_count, v_total_debit, v_total_credit
    FROM journal_lines
    WHERE entry_id = NEW.id;

    IF v_line_count = 0 THEN
      RAISE EXCEPTION 'Journal entry % cannot be posted without lines', NEW.id;
    END IF;

    IF NEW.total_debit <> v_total_debit OR NEW.total_credit <> v_total_credit OR v_total_debit <> v_total_credit THEN
      RAISE EXCEPTION 'Journal entry % totals mismatch: entry=(%, %) lines=(%, %)',
        NEW.id, NEW.total_debit, NEW.total_credit, v_total_debit, v_total_credit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_journal_entry_totals ON journal_lines;
CREATE TRIGGER trg_sync_journal_entry_totals
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION fn_sync_journal_entry_totals();

DROP TRIGGER IF EXISTS trg_validate_posted_journal_entry ON journal_entries;
CREATE TRIGGER trg_validate_posted_journal_entry
BEFORE INSERT OR UPDATE OF total_debit, total_credit, status ON journal_entries
FOR EACH ROW EXECUTE FUNCTION fn_validate_posted_journal_entry();
-- =====================================================================
-- FILE: 0107_M8_tenant_system.sql
-- =====================================================================

-- RBAC cấp business
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key    VARCHAR(100) NOT NULL UNIQUE,
  role_name   VARCHAR(150) NOT NULL,
  description TEXT,
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key  VARCHAR(150) NOT NULL UNIQUE,
  permission_name VARCHAR(150) NOT NULL,
  module_key      VARCHAR(80)  NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID        NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID        NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id, permission_id)
);

-- Seed RBAC business (gọi từ fn_seed_business_rbac)
-- TENANT_OWNER, TENANT_ADMIN, CASHIER, INVENTORY, STORE_STAFF, KITCHEN_STAFF, DELIVERY_STAFF
-- + 50 permissions phân theo module: order, payment, product, inventory, staff, shift, customer, table, store_report, setting

-- Gắn thiết bị POS vào quầy
CREATE TABLE IF NOT EXISTS device_bindings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID         NOT NULL REFERENCES stores(id),
  register_id       UUID         REFERENCES registers(id),
  device_identity_id UUID        NOT NULL,  -- NOTE: cross-schema ref → platform.device_identities (khai báo sau ở M10-B)
  binding_type      VARCHAR(30)  NOT NULL DEFAULT 'pos',
  status            VARCHAR(20)  NOT NULL DEFAULT 'active',
  bound_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  unbound_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_binding_status CHECK (status = ANY(ARRAY['active','unbound']))
);

-- Máy in
CREATE TABLE IF NOT EXISTS printer_devices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID         NOT NULL REFERENCES stores(id),
  device_identity_id UUID,
  printer_code      VARCHAR(50)  NOT NULL,
  printer_name      VARCHAR(255) NOT NULL,
  printer_type      VARCHAR(30)  NOT NULL DEFAULT 'receipt',
  connection_type   VARCHAR(30)  NOT NULL DEFAULT 'network',
  ip_address        VARCHAR(45),
  port              INTEGER,
  paper_width       INTEGER      NOT NULL DEFAULT 80,  -- mm
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_printer_type       CHECK (printer_type      = ANY(ARRAY['receipt','kitchen','label'])),
  CONSTRAINT chk_printer_connection CHECK (connection_type   = ANY(ARRAY['network','usb','bluetooth','wifi']))
);

-- Media assets (hình ảnh, video)
CREATE TABLE IF NOT EXISTS media_assets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              UUID,
  created_by_account_id UUID,
  asset_type            VARCHAR(30)  NOT NULL DEFAULT 'image',
  file_name             VARCHAR(255) NOT NULL,
  file_size             BIGINT,
  mime_type             VARCHAR(100),
  storage_url           VARCHAR(1000) NOT NULL,
  thumbnail_url         VARCHAR(1000),
  ref_type              VARCHAR(50),
  ref_id                UUID,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_asset_type CHECK (asset_type = ANY(ARRAY['image','video','document','audio']))
);

-- Thông báo đẩy
CREATE TABLE IF NOT EXISTS app_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID,
  account_id UUID,
  notif_type VARCHAR(50)  NOT NULL,
  title      VARCHAR(255) NOT NULL,
  body       TEXT,
  ref_type   VARCHAR(50),
  ref_id     UUID,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Sự kiện real-time (MQTT/WebSocket)
CREATE TABLE IF NOT EXISTS realtime_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID,
  event_type   VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    UUID,
  topic        VARCHAR(255),
  payload      JSONB        NOT NULL DEFAULT '{}',
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  retry_count  INTEGER      NOT NULL DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_rt_status CHECK (status = ANY(ARRAY['pending','delivered','failed']))
);

-- Push token (FCM/APNs)
CREATE TABLE IF NOT EXISTS push_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID,
  store_id     UUID,
  register_id  UUID,
  device_type  VARCHAR(20)   NOT NULL,
  device_token TEXT          NOT NULL UNIQUE,
  environment  VARCHAR(20)   NOT NULL DEFAULT 'production',
  status       VARCHAR(20)   NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_push_device  CHECK (device_type  = ANY(ARRAY['ios','android','web'])),
  CONSTRAINT chk_push_env     CHECK (environment  = ANY(ARRAY['production','sandbox'])),
  CONSTRAINT chk_push_status  CHECK (status       = ANY(ARRAY['active','revoked','expired']))
);

-- Audit log hoạt động trong business
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID,
  staff_id    UUID,
  account_id  UUID,
  action      VARCHAR(50)  NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Cài đặt cửa hàng
CREATE TABLE IF NOT EXISTS store_configs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID         NOT NULL,
  config_key   VARCHAR(100) NOT NULL,
  config_value TEXT,
  value_type   VARCHAR(20)  NOT NULL DEFAULT 'string',
  description  TEXT,
  is_system    BOOLEAN      NOT NULL DEFAULT FALSE,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, config_key),
  CONSTRAINT chk_config_type CHECK (value_type = ANY(ARRAY['string','number','boolean','json']))
);
-- =====================================================================
-- FILE: 0190_M9_indexes.sql
-- =====================================================================

-- ════════════════════════════════════════════════════════════════
-- MODULE 9: INDEXES — CHẠY SAU KHI TẤT CẢ BẢNG ĐÃ TẠO
-- Bỏ CONCURRENTLY — pgAdmin chạy trong transaction
-- ════════════════════════════════════════════════════════════════
SET search_path TO business_template, platform, public;

-- Products
CREATE INDEX IF NOT EXISTS idx_products_category_id  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_category_display_order ON products(category_id, display_order);
CREATE INDEX IF NOT EXISTS idx_products_barcode       ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_active     ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm     ON products USING gin(product_name gin_trgm_ops);

-- Lookup/orderable catalogs
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_display_order ON product_categories(parent_id, display_order);
CREATE INDEX IF NOT EXISTS idx_brands_display_order                     ON brands(display_order);
CREATE INDEX IF NOT EXISTS idx_units_display_order                      ON units(display_order);
CREATE INDEX IF NOT EXISTS idx_tax_classes_display_order                ON tax_classes(display_order);
CREATE INDEX IF NOT EXISTS idx_product_attribute_groups_display_order   ON product_attribute_groups(display_order);
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_group_display_order ON product_attribute_values(group_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_tags_display_order               ON product_tags(display_order);

-- Tenant lookup
CREATE INDEX IF NOT EXISTS idx_payment_methods_store_display_order      ON payment_methods(store_id, display_order);

-- Sales orders
CREATE INDEX IF NOT EXISTS idx_so_store_status  ON sales_orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_so_created       ON sales_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_so_customer      ON sales_orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_so_store_date    ON sales_orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_so_code          ON sales_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_so_shift         ON sales_orders(shift_id) WHERE shift_id IS NOT NULL;

-- Sales order lines
CREATE INDEX IF NOT EXISTS idx_sol_order_id    ON sales_order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_sol_product_id  ON sales_order_lines(product_id);

-- Stock
CREATE INDEX IF NOT EXISTS idx_stock_bal_location ON stock_balances(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_bal_product  ON stock_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_txn_product  ON stock_transactions(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_txn_ref      ON stock_transactions(ref_type, ref_id);

-- Purchase orders
CREATE INDEX IF NOT EXISTS idx_po_store_status   ON purchase_orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_po_supplier       ON purchase_orders(supplier_id);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_phone   ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_group   ON customers(group_id);

-- Order payments
CREATE INDEX IF NOT EXISTS idx_order_payments_order ON order_payments(order_id);

-- Kitchen
CREATE INDEX IF NOT EXISTS idx_kitchen_order    ON kitchen_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_status   ON kitchen_tickets(status, created_at DESC);

-- Dining tables
CREATE INDEX IF NOT EXISTS idx_tables_store_status ON dining_tables(store_id, status);

-- Realtime events (chưa xử lý)
CREATE INDEX IF NOT EXISTS idx_realtime_pending ON realtime_events(status, created_at) WHERE status = 'pending';

-- Activity logs
CREATE INDEX IF NOT EXISTS idx_activity_entity  ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_store   ON activity_logs(store_id, created_at DESC);

-- Auth sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_account ON platform.auth_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active  ON platform.auth_sessions(account_id, session_status) WHERE session_status = 'active';

-- Platform audit
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant ON platform.audit_events(business_id, created_at DESC);
-- =====================================================================
-- FILE: 0200_M10_functions.sql
-- =====================================================================
-- ════════════════════════════════════════════════════════════════
-- MODULE 10-A: CHỈ còn 2 loại FK bắt buộc dùng ALTER TABLE:
--   1) SELF-FK: parent_id → cùng bảng (table chưa tồn tại khi chạy CREATE TABLE)
--   2) CROSS-SCHEMA FK: business_template → platform (khác schema)
-- TẤT CẢ FK cùng schema khác đã được khai báo INLINE trong REFERENCES từng bảng.
-- ════════════════════════════════════════════════════════════════

-- ── 1) Self-FK: cây phân cấp (self-referencing) ───────────────────
ALTER TABLE product_categories
  ADD CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES product_categories(id);

ALTER TABLE departments
  ADD CONSTRAINT fk_dept_parent FOREIGN KEY (parent_id) REFERENCES departments(id);

ALTER TABLE chart_of_accounts
  ADD CONSTRAINT fk_coa_parent FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id);

ALTER TABLE stores
  ADD CONSTRAINT fk_store_parent FOREIGN KEY (parent_id) REFERENCES stores(id);

-- ── 2) Cross-schema FK: platform tables ──────────────────────────
ALTER TABLE platform.account_businesses
  ADD CONSTRAINT fk_at_account FOREIGN KEY (account_id) REFERENCES platform.accounts(id),
  ADD CONSTRAINT fk_at_tenant  FOREIGN KEY (business_id)  REFERENCES platform.businesses(id);

ALTER TABLE platform.account_role_bindings
  ADD CONSTRAINT fk_arb_account FOREIGN KEY (account_id) REFERENCES platform.accounts(id),
  ADD CONSTRAINT fk_arb_role    FOREIGN KEY (role_id)    REFERENCES platform.roles(id);

ALTER TABLE platform.role_permissions
  ADD CONSTRAINT fk_rp_role       FOREIGN KEY (role_id)       REFERENCES platform.roles(id),
  ADD CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES platform.permissions(id);

ALTER TABLE platform.auth_sessions
  ADD CONSTRAINT fk_as_account FOREIGN KEY (account_id)         REFERENCES platform.accounts(id),
  ADD CONSTRAINT fk_as_device  FOREIGN KEY (device_identity_id) REFERENCES platform.device_identities(id);

ALTER TABLE platform.business_branches
  ADD CONSTRAINT fk_tb_tenant FOREIGN KEY (business_id) REFERENCES platform.businesses(id);

ALTER TABLE platform.account_branch_access
  ADD CONSTRAINT fk_aba_at     FOREIGN KEY (account_business_id) REFERENCES platform.account_businesses(id),
  ADD CONSTRAINT fk_aba_branch FOREIGN KEY (tenant_branch_id)  REFERENCES platform.business_branches(id);

-- device_bindings.device_identity_id → platform schema
ALTER TABLE business_template.device_bindings
  ADD CONSTRAINT fk_db_device_identity
  FOREIGN KEY (device_identity_id) REFERENCES platform.device_identities(id);


-- ════════════════════════════════════════════════════════════════
-- fn_provision_business: Clone business_template → tenant_{code}
-- An toàn: rollback schema nếu lỗi
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION platform.fn_provision_business(
  p_business_code  VARCHAR,
  p_legal_name   VARCHAR,
  p_brand_name   VARCHAR DEFAULT NULL,
  p_email        VARCHAR DEFAULT NULL,
  p_phone        VARCHAR DEFAULT NULL,
  p_plan         VARCHAR DEFAULT 'standard',
  p_timezone     VARCHAR DEFAULT 'Asia/Ho_Chi_Minh'
) RETURNS TABLE(new_business_id UUID, new_schema_name VARCHAR, result_status VARCHAR)
  LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_business_id      UUID;
  v_schema         VARCHAR := 'tenant_' || p_business_code;
  v_schema_created BOOLEAN := FALSE;
  v_table          RECORD;
  v_idx            RECORD;
BEGIN
  IF p_business_code !~ '^[a-z0-9_]{3,50}$' THEN
    RAISE EXCEPTION 'business_code không hợp lệ: %', p_business_code;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.schemata s WHERE s.schema_name = v_schema) THEN
    RAISE EXCEPTION 'Schema "%" đã tồn tại.', v_schema;
  END IF;
  IF EXISTS (SELECT 1 FROM platform.businesses t WHERE t.business_code = p_business_code) THEN
    RAISE EXCEPTION 'business_code "%" đã được đăng ký.', p_business_code;
  END IF;

  EXECUTE format('CREATE SCHEMA %I', v_schema);
EXECUTE format('ALTER SCHEMA %I OWNER TO %I', v_schema, current_user);
  v_schema_created := TRUE;

  -- Clone tất cả bảng từ business_template (bao gồm ALL columns, constraints, indexes)
  FOR v_table IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'business_template' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    EXECUTE format('CREATE TABLE %I.%I (LIKE business_template.%I INCLUDING ALL)',
      v_schema, v_table.table_name, v_table.table_name);
          EXECUTE format('ALTER TABLE %I.%I OWNER TO %I', v_schema, v_table.table_name, current_user);
  END LOOP;

  -- Đăng ký business
  INSERT INTO platform.businesses (
    business_code, schema_name, legal_name, brand_name,
    email, phone, subscription_plan, timezone_name, status
  ) VALUES (
    p_business_code, v_schema, p_legal_name, p_brand_name,
    p_email, p_phone, p_plan, p_timezone, 'trial'
  ) RETURNING id INTO v_business_id;

  -- Áp dụng business logic (triggers + views)
  PERFORM platform.fn_apply_business_logic(v_schema);
  -- Áp dụng auto-codes
  PERFORM platform.fn_apply_auto_codes(v_schema);
  -- Seed RBAC
  PERFORM platform.fn_seed_business_rbac(v_schema);

  RAISE NOTICE '✅ Tenant "%" tạo xong! Schema: % | ID: %', p_business_code, v_schema, v_business_id;
  RETURN QUERY SELECT v_business_id, v_schema::VARCHAR, 'created'::VARCHAR;

EXCEPTION WHEN OTHERS THEN
  IF v_schema_created THEN
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', v_schema);
    RAISE NOTICE '⚠️ Đã rollback schema "%"', v_schema;
  END IF;
  RAISE;
END;
$$;

-- Gọi example:
-- SELECT * FROM platform.fn_provision_business('myshop','My Shop Co.','My Shop Brand','admin@myshop.vn');

-- fn_upgrade_all_businesses: Áp dụng lại business logic cho tất cả business
CREATE OR REPLACE FUNCTION platform.fn_upgrade_all_businesses() RETURNS VOID
  LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE r RECORD;
BEGIN
  RAISE NOTICE '🚀 Upgrading all tenants...';
  PERFORM platform.fn_apply_business_logic('business_template');
  PERFORM platform.fn_apply_auto_codes('business_template');
  FOR r IN
    SELECT schema_name, business_code FROM platform.businesses
    WHERE status NOT IN ('suspended','deleted')
    ORDER BY created_at
  LOOP
    PERFORM platform.fn_apply_business_logic(r.schema_name);
    PERFORM platform.fn_apply_auto_codes(r.schema_name);
    RAISE NOTICE '  ✅ % (%)', r.business_code, r.schema_name;
  END LOOP;
  RAISE NOTICE '🎉 Upgrade hoàn tất cho tất cả businesss!';
END;
$$;

-- Gọi example:
-- SELECT platform.fn_upgrade_all_businesses();

-- ════════════════════════════════════════════════════════════════
-- fn_apply_business_logic: Áp dụng triggers + views cho 1 schema
-- Gọi: PERFORM platform.fn_apply_business_logic('business_acafe');
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION platform.fn_apply_business_logic(p_schema VARCHAR)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Trigger: tự động cập nhật updated_at
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
    $t$;
  $f$, p_schema);

  -- Gắn trigger updated_at vào tất cả bảng có cột updated_at
  EXECUTE format($f$
    DO $d$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = '%s' AND column_name = 'updated_at'
      LOOP
        EXECUTE format(
          'CREATE OR REPLACE TRIGGER trg_%%I_updated_at
           BEFORE UPDATE ON %I.%%I
           FOR EACH ROW EXECUTE FUNCTION %I.fn_set_updated_at()',
          r.table_name, r.table_name
        );
      END LOOP;
    END;
    $d$;
  $f$, p_schema, p_schema, p_schema);

  -- Trigger: tự động cập nhật balance_after trong stock_transactions
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_stock_balance_after()
  RETURNS TRIGGER LANGUAGE plpgsql AS $t$
  DECLARE
    v_delta    NUMERIC;
    v_new_qty  NUMERIC;
  BEGIN
    -- Tính delta của transaction này
    v_delta := CASE
      WHEN NEW.txn_type LIKE '%%_in' OR NEW.txn_type = 'opening_balance'
        THEN NEW.quantity
        ELSE -NEW.quantity
    END;

    -- Atomic upsert theo 2 nhánh NULL/NOT NULL cho variant_id.
    IF NEW.variant_id IS NULL THEN
      INSERT INTO %I.stock_balances(location_id, product_id, variant_id, unit_name, quantity)
      VALUES (NEW.location_id, NEW.product_id, NULL, NEW.unit_name, v_delta)
      ON CONFLICT (location_id, product_id, unit_name) WHERE variant_id IS NULL
      DO UPDATE
      SET quantity = stock_balances.quantity + EXCLUDED.quantity,
          updated_at = NOW()
      RETURNING quantity INTO v_new_qty;
    ELSE
      INSERT INTO %I.stock_balances(location_id, product_id, variant_id, unit_name, quantity)
      VALUES (NEW.location_id, NEW.product_id, NEW.variant_id, NEW.unit_name, v_delta)
      ON CONFLICT (location_id, product_id, variant_id, unit_name) WHERE variant_id IS NOT NULL
      DO UPDATE
      SET quantity = stock_balances.quantity + EXCLUDED.quantity,
          updated_at = NOW()
      RETURNING quantity INTO v_new_qty;
    END IF;

    NEW.balance_after := v_new_qty;
    RETURN NEW;
  END;
  $t$;
  $f$, p_schema, p_schema, p_schema);

  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER trg_stock_txn_balance
    BEFORE INSERT ON %I.stock_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_stock_balance_after();
  $f$, p_schema, p_schema);

  -- Trigger: tự động cộng/trừ total_debt supplier
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_supplier_debt()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE
      v_old_effect NUMERIC(18,2) := 0;
      v_new_effect NUMERIC(18,2) := 0;
      v_delta NUMERIC(18,2) := 0;
    BEGIN
      -- Debt effect only counts when PO is financially committed.
      IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.status IN ('confirmed','received') THEN
        v_old_effect := COALESCE(OLD.grand_total, 0) - COALESCE(OLD.paid_amount, 0);
      END IF;

      IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.status IN ('confirmed','received') THEN
        v_new_effect := COALESCE(NEW.grand_total, 0) - COALESCE(NEW.paid_amount, 0);
      END IF;

      IF TG_OP = 'UPDATE' AND OLD.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
        IF v_old_effect <> 0 THEN
          UPDATE %I.suppliers
          SET total_debt = total_debt - v_old_effect
          WHERE id = OLD.supplier_id;
        END IF;

        IF v_new_effect <> 0 THEN
          UPDATE %I.suppliers
          SET total_debt = total_debt + v_new_effect
          WHERE id = NEW.supplier_id;
        END IF;
      ELSE
        v_delta := v_new_effect - v_old_effect;
        IF v_delta <> 0 THEN
          UPDATE %I.suppliers
          SET total_debt = total_debt + v_delta
          WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
        END IF;
      END IF;

      RETURN NEW;
    END;
    $t$;
  $f$, p_schema, p_schema, p_schema, p_schema);

  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER trg_po_supplier_debt
    AFTER INSERT OR UPDATE ON %I.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_supplier_debt();
  $f$, p_schema, p_schema);

  -- Trigger: cập nhật customer total_spent + visit_count
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_customer_stats()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    BEGIN
        IF (TG_OP = 'INSERT' AND NEW.status = 'completed') OR
          (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status <> 'completed') THEN        UPDATE %I.customers
        SET total_spent  = total_spent + NEW.grand_total,
            visit_count  = visit_count + 1,
            last_visit_at = NOW()
        WHERE id = NEW.customer_id;
      END IF;
      RETURN NEW;
    END;
    $t$;
  $f$, p_schema, p_schema);

  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER trg_so_customer_stats
    AFTER INSERT OR UPDATE ON %I.sales_orders
    FOR EACH ROW WHEN (NEW.customer_id IS NOT NULL)
    EXECUTE FUNCTION %I.fn_customer_stats();
  $f$, p_schema, p_schema);

  RAISE NOTICE '✅ Business logic applied to schema: %', p_schema;
END;
$$;


-- ════════════════════════════════════════════════════════════════
-- fn_apply_auto_codes: Đặt triggers tạo mã auto cho từng schema
-- Prefix: SO, PO, KH, SP, NV, DM, LO, QU, CA, NC
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION platform.fn_apply_auto_codes(p_schema VARCHAR)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- fn_next_code: lấy số thứ tự tiếp theo từ document_sequences
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_next_code(p_doc_type VARCHAR, p_store_id UUID DEFAULT NULL)
    RETURNS VARCHAR LANGUAGE plpgsql AS $t$
    DECLARE
      v_seq RECORD;
      v_num BIGINT;
      v_code VARCHAR;
    BEGIN
      SELECT * INTO v_seq FROM %I.document_sequences
      WHERE doc_type = p_doc_type
        AND (store_id = p_store_id OR store_id IS NULL)
      ORDER BY store_id NULLS LAST LIMIT 1 FOR UPDATE;
      IF NOT FOUND THEN
        INSERT INTO %I.document_sequences(doc_type,store_id,prefix,pad_length)
        VALUES(p_doc_type, p_store_id,
          CASE p_doc_type
            WHEN 'sales_order'     THEN 'SO' WHEN 'purchase_order' THEN 'PO'
            WHEN 'customer'        THEN 'KH' WHEN 'product'        THEN 'SP'
            WHEN 'staff'           THEN 'NV' WHEN 'category'       THEN 'DM'
            WHEN 'stock_location'  THEN 'LO' WHEN 'register'       THEN 'QU'
            WHEN 'work_shift'      THEN 'CA' WHEN 'supplier'       THEN 'NC'
            ELSE UPPER(LEFT(p_doc_type,2))
          END, 6
        )
        RETURNING * INTO v_seq;
      END IF;
      v_num := v_seq.last_number + 1;
      UPDATE %I.document_sequences SET last_number = v_num
      WHERE id = v_seq.id;
      v_code := v_seq.prefix || LPAD(v_num::TEXT, v_seq.pad_length, '0') || v_seq.suffix;
      RETURN v_code;
    END;
    $t$;
  $f$, p_schema, p_schema, p_schema, p_schema);

  -- Trigger auto-code cho sales_orders
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_code_sales_order()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    BEGIN
      IF NEW.order_code IS NULL OR NEW.order_code = '' THEN
        NEW.order_code := %I.fn_next_code('sales_order', NEW.store_id);
      END IF;
      RETURN NEW;
    END; $t$;
    CREATE OR REPLACE TRIGGER trg_so_auto_code
    BEFORE INSERT ON %I.sales_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_code_sales_order();
  $f$, p_schema, p_schema, p_schema, p_schema);

  -- Tương tự cho purchase_orders, staff_members, customers, products, suppliers...
  -- (Mỗi bảng gắn 1 trigger BEFORE INSERT kiểm tra _code IS NULL rồi gọi fn_next_code)

  RAISE NOTICE '✅ Auto-codes applied to schema: %', p_schema;
END;
$$;


-- ════════════════════════════════════════════════════════════════
-- fn_seed_business_rbac: Seed roles + permissions mặc định
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION platform.fn_seed_business_rbac(p_schema VARCHAR)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Roles
  EXECUTE format($f$
    INSERT INTO %I.roles(role_key,role_name,is_system) VALUES
      ('OWNER',   'Chủ cửa hàng',   TRUE),
      ('ADMIN',   'Quản trị viên',   TRUE),
      ('CASHIER', 'Thu ngân',        TRUE),
      ('INVENTORY','Thủ kho',        TRUE),
      ('STAFF',   'Nhân viên',       TRUE),
      ('KITCHEN', 'Bếp / Pha chế',   TRUE),
      ('DELIVERY','Giao hàng',       TRUE)
    ON CONFLICT (role_key) DO NOTHING;
  $f$, p_schema);

  -- Permissions (50 quyền theo module)
  EXECUTE format($f$
    INSERT INTO %I.permissions(permission_key,permission_name,module_key) VALUES
      -- Đơn hàng
      ('order.view',   'Xem đơn hàng',    'order'),
      ('order.create', 'Tạo đơn hàng',    'order'),
      ('order.cancel', 'Huỷ đơn hàng',    'order'),
      ('order.refund', 'Hoàn trả đơn',    'order'),
      -- Thanh toán
      ('payment.process','Xử lý thanh toán','payment'),
      ('payment.discount','Áp dụng giảm giá','payment'),
      -- Sản phẩm
      ('product.view',  'Xem sản phẩm',   'product'),
      ('product.create','Tạo sản phẩm',   'product'),
      ('product.update','Sửa sản phẩm',   'product'),
      ('product.delete','Xoá sản phẩm',   'product'),
      -- Kho
      ('inventory.view',   'Xem tồn kho',     'inventory'),
      ('inventory.adjust', 'Điều chỉnh kho',  'inventory'),
      ('inventory.import', 'Nhập hàng',       'inventory'),
      ('inventory.transfer','Chuyển kho',     'inventory'),
      -- Nhân viên
      ('staff.view',   'Xem nhân viên',   'staff'),
      ('staff.create', 'Tạo nhân viên',   'staff'),
      ('staff.update', 'Sửa nhân viên',   'staff'),
      -- Ca làm việc
      ('shift.open',   'Mở ca',           'shift'),
      ('shift.close',  'Đóng ca',         'shift'),
      -- Khách hàng
      ('customer.view',  'Xem khách hàng', 'customer'),
      ('customer.create','Tạo khách hàng', 'customer'),
      ('customer.update','Sửa khách hàng', 'customer'),
      -- Bàn
      ('table.view',   'Xem bàn',         'table'),
      ('table.manage', 'Quản lý bàn',     'table'),
      -- Báo cáo
      ('report.sales', 'Báo cáo doanh thu','report'),
      ('report.stock', 'Báo cáo kho',     'report'),
      -- Cài đặt
      ('setting.view',   'Xem cài đặt',   'setting'),
      ('setting.update', 'Sửa cài đặt',   'setting')
    ON CONFLICT (permission_key) DO NOTHING;
  $f$, p_schema);

  -- Gán quyền OWNER = tất cả
  EXECUTE format($f$
    INSERT INTO %I.role_permissions(role_id,permission_id)
    SELECT r.id, p.id FROM %I.roles r, %I.permissions p
    WHERE r.role_key = 'OWNER'
    ON CONFLICT DO NOTHING;
  $f$, p_schema, p_schema, p_schema);

  RAISE NOTICE '✅ RBAC seeded for schema: %', p_schema;
END;
$$;

-- =====================================================================
-- PLATFORM PATCHES
-- =====================================================================
-- =====================================================================
-- 0300 Platform usage billing and plan limits
-- Run after base platform migrations.
-- =====================================================================
SET search_path TO platform, public;

CREATE TABLE IF NOT EXISTS platform.plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(50) NOT NULL REFERENCES platform.subscription_plans(plan_code),
  limit_key VARCHAR(80) NOT NULL,
  limit_value BIGINT,
  reset_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
  is_hard_limit BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_code, limit_key),
  CONSTRAINT chk_plan_limit_reset CHECK (reset_period = ANY(ARRAY['never','daily','monthly','yearly']))
);

CREATE TABLE IF NOT EXISTS platform.business_usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES platform.businesses(id),
  usage_key VARCHAR(80) NOT NULL,
  current_value BIGINT NOT NULL DEFAULT 0,
  period_start DATE,
  period_end DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, usage_key, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS platform.business_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES platform.businesses(id),
  usage_date DATE NOT NULL,
  usage_key VARCHAR(80) NOT NULL,
  usage_value BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, usage_date, usage_key)
);

CREATE TABLE IF NOT EXISTS platform.platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES platform.businesses(id),
  invoice_code VARCHAR(80) NOT NULL UNIQUE,
  invoice_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  period_start DATE,
  period_end DATE,
  sub_total_vnd BIGINT NOT NULL DEFAULT 0,
  tax_amount_vnd BIGINT NOT NULL DEFAULT 0,
  grand_total_vnd BIGINT NOT NULL DEFAULT 0,
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_platform_invoice_status CHECK (invoice_status = ANY(ARRAY['draft','issued','paid','overdue','cancelled']))
);

CREATE TABLE IF NOT EXISTS platform.platform_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES platform.platform_invoices(id) ON DELETE CASCADE,
  line_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price_vnd BIGINT NOT NULL DEFAULT 0,
  line_total_vnd BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS platform.platform_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES platform.businesses(id),
  invoice_id UUID REFERENCES platform.platform_invoices(id),
  payment_code VARCHAR(80) NOT NULL UNIQUE,
  amount_vnd BIGINT NOT NULL,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(150),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_platform_payment_status CHECK (status = ANY(ARRAY['pending','completed','failed','refunded']))
);

CREATE TABLE IF NOT EXISTS platform.usage_billing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES platform.businesses(id),
  invoice_id UUID REFERENCES platform.platform_invoices(id),
  usage_key VARCHAR(80) NOT NULL,
  usage_value BIGINT NOT NULL DEFAULT 0,
  billable_value BIGINT NOT NULL DEFAULT 0,
  unit_price_vnd BIGINT NOT NULL DEFAULT 0,
  amount_vnd BIGINT NOT NULL DEFAULT 0,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_usage_daily ON platform.business_usage_daily(business_id, usage_date DESC, usage_key);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_tenant ON platform.platform_invoices(business_id, invoice_status, issued_at DESC);

\set business_schema business_template
-- =====================================================================
-- TENANT PATCHES
-- =====================================================================
-- =====================================================================
-- 0200 Tenant core stability extensions
-- Run with: psql -v business_schema=business_template -f 0200_tenant_core_stability_extensions.sql
-- Purpose: close core business gaps for POS/CRM: partial payment, debt, refunds,
-- status history, reservation, idempotency, product store settings, lot/serial,
-- recipe, supplier payables, delivery, reporting, approvals, outbox, offline sync.
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

-- -------------------------
-- Identity / RBAC bridge
-- -------------------------
CREATE TABLE IF NOT EXISTS staff_account_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES platform.accounts(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlinked_at TIMESTAMPTZ,
  UNIQUE (staff_id),
  UNIQUE (account_id),
  CONSTRAINT chk_staff_account_link_status CHECK (status = ANY(ARRAY['active','inactive','revoked']))
);

CREATE TABLE IF NOT EXISTS staff_role_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  UNIQUE (staff_id, role_id, store_id),
  CONSTRAINT chk_staff_role_binding_status CHECK (status = ANY(ARRAY['active','expired','revoked']))
);

CREATE TABLE IF NOT EXISTS permission_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key VARCHAR(150) NOT NULL UNIQUE,
  scope_type VARCHAR(20) NOT NULL DEFAULT 'business',
  module_key VARCHAR(80) NOT NULL,
  screen_key VARCHAR(100),
  button_key VARCHAR(100),
  action_key VARCHAR(100) NOT NULL,
  permission_name VARCHAR(150) NOT NULL,
  description TEXT,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
  require_reason BOOLEAN NOT NULL DEFAULT FALSE,
  require_mfa BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_permission_def_scope CHECK (scope_type = ANY(ARRAY['business','store','platform'])),
  CONSTRAINT chk_permission_def_risk CHECK (risk_level = ANY(ARRAY['low','medium','high','critical']))
);

-- -------------------------
-- Order status split and source metadata
-- -------------------------
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS source_channel VARCHAR(30) NOT NULL DEFAULT 'pos',
  ADD COLUMN IF NOT EXISTS source_ref VARCHAR(120),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'unfulfilled',
  ADD COLUMN IF NOT EXISTS inventory_status VARCHAR(30) NOT NULL DEFAULT 'not_deducted',
  ADD COLUMN IF NOT EXISTS debt_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rounding_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_order_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);

ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS chk_payment_status;
ALTER TABLE sales_orders ADD CONSTRAINT chk_payment_status CHECK (
  payment_status = ANY(ARRAY['unpaid','partial_paid','paid','overpaid','debt','refunded','partial_refunded','voided'])
);
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS chk_fulfillment_status;
ALTER TABLE sales_orders ADD CONSTRAINT chk_fulfillment_status CHECK (
  fulfillment_status = ANY(ARRAY['unfulfilled','partial_fulfilled','fulfilled','delivering','delivered','failed','returned'])
);
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS chk_inventory_status;
ALTER TABLE sales_orders ADD CONSTRAINT chk_inventory_status CHECK (
  inventory_status = ANY(ARRAY['not_reserved','reserved','not_deducted','deducted','partial_deducted','restored'])
);

CREATE TABLE IF NOT EXISTS sales_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  old_payment_status VARCHAR(30),
  new_payment_status VARCHAR(30),
  old_fulfillment_status VARCHAR(30),
  new_fulfillment_status VARCHAR(30),
  old_inventory_status VARCHAR(30),
  new_inventory_status VARCHAR(30),
  reason TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  adjustment_type VARCHAR(30) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  reason TEXT NOT NULL,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sales_order_adjustment_type CHECK (
    adjustment_type = ANY(ARRAY['discount','surcharge','tax_adjustment','rounding','delivery_fee','service_charge','tip','manual_correction'])
  )
);

-- -------------------------
-- Idempotency for order/payment/refund/webhook/offline sync
-- -------------------------
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type VARCHAR(50) NOT NULL,
  scope_id UUID,
  idempotency_key VARCHAR(150) NOT NULL,
  request_hash VARCHAR(255),
  response_payload JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_idempotency_status CHECK (status = ANY(ARRAY['processing','completed','failed','expired']))
);

ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS chk_idempotency_scope_type;
ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS chk_idempotency_scope_id;
ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS idempotency_keys_scope_type_idempotency_key_key;
ALTER TABLE idempotency_keys
  ADD CONSTRAINT chk_idempotency_scope_type CHECK (scope_type IN ('platform','business','store')),
  ADD CONSTRAINT chk_idempotency_scope_id CHECK (
    (scope_type = 'platform' AND scope_id IS NULL) OR
    (scope_type IN ('business','store') AND scope_id IS NOT NULL)
  );
CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_platform
ON idempotency_keys(scope_type, idempotency_key)
WHERE scope_type = 'platform';
CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_tenant_store
ON idempotency_keys(scope_type, scope_id, idempotency_key)
WHERE scope_type IN ('business','store');
DROP INDEX IF EXISTS idx_idempotency_lookup;
CREATE INDEX IF NOT EXISTS idx_idempotency_lookup
ON idempotency_keys(scope_type, scope_id, idempotency_key);

-- -------------------------
-- Customer credit / receivables / debt collection
-- -------------------------
CREATE TABLE IF NOT EXISTS customer_credit_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  credit_limit NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_debt NUMERIC(18,2) NOT NULL DEFAULT 0,
  payment_terms_days INTEGER NOT NULL DEFAULT 0,
  allow_credit BOOLEAN NOT NULL DEFAULT FALSE,
  credit_status VARCHAR(20) NOT NULL DEFAULT 'normal',
  last_payment_at TIMESTAMPTZ,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_customer_credit_status CHECK (credit_status = ANY(ARRAY['normal','watchlist','blocked']))
);

CREATE TABLE IF NOT EXISTS customer_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  order_id UUID REFERENCES sales_orders(id),
  receivable_code VARCHAR(50) NOT NULL,
  original_amount NUMERIC(18,2) NOT NULL,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(18,2) NOT NULL,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receivable_status CHECK (status = ANY(ARRAY['open','partial_paid','paid','overdue','bad_debt','cancelled','written_off'])),
  CONSTRAINT chk_receivable_amount CHECK (original_amount >= 0 AND paid_amount >= 0 AND remaining_amount >= 0)
);

CREATE TABLE IF NOT EXISTS customer_receivable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  payment_code VARCHAR(50) NOT NULL,
  payment_method_id UUID REFERENCES payment_methods(id),
  amount NUMERIC(18,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receivable_payment_amount CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS customer_receivable_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_payment_id UUID NOT NULL REFERENCES customer_receivable_payments(id) ON DELETE CASCADE,
  receivable_id UUID NOT NULL REFERENCES customer_receivables(id),
  order_id UUID REFERENCES sales_orders(id),
  allocated_amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receivable_allocated_amount CHECK (allocated_amount > 0)
);

CREATE TABLE IF NOT EXISTS customer_receivable_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES customer_receivables(id),
  adjustment_type VARCHAR(30) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  reason TEXT NOT NULL,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receivable_adjustment_type CHECK (adjustment_type = ANY(ARRAY['write_off','discount_settlement','manual_correction','bad_debt','reopen'])),
  CONSTRAINT chk_receivable_adjustment_amount CHECK (amount > 0)
);

-- -------------------------
-- Refund ledger independent from returns
-- -------------------------
CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id),
  payment_id UUID REFERENCES order_payments(id),
  return_id UUID REFERENCES order_returns(id),
  refund_code VARCHAR(50) NOT NULL,
  refund_amount NUMERIC(18,2) NOT NULL,
  refund_method VARCHAR(50) NOT NULL,
  transaction_ref VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payment_refund_status CHECK (status = ANY(ARRAY['pending','completed','failed','cancelled'])),
  CONSTRAINT chk_payment_refund_amount CHECK (refund_amount > 0)
);

-- -------------------------
-- Product extensions
-- -------------------------
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_product_type;
ALTER TABLE products ADD CONSTRAINT chk_product_type CHECK (
  product_type = ANY(ARRAY['simple','variant','combo','service','modifier','ingredient','serialized','batch'])
);

CREATE TABLE IF NOT EXISTS product_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  unit_name VARCHAR(50),
  barcode VARCHAR(100) NOT NULL,
  barcode_type VARCHAR(30) NOT NULL DEFAULT 'ean13',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (barcode)
);

CREATE TABLE IF NOT EXISTS product_store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_pos BOOLEAN NOT NULL DEFAULT TRUE,
  show_online BOOLEAN NOT NULL DEFAULT TRUE,
  allow_backorder BOOLEAN NOT NULL DEFAULT FALSE,
  min_stock_level NUMERIC(12,3),
  max_stock_level NUMERIC(12,3),
  reorder_point NUMERIC(12,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_store_settings_no_variant
ON product_store_settings(store_id, product_id) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_store_settings_with_variant
ON product_store_settings(store_id, product_id, variant_id) WHERE variant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS product_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  lot_code VARCHAR(100) NOT NULL,
  manufacture_date DATE,
  expiry_date DATE,
  supplier_id UUID REFERENCES suppliers(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_lots_no_variant ON product_lots(product_id, lot_code) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_lots_with_variant ON product_lots(product_id, variant_id, lot_code) WHERE variant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS product_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  serial_number VARCHAR(150) NOT NULL UNIQUE,
  store_id UUID REFERENCES stores(id),
  location_id UUID REFERENCES stock_locations(id),
  status VARCHAR(30) NOT NULL DEFAULT 'in_stock',
  purchase_order_id UUID,
  sales_order_id UUID,
  sold_at TIMESTAMPTZ,
  warranty_start DATE,
  warranty_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_serial_status CHECK (status = ANY(ARRAY['in_stock','reserved','sold','returned','damaged','lost']))
);

CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  ingredient_product_id UUID NOT NULL REFERENCES products(id),
  ingredient_variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(18,4) NOT NULL,
  unit_name VARCHAR(50) NOT NULL,
  wastage_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_recipe_qty CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  store_id UUID REFERENCES stores(id),
  old_price NUMERIC(18,4),
  new_price NUMERIC(18,4) NOT NULL,
  changed_by UUID,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_cost_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  old_cost NUMERIC(18,4),
  new_cost NUMERIC(18,4) NOT NULL,
  changed_by UUID,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- Stock reservation and lot balance support
-- -------------------------
CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  location_id UUID NOT NULL REFERENCES stock_locations(id),
  order_id UUID REFERENCES sales_orders(id),
  order_line_id UUID REFERENCES sales_order_lines(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  lot_id UUID REFERENCES product_lots(id),
  unit_name VARCHAR(50) NOT NULL,
  quantity NUMERIC(18,4) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_stock_reservation_status CHECK (status = ANY(ARRAY['active','consumed','released','expired','cancelled'])),
  CONSTRAINT chk_stock_reservation_qty CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS stock_lot_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES stock_locations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  lot_id UUID NOT NULL REFERENCES product_lots(id),
  unit_name VARCHAR(50) NOT NULL DEFAULT 'piece',
  quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  reserved_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_lot_balances_scope
ON stock_lot_balances(location_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), lot_id, unit_name);

ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES product_lots(id);

-- -------------------------
-- Supplier payables and payments
-- -------------------------
CREATE TABLE IF NOT EXISTS supplier_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  payable_code VARCHAR(50) NOT NULL,
  original_amount NUMERIC(18,2) NOT NULL,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(18,2) NOT NULL,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_supplier_payable_status CHECK (status = ANY(ARRAY['open','partial_paid','paid','overdue','cancelled','written_off']))
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  amount NUMERIC(18,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_supplier_payment_amount CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_payment_id UUID NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE,
  supplier_payable_id UUID NOT NULL REFERENCES supplier_payables(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  allocated_amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_supplier_payment_alloc_amount CHECK (allocated_amount > 0)
);

-- -------------------------
-- Delivery MVP / COD
-- -------------------------
CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  delivery_code VARCHAR(50) NOT NULL,
  carrier_name VARCHAR(100),
  shipper_id UUID,
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  cod_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_delivery_order_status CHECK (delivery_status = ANY(ARRAY['pending','assigned','picked_up','delivering','delivered','failed','returned','cancelled']))
);

-- -------------------------
-- Reporting snapshot / approval / outbox / offline sync
-- -------------------------
CREATE TABLE IF NOT EXISTS report_daily_sales_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  report_date DATE NOT NULL,
  gross_sales NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_sales NUMERIC(18,2) NOT NULL DEFAULT 0,
  cash_collected NUMERIC(18,2) NOT NULL DEFAULT 0,
  receivable_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  cogs_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  gross_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, report_date)
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  request_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  requested_by UUID NOT NULL,
  approved_by UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_approval_status CHECK (status = ANY(ARRAY['pending','approved','rejected','cancelled']))
);

CREATE TABLE IF NOT EXISTS event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_event_outbox_status CHECK (status = ANY(ARRAY['pending','processing','processed','failed']))
);

CREATE TABLE IF NOT EXISTS offline_sync_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  register_id UUID REFERENCES registers(id),
  device_identity_id UUID,
  batch_code VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL,
  error_message TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, batch_code),
  CONSTRAINT chk_offline_sync_status CHECK (status = ANY(ARRAY['pending','processing','synced','failed','conflict']))
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_staff_account_links_account ON staff_account_links(account_id);
CREATE INDEX IF NOT EXISTS idx_staff_role_bindings_staff ON staff_role_bindings(staff_id, store_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_order_payment_status ON sales_orders(store_id, payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_order_source ON sales_orders(source_channel, source_ref) WHERE source_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receivables_customer_status ON customer_receivables(customer_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_store_status ON customer_receivables(store_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON payment_refunds(order_id, status);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_barcode ON product_barcodes(barcode);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order ON stock_reservations(order_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product ON stock_reservations(location_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_event_outbox_pending ON event_outbox(status, created_at) WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_keys(scope_type, idempotency_key);
-- =====================================================================
-- 0210 Invoice / tax / credit note / debit note
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS invoice_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  invoice_type VARCHAR(30) NOT NULL DEFAULT 'sales_invoice',
  prefix VARCHAR(30) NOT NULL DEFAULT '',
  suffix VARCHAR(30) NOT NULL DEFAULT '',
  pad_length INTEGER NOT NULL DEFAULT 6,
  last_number BIGINT NOT NULL DEFAULT 0,
  reset_period VARCHAR(20) NOT NULL DEFAULT 'yearly',
  last_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, invoice_type),
  CONSTRAINT chk_invoice_seq_reset CHECK (reset_period = ANY(ARRAY['never','daily','monthly','yearly']))
);

CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES sales_orders(id),
  invoice_code VARCHAR(60) NOT NULL,
  invoice_type VARCHAR(30) NOT NULL DEFAULT 'standard',
  invoice_status VARCHAR(30) NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  buyer_name VARCHAR(255),
  buyer_tax_code VARCHAR(50),
  buyer_address TEXT,
  buyer_email VARCHAR(255),
  sub_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  external_invoice_id VARCHAR(120),
  external_invoice_url TEXT,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(invoice_code),
  CONSTRAINT chk_sales_invoice_type CHECK (invoice_type = ANY(ARRAY['standard','replacement','adjustment','consolidated'])) ,
  CONSTRAINT chk_sales_invoice_status CHECK (invoice_status = ANY(ARRAY['draft','issued','cancelled','adjusted','replaced']))
);

CREATE TABLE IF NOT EXISTS sales_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  order_line_id UUID REFERENCES sales_order_lines(id),
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_name VARCHAR(50),
  unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_invoice_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  tax_code VARCHAR(30) NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  taxable_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  invoice_id UUID REFERENCES sales_invoices(id),
  order_id UUID REFERENCES sales_orders(id),
  credit_note_code VARCHAR(60) NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  issued_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_credit_note_status CHECK (status = ANY(ARRAY['draft','issued','cancelled','applied']))
);

CREATE TABLE IF NOT EXISTS credit_note_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  invoice_line_id UUID REFERENCES sales_invoice_lines(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  invoice_id UUID REFERENCES sales_invoices(id),
  debit_note_code VARCHAR(60) NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  issued_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_debit_note_status CHECK (status = ANY(ARRAY['draft','issued','cancelled','applied']))
);

CREATE TABLE IF NOT EXISTS tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  period_code VARCHAR(30) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  output_tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  input_tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tax_report_status CHECK (status = ANY(ARRAY['draft','submitted','closed','reopened']))
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_store_status ON sales_invoices(store_id, invoice_status, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_order ON sales_invoices(order_id) WHERE order_id IS NOT NULL;
-- =====================================================================
-- 0211 Cash drawer / shift reconciliation / bank reconciliation
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS cash_denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code CHAR(3) NOT NULL DEFAULT 'VND',
  denomination_value NUMERIC(18,2) NOT NULL,
  denomination_name VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(currency_code, denomination_value)
);

CREATE TABLE IF NOT EXISTS cash_drawer_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  register_id UUID REFERENCES registers(id),
  shift_id UUID REFERENCES work_shifts(id),
  cash_account_id UUID REFERENCES cash_accounts(id),
  movement_code VARCHAR(50) NOT NULL,
  movement_type VARCHAR(30) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  reason TEXT,
  ref_type VARCHAR(50),
  ref_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cash_drawer_movement_type CHECK (movement_type = ANY(ARRAY['open_cash','sale_cash_in','refund_cash_out','paid_in','paid_out','cash_drop','safe_transfer','close_cash','adjustment'])),
  CONSTRAINT chk_cash_drawer_amount CHECK (amount >= 0)
);

CREATE TABLE IF NOT EXISTS shift_payment_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES work_shifts(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES payment_methods(id),
  method_code VARCHAR(50) NOT NULL,
  expected_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  counted_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  variance_amount NUMERIC(18,2) GENERATED ALWAYS AS (counted_amount - expected_amount) STORED,
  order_count INTEGER NOT NULL DEFAULT 0,
  refund_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shift_id, method_code)
);

CREATE TABLE IF NOT EXISTS shift_cash_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES work_shifts(id) ON DELETE CASCADE,
  denomination_id UUID REFERENCES cash_denominations(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  counted_by UUID,
  counted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  cash_account_id UUID REFERENCES cash_accounts(id),
  import_code VARCHAR(60) NOT NULL,
  file_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  imported_by UUID,
  imported_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(import_code),
  CONSTRAINT chk_bank_statement_import_status CHECK (status = ANY(ARRAY['pending','processing','completed','failed']))
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES bank_statement_imports(id) ON DELETE SET NULL,
  cash_account_id UUID REFERENCES cash_accounts(id),
  transaction_ref VARCHAR(255),
  transaction_time TIMESTAMPTZ NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  description TEXT,
  counterparty_account VARCHAR(100),
  counterparty_name VARCHAR(255),
  match_status VARCHAR(20) NOT NULL DEFAULT 'unmatched',
  matched_ref_type VARCHAR(50),
  matched_ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_bank_txn_direction CHECK (direction = ANY(ARRAY['in','out'])),
  CONSTRAINT chk_bank_txn_match_status CHECK (match_status = ANY(ARRAY['unmatched','matched','ignored','duplicate']))
);

CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  reconciliation_code VARCHAR(60) NOT NULL UNIQUE,
  source_type VARCHAR(30) NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  expected_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  variance_amount NUMERIC(18,2) GENERATED ALWAYS AS (actual_amount - expected_amount) STORED,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by UUID,
  closed_by UUID,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payment_recon_status CHECK (status = ANY(ARRAY['draft','in_progress','matched','variance','closed','cancelled']))
);

CREATE TABLE IF NOT EXISTS payment_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES payment_reconciliations(id) ON DELETE CASCADE,
  order_payment_id UUID REFERENCES order_payments(id),
  bank_transaction_id UUID REFERENCES bank_transactions(id),
  expected_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  match_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payment_recon_item_status CHECK (match_status = ANY(ARRAY['pending','matched','variance','ignored']))
);

CREATE TABLE IF NOT EXISTS bank_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  from_cash_account_id UUID REFERENCES cash_accounts(id),
  to_cash_account_id UUID REFERENCES cash_accounts(id),
  deposit_code VARCHAR(60) NOT NULL UNIQUE,
  amount NUMERIC(18,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  deposited_by UUID,
  deposited_at TIMESTAMPTZ,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_bank_deposit_status CHECK (status = ANY(ARRAY['pending','deposited','confirmed','cancelled']))
);

CREATE INDEX IF NOT EXISTS idx_cash_drawer_shift ON cash_drawer_movements(shift_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_ref ON bank_transactions(transaction_ref) WHERE transaction_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_transactions_match ON bank_transactions(match_status, transaction_time DESC);
-- =====================================================================
-- 0212 Supplier return / supplier credit note / receiving discrepancy
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS supplier_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  supplier_return_code VARCHAR(60) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  return_reason TEXT,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  refund_method VARCHAR(50),
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_supplier_return_status CHECK (status = ANY(ARRAY['draft','approved','shipped','completed','cancelled','rejected']))
);

CREATE TABLE IF NOT EXISTS supplier_return_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_return_id UUID NOT NULL REFERENCES supplier_returns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  lot_id UUID REFERENCES product_lots(id),
  unit_name VARCHAR(50) NOT NULL,
  quantity NUMERIC(18,4) NOT NULL,
  unit_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  note TEXT,
  CONSTRAINT chk_supplier_return_qty CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS supplier_credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  supplier_return_id UUID REFERENCES supplier_returns(id),
  credit_note_code VARCHAR(60) NOT NULL UNIQUE,
  amount NUMERIC(18,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  applied_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_supplier_credit_note_status CHECK (status = ANY(ARRAY['open','partial_applied','applied','cancelled']))
);

CREATE TABLE IF NOT EXISTS receiving_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  expected_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  received_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  discrepancy_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receiving_discrepancy_type CHECK (discrepancy_type = ANY(ARRAY['shortage','overage','damaged','wrong_item','quality_issue'])),
  CONSTRAINT chk_receiving_discrepancy_status CHECK (status = ANY(ARRAY['open','resolved','ignored']))
);
-- =====================================================================
-- 0213 Inventory costing / COGS / landed cost / valuation
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS inventory_cost_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES stock_locations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  lot_id UUID REFERENCES product_lots(id),
  source_ref_type VARCHAR(50),
  source_ref_id UUID,
  quantity_in NUMERIC(18,4) NOT NULL DEFAULT 0,
  quantity_remaining NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cost_layer_qty CHECK (quantity_in >= 0 AND quantity_remaining >= 0)
);

CREATE TABLE IF NOT EXISTS cogs_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id),
  order_line_id UUID NOT NULL REFERENCES sales_order_lines(id),
  cost_layer_id UUID REFERENCES inventory_cost_layers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(18,4) NOT NULL,
  unit_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cogs_alloc_qty CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS landed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  landed_cost_code VARCHAR(60) NOT NULL UNIQUE,
  cost_type VARCHAR(50) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  allocation_method VARCHAR(30) NOT NULL DEFAULT 'by_value',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_landed_cost_alloc_method CHECK (allocation_method = ANY(ARRAY['by_value','by_quantity','by_weight','manual'])),
  CONSTRAINT chk_landed_cost_status CHECK (status = ANY(ARRAY['draft','allocated','posted','cancelled']))
);

CREATE TABLE IF NOT EXISTS landed_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landed_cost_id UUID NOT NULL REFERENCES landed_costs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  cost_layer_id UUID REFERENCES inventory_cost_layers(id),
  allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_cost_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  old_unit_cost NUMERIC(18,4),
  new_unit_cost NUMERIC(18,4) NOT NULL,
  quantity_affected NUMERIC(18,4),
  reason TEXT NOT NULL,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_valuation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  location_id UUID REFERENCES stock_locations(id),
  snapshot_date DATE NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  total_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(location_id, snapshot_date, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cost_layers_product ON inventory_cost_layers(product_id, variant_id, quantity_remaining);
CREATE INDEX IF NOT EXISTS idx_cogs_order_line ON cogs_allocations(order_line_id);
-- =====================================================================
-- 0214 Omnichannel / inbound webhook / sync jobs / external mappings
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS sales_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_code VARCHAR(50) NOT NULL UNIQUE,
  channel_name VARCHAR(150) NOT NULL,
  channel_type VARCHAR(30) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sales_channel_type CHECK (channel_type = ANY(ARRAY['pos','website','marketplace','social','api','manual'])),
  CONSTRAINT chk_sales_channel_status CHECK (status = ANY(ARRAY['active','disabled','error']))
);

CREATE TABLE IF NOT EXISTS channel_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  external_product_id VARCHAR(150) NOT NULL,
  external_variant_id VARCHAR(150),
  external_sku VARCHAR(150),
  sync_status VARCHAR(20) NOT NULL DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, external_product_id, external_variant_id)
);

CREATE TABLE IF NOT EXISTS channel_order_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  order_id UUID REFERENCES sales_orders(id),
  external_order_id VARCHAR(150) NOT NULL,
  external_order_status VARCHAR(80),
  raw_payload JSONB NOT NULL DEFAULT '{}',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  UNIQUE(channel_id, external_order_id)
);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES sales_channels(id),
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  total_items INTEGER NOT NULL DEFAULT 0,
  success_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sync_job_status CHECK (status = ANY(ARRAY['pending','running','completed','failed','cancelled']))
);

CREATE TABLE IF NOT EXISTS sync_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  entity_type VARCHAR(50),
  entity_id UUID,
  external_id VARCHAR(150),
  status VARCHAR(20) NOT NULL,
  message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL,
  source_event_id VARCHAR(150),
  event_type VARCHAR(100) NOT NULL,
  signature VARCHAR(500),
  raw_payload JSONB NOT NULL DEFAULT '{}',
  processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(source_type, source_event_id),
  CONSTRAINT chk_webhook_inbox_status CHECK (processing_status = ANY(ARRAY['pending','processing','processed','failed','ignored']))
);

CREATE TABLE IF NOT EXISTS external_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  external_id VARCHAR(150),
  direction VARCHAR(10) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_external_event_direction CHECK (direction = ANY(ARRAY['in','out'])),
  CONSTRAINT chk_external_event_status CHECK (status = ANY(ARRAY['success','failed','retrying']))
);

CREATE INDEX IF NOT EXISTS idx_webhook_inbox_pending ON webhook_inbox(processing_status, received_at) WHERE processing_status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS idx_channel_orders_external ON channel_order_mappings(channel_id, external_order_id);
-- =====================================================================
-- 0215 Shipping / fulfillment / COD reconciliation
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS shipping_carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_code VARCHAR(50) NOT NULL UNIQUE,
  carrier_name VARCHAR(150) NOT NULL,
  carrier_type VARCHAR(30) NOT NULL DEFAULT 'internal',
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_shipping_carrier_type CHECK (carrier_type = ANY(ARRAY['internal','third_party','marketplace']))
);

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  carrier_id UUID REFERENCES shipping_carriers(id),
  shipment_code VARCHAR(60) NOT NULL UNIQUE,
  tracking_number VARCHAR(150),
  shipment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  recipient_name VARCHAR(255),
  recipient_phone VARCHAR(30),
  shipping_address TEXT,
  cod_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_shipment_status CHECK (shipment_status = ANY(ARRAY['pending','packed','shipped','in_transit','delivered','failed','returned','cancelled']))
);

CREATE TABLE IF NOT EXISTS shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_line_id UUID REFERENCES sales_order_lines(id),
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(18,4) NOT NULL,
  CONSTRAINT chk_shipment_item_qty CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS shipment_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  package_code VARCHAR(80) NOT NULL,
  weight_gram INTEGER,
  length_cm NUMERIC(10,2),
  width_cm NUMERIC(10,2),
  height_cm NUMERIC(10,2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipment_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_code VARCHAR(80),
  event_status VARCHAR(50) NOT NULL,
  event_message TEXT,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL DEFAULT 1,
  attempt_status VARCHAR(30) NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  note TEXT,
  CONSTRAINT chk_delivery_attempt_status CHECK (attempt_status = ANY(ARRAY['success','failed','rescheduled','cancelled']))
);

CREATE TABLE IF NOT EXISTS cod_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES shipping_carriers(id),
  reconciliation_code VARCHAR(80) NOT NULL UNIQUE,
  period_start DATE,
  period_end DATE,
  expected_cod_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  received_cod_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  fee_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT chk_cod_recon_status CHECK (status = ANY(ARRAY['draft','matched','variance','closed','cancelled']))
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(store_id, shipment_status, created_at DESC);
-- =====================================================================
-- 0216 Loyalty / voucher wallet / gift card / customer wallet
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_code VARCHAR(50) NOT NULL UNIQUE,
  program_name VARCHAR(150) NOT NULL,
  earn_rule JSONB NOT NULL DEFAULT '{}',
  redeem_rule JSONB NOT NULL DEFAULT '{}',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_loyalty_program_status CHECK (status = ANY(ARRAY['active','disabled','expired']))
);

CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_code VARCHAR(50) NOT NULL UNIQUE,
  tier_name VARCHAR(100) NOT NULL,
  min_spend NUMERIC(18,2) NOT NULL DEFAULT 0,
  point_multiplier NUMERIC(10,2) NOT NULL DEFAULT 1,
  benefits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS loyalty_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  store_id UUID REFERENCES stores(id),
  txn_type VARCHAR(30) NOT NULL,
  points NUMERIC(18,2) NOT NULL,
  balance_after NUMERIC(18,2) NOT NULL,
  ref_type VARCHAR(50),
  ref_id UUID,
  expires_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_loyalty_point_txn_type CHECK (txn_type = ANY(ARRAY['earn','redeem','expire','adjust','refund_reverse']))
);

CREATE TABLE IF NOT EXISTS voucher_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code VARCHAR(60) NOT NULL UNIQUE,
  batch_name VARCHAR(150) NOT NULL,
  voucher_type VARCHAR(30) NOT NULL,
  discount_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_voucher_batch_status CHECK (status = ANY(ARRAY['draft','active','expired','cancelled']))
);

CREATE TABLE IF NOT EXISTS customer_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_batch_id UUID REFERENCES voucher_batches(id),
  customer_id UUID REFERENCES customers(id),
  voucher_code VARCHAR(80) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  used_order_id UUID REFERENCES sales_orders(id),
  used_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_customer_voucher_status CHECK (status = ANY(ARRAY['active','used','expired','cancelled']))
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_code VARCHAR(80) NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  initial_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_gift_card_status CHECK (status = ANY(ARRAY['active','used','expired','cancelled','blocked']))
);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  txn_type VARCHAR(30) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  balance_after NUMERIC(18,2) NOT NULL,
  ref_type VARCHAR(50),
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_gift_card_txn_type CHECK (txn_type = ANY(ARRAY['issue','redeem','refund','adjust','expire']))
);

CREATE TABLE IF NOT EXISTS customer_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id),
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_customer_wallet_status CHECK (status = ANY(ARRAY['active','blocked','closed']))
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES customer_wallets(id) ON DELETE CASCADE,
  txn_type VARCHAR(30) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  balance_after NUMERIC(18,2) NOT NULL,
  ref_type VARCHAR(50),
  ref_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_wallet_txn_type CHECK (txn_type = ANY(ARRAY['topup','payment','refund','adjust','expire','withdraw']))
);
-- =====================================================================
-- 0217 Customer care / consent / segmentation / campaigns
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_code VARCHAR(50) NOT NULL UNIQUE,
  tag_name VARCHAR(100) NOT NULL,
  tag_color VARCHAR(7) DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS customer_tag_mappings (
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(customer_id, tag_id)
);

CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_code VARCHAR(50) NOT NULL UNIQUE,
  segment_name VARCHAR(150) NOT NULL,
  segment_type VARCHAR(20) NOT NULL DEFAULT 'dynamic',
  rules JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_customer_segment_type CHECK (segment_type = ANY(ARRAY['static','dynamic']))
);

CREATE TABLE IF NOT EXISTS customer_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'granted',
  source VARCHAR(50),
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, consent_type, channel),
  CONSTRAINT chk_customer_consent_status CHECK (status = ANY(ARRAY['granted','revoked','unknown']))
);

CREATE TABLE IF NOT EXISTS customer_contact_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, channel)
);

CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  store_id UUID REFERENCES stores(id),
  interaction_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  content TEXT,
  ref_type VARCHAR(50),
  ref_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_merge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_customer_id UUID NOT NULL REFERENCES customers(id),
  duplicate_customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_by UUID,
  approved_by UUID,
  merged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_customer_merge_status CHECK (status = ANY(ARRAY['pending','approved','rejected','merged','cancelled']))
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code VARCHAR(60) NOT NULL UNIQUE,
  campaign_name VARCHAR(150) NOT NULL,
  campaign_type VARCHAR(30) NOT NULL,
  target_config JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_campaign_status CHECK (status = ANY(ARRAY['draft','scheduled','running','completed','cancelled','failed']))
);

CREATE TABLE IF NOT EXISTS campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  channel VARCHAR(30) NOT NULL,
  recipient VARCHAR(255),
  message_payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_campaign_message_status CHECK (status = ANY(ARRAY['pending','sent','delivered','failed','skipped']))
);
-- =====================================================================
-- 0218 Service orders / warranty / repair / service packages
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  service_order_code VARCHAR(60) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promised_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_staff_id UUID REFERENCES staff_members(id),
  problem_description TEXT,
  internal_note TEXT,
  order_id UUID REFERENCES sales_orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_service_order_status CHECK (status = ANY(ARRAY['new','diagnosing','waiting_parts','in_service','completed','cancelled','returned']))
);

CREATE TABLE IF NOT EXISTS service_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  service_product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS warranty_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  policy_name VARCHAR(150) NOT NULL,
  warranty_months INTEGER NOT NULL DEFAULT 0,
  terms TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  sales_order_id UUID REFERENCES sales_orders(id),
  product_id UUID REFERENCES products(id),
  serial_id UUID REFERENCES product_serials(id),
  service_order_id UUID REFERENCES service_orders(id),
  claim_code VARCHAR(60) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'submitted',
  issue_description TEXT,
  resolution TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT chk_warranty_claim_status CHECK (status = ANY(ARRAY['submitted','approved','rejected','repairing','resolved','cancelled']))
);

CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_code VARCHAR(60) NOT NULL UNIQUE,
  package_name VARCHAR(150) NOT NULL,
  product_id UUID REFERENCES products(id),
  total_sessions INTEGER NOT NULL DEFAULT 0,
  valid_days INTEGER,
  price NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES service_packages(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID REFERENCES sales_orders(id),
  total_sessions INTEGER NOT NULL DEFAULT 0,
  used_sessions INTEGER NOT NULL DEFAULT 0,
  remaining_sessions INTEGER NOT NULL DEFAULT 0,
  valid_from DATE,
  valid_to DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_package_usage_status CHECK (status = ANY(ARRAY['active','used_up','expired','cancelled']))
);
-- =====================================================================
-- 0219 Production / prep batch / waste / kitchen stations
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS kitchen_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  station_code VARCHAR(50) NOT NULL,
  station_name VARCHAR(150) NOT NULL,
  station_type VARCHAR(30) NOT NULL DEFAULT 'kitchen',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, station_code)
);

CREATE TABLE IF NOT EXISTS production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  location_id UUID REFERENCES stock_locations(id),
  production_code VARCHAR(60) NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  planned_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  produced_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  planned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_production_order_status CHECK (status = ANY(ARRAY['draft','planned','in_progress','completed','cancelled']))
);

CREATE TABLE IF NOT EXISTS production_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  ingredient_product_id UUID NOT NULL REFERENCES products(id),
  ingredient_variant_id UUID REFERENCES product_variants(id),
  required_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  consumed_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit_name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredient_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  order_id UUID REFERENCES sales_orders(id),
  order_line_id UUID REFERENCES sales_order_lines(id),
  production_order_id UUID REFERENCES production_orders(id),
  ingredient_product_id UUID NOT NULL REFERENCES products(id),
  ingredient_variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(18,4) NOT NULL,
  unit_name VARCHAR(50) NOT NULL,
  stock_transaction_id UUID REFERENCES stock_transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  location_id UUID REFERENCES stock_locations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  lot_id UUID REFERENCES product_lots(id),
  quantity NUMERIC(18,4) NOT NULL,
  unit_name VARCHAR(50) NOT NULL,
  waste_reason VARCHAR(80) NOT NULL,
  stock_transaction_id UUID REFERENCES stock_transactions(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_waste_qty CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS prep_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  batch_code VARCHAR(80) NOT NULL UNIQUE,
  produced_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  remaining_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  prepared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  CONSTRAINT chk_prep_batch_status CHECK (status = ANY(ARRAY['active','used_up','expired','discarded']))
);

CREATE TABLE IF NOT EXISTS menu_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  available_status VARCHAR(20) NOT NULL DEFAULT 'available',
  reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, product_id, variant_id),
  CONSTRAINT chk_menu_availability_status CHECK (available_status = ANY(ARRAY['available','sold_out','hidden','limited']))
);
-- =====================================================================
-- 0220 Period lock / closing / role-permission history
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  lock_type VARCHAR(30) NOT NULL DEFAULT 'business',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'locked',
  locked_by UUID,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlocked_by UUID,
  unlocked_at TIMESTAMPTZ,
  reason TEXT,
  CONSTRAINT chk_period_lock_dates CHECK (period_start <= period_end),
  CONSTRAINT chk_period_lock_status CHECK (status = ANY(ARRAY['locked','unlocked','reopened']))
);

CREATE TABLE IF NOT EXISTS closing_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  closing_code VARCHAR(60) NOT NULL UNIQUE,
  closing_type VARCHAR(30) NOT NULL DEFAULT 'daily',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_closing_run_status CHECK (status = ANY(ARRAY['draft','running','completed','failed','reopened']))
);

CREATE TABLE IF NOT EXISTS closing_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_run_id UUID NOT NULL REFERENCES closing_runs(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  result_payload JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reopen_period_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  period_lock_id UUID REFERENCES period_locks(id),
  reason TEXT NOT NULL,
  requested_by UUID NOT NULL,
  approved_by UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CONSTRAINT chk_reopen_request_status CHECK (status = ANY(ARRAY['pending','approved','rejected','cancelled']))
);

CREATE TABLE IF NOT EXISTS role_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff_members(id),
  role_id UUID REFERENCES roles(id),
  store_id UUID REFERENCES stores(id),
  action VARCHAR(30) NOT NULL,
  changed_by UUID,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_role_change_action CHECK (action = ANY(ARRAY['grant','revoke','expire','restore']))
);

CREATE TABLE IF NOT EXISTS permission_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id),
  action VARCHAR(30) NOT NULL,
  changed_by UUID,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_permission_change_action CHECK (action = ANY(ARRAY['grant','revoke']))
);

CREATE TABLE IF NOT EXISTS temporary_permission_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id),
  permission_key VARCHAR(150) NOT NULL,
  store_id UUID REFERENCES stores(id),
  reason TEXT NOT NULL,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  CONSTRAINT chk_temp_perm_status CHECK (status = ANY(ARRAY['active','expired','revoked']))
);



-- =====================================================================
-- FULL PLATFORM RBAC SEED FOR NEW DATABASE
-- =====================================================================
SET search_path TO platform, public;

INSERT INTO platform.roles(role_key, role_name, role_scope, is_system, sort_order) VALUES
  ('PLATFORM_OWNER', 'Chủ hệ thống', 'platform', TRUE, 1),
  ('PLATFORM_ADMIN', 'Quản trị hệ thống', 'platform', TRUE, 2),
  ('BILLING_ADMIN', 'Quản trị billing', 'platform', TRUE, 3),
  ('SUPPORT_ADMIN', 'Hỗ trợ khách hàng', 'platform', TRUE, 4),
  ('TECH_OPS', 'Kỹ thuật vận hành', 'platform', TRUE, 5),
  ('AUDITOR', 'Kiểm toán / chỉ xem', 'platform', TRUE, 6),
  ('SALES_CSKH', 'Sales / CSKH', 'platform', TRUE, 7)
ON CONFLICT (role_key) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  role_scope = EXCLUDED.role_scope,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO platform.permissions(permission_key, permission_name, module_key, description) VALUES
  ('platform.dashboard.view', 'Xem dashboard platform', 'dashboard', 'Full new DB platform permission'),
  ('platform.business.view', 'Xem business', 'business', 'Full new DB platform permission'),
  ('platform.business.create', 'Tạo business', 'business', 'Full new DB platform permission'),
  ('platform.business.update', 'Sửa business', 'business', 'Full new DB platform permission'),
  ('platform.business.suspend', 'Khóa business', 'business', 'Full new DB platform permission'),
  ('platform.business.activate', 'Mở business', 'business', 'Full new DB platform permission'),
  ('platform.business.close', 'Đóng business', 'business', 'Full new DB platform permission'),
  ('platform.business.export', 'Xuất business', 'business', 'Full new DB platform permission'),
  ('platform.business.impersonate', 'Vào hỗ trợ business', 'business', 'Full new DB platform permission'),
  ('platform.account.view', 'Xem tài khoản', 'account', 'Full new DB platform permission'),
  ('platform.account.create', 'Tạo tài khoản', 'account', 'Full new DB platform permission'),
  ('platform.account.update', 'Sửa tài khoản', 'account', 'Full new DB platform permission'),
  ('platform.account.lock', 'Khóa tài khoản', 'account', 'Full new DB platform permission'),
  ('platform.account.reset_password', 'Reset mật khẩu', 'account', 'Full new DB platform permission'),
  ('platform.account.reset_mfa', 'Reset MFA', 'account', 'Full new DB platform permission'),
  ('platform.role.view', 'Xem role', 'rbac', 'Full new DB platform permission'),
  ('platform.role.create', 'Tạo role', 'rbac', 'Full new DB platform permission'),
  ('platform.role.update', 'Sửa role', 'rbac', 'Full new DB platform permission'),
  ('platform.role.delete', 'Xóa role', 'rbac', 'Full new DB platform permission'),
  ('platform.role.assign_permission', 'Gán quyền role', 'rbac', 'Full new DB platform permission'),
  ('platform.subscription.view', 'Xem subscription', 'subscription', 'Full new DB platform permission'),
  ('platform.subscription.change_plan', 'Đổi gói', 'subscription', 'Full new DB platform permission'),
  ('platform.subscription.renew', 'Gia hạn', 'subscription', 'Full new DB platform permission'),
  ('platform.subscription.cancel', 'Hủy gói', 'subscription', 'Full new DB platform permission'),
  ('platform.subscription.suspend', 'Tạm khóa subscription', 'subscription', 'Full new DB platform permission'),
  ('platform.billing.view', 'Xem billing', 'billing', 'Full new DB platform permission'),
  ('platform.billing.export', 'Xuất billing', 'billing', 'Full new DB platform permission'),
  ('platform.renewal_key.view', 'Xem mã gia hạn', 'billing', 'Full new DB platform permission'),
  ('platform.renewal_key.create', 'Tạo mã gia hạn', 'billing', 'Full new DB platform permission'),
  ('platform.renewal_key.revoke', 'Thu hồi mã gia hạn', 'billing', 'Full new DB platform permission'),
  ('platform.module.view', 'Xem module business', 'module', 'Full new DB platform permission'),
  ('platform.module.update', 'Bật/tắt module business', 'module', 'Full new DB platform permission'),
  ('platform.device.view', 'Xem thiết bị', 'device', 'Full new DB platform permission'),
  ('platform.device.trust', 'Tin cậy thiết bị', 'device', 'Full new DB platform permission'),
  ('platform.device.block', 'Chặn thiết bị', 'device', 'Full new DB platform permission'),
  ('platform.api_client.view', 'Xem API client', 'integration', 'Full new DB platform permission'),
  ('platform.api_client.create', 'Tạo API client', 'integration', 'Full new DB platform permission'),
  ('platform.api_client.update', 'Sửa API client', 'integration', 'Full new DB platform permission'),
  ('platform.api_client.revoke', 'Thu hồi API client', 'integration', 'Full new DB platform permission'),
  ('platform.webhook.view', 'Xem webhook', 'integration', 'Full new DB platform permission'),
  ('platform.webhook.create', 'Tạo webhook', 'integration', 'Full new DB platform permission'),
  ('platform.webhook.update', 'Sửa webhook', 'integration', 'Full new DB platform permission'),
  ('platform.webhook.delete', 'Xóa webhook', 'integration', 'Full new DB platform permission'),
  ('platform.support_ticket.view', 'Xem ticket', 'support', 'Full new DB platform permission'),
  ('platform.support_ticket.update', 'Cập nhật ticket', 'support', 'Full new DB platform permission'),
  ('platform.support_ticket.assign', 'Gán ticket', 'support', 'Full new DB platform permission'),
  ('platform.support_ticket.close', 'Đóng ticket', 'support', 'Full new DB platform permission'),
  ('platform.impersonation.view', 'Xem phiên hỗ trợ', 'support', 'Full new DB platform permission'),
  ('platform.impersonation.start', 'Bắt đầu hỗ trợ business', 'support', 'Full new DB platform permission'),
  ('platform.impersonation.end', 'Kết thúc hỗ trợ business', 'support', 'Full new DB platform permission'),
  ('platform.audit.view', 'Xem audit', 'audit', 'Full new DB platform permission'),
  ('platform.audit.export', 'Xuất audit', 'audit', 'Full new DB platform permission'),
  ('platform.system_setting.view', 'Xem cấu hình hệ thống', 'setting', 'Full new DB platform permission'),
  ('platform.system_setting.update', 'Sửa cấu hình hệ thống', 'setting', 'Full new DB platform permission'),
  ('platform.usage.view', 'Xem usage', 'usage', 'Full new DB platform permission'),
  ('platform.invoice.view', 'Xem hóa đơn platform', 'platform_billing', 'Full new DB platform permission'),
  ('platform.invoice.create', 'Tạo hóa đơn platform', 'platform_billing', 'Full new DB platform permission'),
  ('platform.invoice.mark_paid', 'Đánh dấu đã thanh toán', 'platform_billing', 'Full new DB platform permission'),
  ('platform.invoice.cancel', 'Hủy hóa đơn platform', 'platform_billing', 'Full new DB platform permission')
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  module_key = EXCLUDED.module_key,
  description = EXCLUDED.description,
  updated_at = NOW();

-- PLATFORM_OWNER + PLATFORM_ADMIN: all platform permissions
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM platform.roles r
JOIN platform.permissions p ON TRUE
WHERE r.role_key IN ('PLATFORM_OWNER','PLATFORM_ADMIN')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Billing role
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view','platform.business.view','platform.subscription.view','platform.subscription.change_plan','platform.subscription.renew','platform.subscription.cancel','platform.subscription.suspend','platform.billing.view','platform.billing.export','platform.renewal_key.view','platform.renewal_key.create','platform.renewal_key.revoke','platform.usage.view','platform.invoice.view','platform.invoice.create','platform.invoice.mark_paid','platform.invoice.cancel','platform.audit.view'
]) WHERE r.role_key = 'BILLING_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Support role
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view','platform.business.view','platform.account.view','platform.device.view','platform.support_ticket.view','platform.support_ticket.update','platform.support_ticket.assign','platform.support_ticket.close','platform.impersonation.view','platform.impersonation.start','platform.impersonation.end','platform.audit.view'
]) WHERE r.role_key = 'SUPPORT_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Tech ops role
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view','platform.business.view','platform.device.view','platform.device.trust','platform.device.block','platform.api_client.view','platform.api_client.create','platform.api_client.update','platform.api_client.revoke','platform.webhook.view','platform.webhook.create','platform.webhook.update','platform.webhook.delete','platform.audit.view','platform.system_setting.view'
]) WHERE r.role_key = 'TECH_OPS'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Auditor role
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r JOIN platform.permissions p ON p.permission_key LIKE '%.view' OR p.permission_key LIKE '%.export'
WHERE r.role_key = 'AUDITOR'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Sales/CSKH role
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view','platform.business.view','platform.account.view','platform.subscription.view','platform.billing.view','platform.support_ticket.view','platform.support_ticket.update'
]) WHERE r.role_key = 'SALES_CSKH'
ON CONFLICT (role_id, permission_id) DO NOTHING;



-- =====================================================================
-- FULL TENANT RBAC/PERMISSION SEED FOR NEW DATABASE
-- Run with: psql -v business_schema=business_template -f this_file.sql
-- =====================================================================
SELECT set_config('search_path', 'business_template, platform, public', false);

INSERT INTO permissions(permission_key, permission_name, module_key) VALUES
  ('pos.enter', 'Vào POS', 'pos'),
  ('pos.open_register', 'Mở quầy POS', 'pos'),
  ('receipt.print', 'In hóa đơn', 'pos'),
  ('shift.open', 'Mở ca', 'shift'),
  ('shift.close', 'Đóng ca', 'shift'),
  ('shift.view', 'Xem ca', 'shift'),
  ('order.view', 'Xem đơn hàng', 'order'),
  ('order.create', 'Tạo đơn hàng', 'order'),
  ('order.update_draft', 'Sửa đơn nháp', 'order'),
  ('order.cancel', 'Hủy đơn', 'order'),
  ('order.void', 'Void đơn', 'order'),
  ('order.complete', 'Hoàn tất đơn', 'order'),
  ('order.discount.apply', 'Áp giảm giá', 'order'),
  ('order.price.override', 'Sửa giá tại POS', 'order'),
  ('order.sell_on_credit', 'Bán công nợ', 'order'),
  ('order.credit_override', 'Vượt hạn mức công nợ', 'order'),
  ('order.return', 'Trả hàng', 'order'),
  ('order.exchange', 'Đổi hàng', 'order'),
  ('order.split_bill', 'Tách bill', 'order'),
  ('order.merge_table', 'Gộp bàn', 'order'),
  ('order.move_table', 'Chuyển bàn', 'order'),
  ('payment.view', 'Xem thanh toán', 'payment'),
  ('payment.process', 'Xử lý thanh toán', 'payment'),
  ('payment.partial', 'Thanh toán một phần', 'payment'),
  ('payment.cash', 'Thanh toán tiền mặt', 'payment'),
  ('payment.bank_transfer', 'Thanh toán chuyển khoản', 'payment'),
  ('payment.card', 'Thanh toán thẻ', 'payment'),
  ('payment.e_wallet', 'Thanh toán ví', 'payment'),
  ('payment.voucher', 'Thanh toán voucher', 'payment'),
  ('payment.point', 'Thanh toán điểm', 'payment'),
  ('payment.refund', 'Hoàn tiền', 'payment'),
  ('payment.refund_override', 'Hoàn tiền vượt chính sách', 'payment'),
  ('payment.reconcile', 'Đối soát thanh toán', 'payment'),
  ('receivable.view', 'Xem công nợ KH', 'receivable'),
  ('receivable.create', 'Tạo công nợ KH', 'receivable'),
  ('receivable.collect', 'Thu công nợ KH', 'receivable'),
  ('receivable.adjust', 'Điều chỉnh công nợ KH', 'receivable'),
  ('receivable.write_off', 'Xóa nợ/xử lý nợ xấu', 'receivable'),
  ('receivable.export', 'Xuất công nợ', 'receivable'),
  ('store.view', 'Xem cửa hàng', 'store'),
  ('store.create', 'Tạo cửa hàng', 'store'),
  ('store.update', 'Sửa cửa hàng', 'store'),
  ('store.disable', 'Tắt cửa hàng', 'store'),
  ('store.config.update', 'Sửa cấu hình cửa hàng', 'store'),
  ('store.device.bind', 'Gán thiết bị POS', 'store'),
  ('staff.view', 'Xem nhân viên', 'staff'),
  ('staff.create', 'Tạo nhân viên', 'staff'),
  ('staff.update', 'Sửa nhân viên', 'staff'),
  ('staff.disable', 'Khóa nhân viên', 'staff'),
  ('staff.assign_store', 'Gán nhân viên vào store', 'staff'),
  ('staff.assign_role', 'Gán quyền nhân viên', 'staff'),
  ('staff.reset_pin', 'Reset PIN', 'staff'),
  ('staff.salary.view', 'Xem lương', 'staff'),
  ('staff.salary.update', 'Sửa lương', 'staff'),
  ('role.view', 'Xem role', 'rbac'),
  ('role.create', 'Tạo role', 'rbac'),
  ('role.update', 'Sửa role', 'rbac'),
  ('role.assign_permission', 'Gán permission', 'rbac'),
  ('product.view', 'Xem sản phẩm', 'product'),
  ('product.create', 'Tạo sản phẩm', 'product'),
  ('product.update', 'Sửa sản phẩm', 'product'),
  ('product.delete', 'Xóa sản phẩm', 'product'),
  ('product.import', 'Import sản phẩm', 'product'),
  ('product.export', 'Export sản phẩm', 'product'),
  ('product.price.update', 'Sửa giá bán', 'product'),
  ('product.cost.update', 'Sửa giá vốn', 'product'),
  ('product.barcode.manage', 'Quản lý barcode', 'product'),
  ('product.recipe.manage', 'Quản lý recipe/BOM', 'product'),
  ('product.lot.manage', 'Quản lý lô/hạn sử dụng', 'product'),
  ('product.serial.manage', 'Quản lý serial/IMEI', 'product'),
  ('product.media.manage', 'Quản lý media sản phẩm', 'product'),
  ('promotion.view', 'Xem khuyến mãi', 'promotion'),
  ('promotion.create', 'Tạo khuyến mãi', 'promotion'),
  ('promotion.update', 'Sửa khuyến mãi', 'promotion'),
  ('promotion.delete', 'Xóa khuyến mãi', 'promotion'),
  ('inventory.view', 'Xem tồn kho', 'inventory'),
  ('inventory.view_cost', 'Xem giá trị tồn kho', 'inventory'),
  ('inventory.reserve', 'Giữ hàng', 'inventory'),
  ('inventory.deduct', 'Trừ kho', 'inventory'),
  ('inventory.adjust', 'Điều chỉnh kho', 'inventory'),
  ('inventory.transfer', 'Chuyển kho', 'inventory'),
  ('inventory.transfer.approve', 'Duyệt chuyển kho', 'inventory'),
  ('inventory.stocktake', 'Kiểm kho', 'inventory'),
  ('inventory.stocktake.approve', 'Chốt kiểm kho', 'inventory'),
  ('inventory.transaction.view', 'Xem lịch sử kho', 'inventory'),
  ('inventory.costing.view', 'Xem costing', 'inventory'),
  ('inventory.costing.adjust', 'Điều chỉnh costing', 'inventory'),
  ('purchase.view', 'Xem đơn nhập', 'purchase'),
  ('purchase.create', 'Tạo đơn nhập', 'purchase'),
  ('purchase.receive', 'Nhận hàng', 'purchase'),
  ('purchase.cancel', 'Hủy đơn nhập', 'purchase'),
  ('purchase.return', 'Trả hàng NCC', 'purchase'),
  ('purchase.payable.view', 'Xem công nợ NCC', 'purchase'),
  ('purchase.payment.process', 'Thanh toán NCC', 'purchase'),
  ('supplier.view', 'Xem NCC', 'supplier'),
  ('supplier.create', 'Tạo NCC', 'supplier'),
  ('supplier.update', 'Sửa NCC', 'supplier'),
  ('supplier.disable', 'Khóa NCC', 'supplier'),
  ('customer.view', 'Xem khách hàng', 'customer'),
  ('customer.create', 'Tạo khách hàng', 'customer'),
  ('customer.update', 'Sửa khách hàng', 'customer'),
  ('customer.disable', 'Khóa khách hàng', 'customer'),
  ('customer.merge', 'Gộp khách hàng', 'customer'),
  ('customer.export', 'Xuất khách hàng', 'customer'),
  ('customer.point.adjust', 'Điều chỉnh điểm', 'customer'),
  ('customer.consent.update', 'Sửa consent', 'customer'),
  ('customer.campaign.manage', 'Quản lý chiến dịch', 'customer'),
  ('loyalty.view', 'Xem loyalty', 'loyalty'),
  ('loyalty.manage', 'Quản lý loyalty', 'loyalty'),
  ('wallet.view', 'Xem ví khách hàng', 'wallet'),
  ('wallet.adjust', 'Điều chỉnh ví khách hàng', 'wallet'),
  ('report.sales.view', 'Xem báo cáo doanh thu', 'report'),
  ('report.inventory.view', 'Xem báo cáo kho', 'report'),
  ('report.profit.view', 'Xem báo cáo lợi nhuận', 'report'),
  ('report.staff.view', 'Xem báo cáo nhân viên', 'report'),
  ('report.export', 'Xuất báo cáo', 'report'),
  ('report.cost_profit.view', 'Xem giá vốn/lợi nhuận', 'report'),
  ('invoice.view', 'Xem hóa đơn', 'invoice'),
  ('invoice.create', 'Tạo hóa đơn', 'invoice'),
  ('invoice.cancel', 'Hủy hóa đơn', 'invoice'),
  ('invoice.credit_note.create', 'Tạo credit note', 'invoice'),
  ('cash.view', 'Xem quỹ', 'cash'),
  ('cash.movement.create', 'Tạo giao dịch quỹ', 'cash'),
  ('cash.drawer.count', 'Đếm két', 'cash'),
  ('cash.drawer.reconcile', 'Đối soát két', 'cash'),
  ('cash.bank_deposit', 'Nộp tiền ngân hàng', 'cash'),
  ('finance.view', 'Xem tài chính', 'finance'),
  ('finance.journal.post', 'Ghi bút toán', 'finance'),
  ('finance.period.lock', 'Khóa kỳ', 'finance'),
  ('finance.period.reopen', 'Mở lại kỳ', 'finance'),
  ('setting.view', 'Xem cấu hình', 'setting'),
  ('setting.update', 'Sửa cấu hình', 'setting'),
  ('activity_log.view', 'Xem log hoạt động', 'audit'),
  ('approval.view', 'Xem yêu cầu duyệt', 'approval'),
  ('approval.approve', 'Duyệt yêu cầu', 'approval'),
  ('approval.reject', 'Từ chối yêu cầu', 'approval'),
  ('notification.view', 'Xem thông báo', 'notification'),
  ('notification.send', 'Gửi thông báo', 'notification'),
  ('channel.view', 'Xem kênh bán', 'channel'),
  ('channel.manage', 'Quản lý kênh bán', 'channel'),
  ('channel.sync', 'Đồng bộ kênh bán', 'channel'),
  ('shipping.view', 'Xem vận chuyển', 'shipping'),
  ('shipping.create', 'Tạo shipment', 'shipping'),
  ('shipping.update', 'Cập nhật shipment', 'shipping'),
  ('shipping.cod_reconcile', 'Đối soát COD', 'shipping'),
  ('service.view', 'Xem dịch vụ/bảo hành', 'service'),
  ('service.manage', 'Quản lý dịch vụ/bảo hành', 'service'),
  ('warranty.claim.process', 'Xử lý bảo hành', 'service'),
  ('production.view', 'Xem sản xuất/bếp', 'production'),
  ('production.manage', 'Quản lý sản xuất/bếp', 'production'),
  ('waste.create', 'Ghi nhận hao hụt', 'production'),
  ('kitchen.view', 'Xem bếp', 'kitchen'),
  ('kitchen.update', 'Cập nhật trạng thái bếp', 'kitchen'),
  ('table.view', 'Xem bàn', 'table'),
  ('table.manage', 'Quản lý bàn', 'table')
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  module_key = EXCLUDED.module_key,
  updated_at = NOW();

INSERT INTO permission_definitions(permission_key, scope_type, module_key, screen_key, button_key, action_key, permission_name, description, risk_level, require_reason, require_mfa) VALUES
  ('pos.enter', 'business', 'pos', 'pos', 'None', 'enter', 'Vào POS', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('pos.open_register', 'business', 'pos', 'pos', 'None', 'open_register', 'Mở quầy POS', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('receipt.print', 'business', 'pos', 'receipt', 'None', 'print', 'In hóa đơn', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('shift.open', 'business', 'shift', 'shift', 'None', 'open', 'Mở ca', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('shift.close', 'business', 'shift', 'shift', 'None', 'close', 'Đóng ca', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('shift.view', 'business', 'shift', 'shift', 'None', 'view', 'Xem ca', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('order.view', 'business', 'order', 'order', 'None', 'view', 'Xem đơn hàng', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('order.create', 'business', 'order', 'order', 'None', 'create', 'Tạo đơn hàng', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('order.update_draft', 'business', 'order', 'order', 'None', 'update_draft', 'Sửa đơn nháp', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('order.cancel', 'business', 'order', 'order', 'None', 'cancel', 'Hủy đơn', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('order.void', 'business', 'order', 'order', 'None', 'void', 'Void đơn', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('order.complete', 'business', 'order', 'order', 'None', 'complete', 'Hoàn tất đơn', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('order.discount.apply', 'business', 'order', 'order', 'None', 'discount_apply', 'Áp giảm giá', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('order.price.override', 'business', 'order', 'order', 'None', 'price_override', 'Sửa giá tại POS', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('order.sell_on_credit', 'business', 'order', 'order', 'None', 'sell_on_credit', 'Bán công nợ', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('order.credit_override', 'business', 'order', 'order', 'None', 'credit_override', 'Vượt hạn mức công nợ', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('order.return', 'business', 'order', 'order', 'None', 'return', 'Trả hàng', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('order.exchange', 'business', 'order', 'order', 'None', 'exchange', 'Đổi hàng', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('order.split_bill', 'business', 'order', 'order', 'None', 'split_bill', 'Tách bill', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('order.merge_table', 'business', 'order', 'table', 'None', 'merge_table', 'Gộp bàn', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('order.move_table', 'business', 'order', 'table', 'None', 'move_table', 'Chuyển bàn', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('payment.view', 'business', 'payment', 'payment', 'None', 'view', 'Xem thanh toán', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('payment.process', 'business', 'payment', 'payment', 'None', 'process', 'Xử lý thanh toán', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('payment.partial', 'business', 'payment', 'payment', 'None', 'partial', 'Thanh toán một phần', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('payment.cash', 'business', 'payment', 'payment', 'None', 'cash', 'Thanh toán tiền mặt', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('payment.bank_transfer', 'business', 'payment', 'payment', 'None', 'bank_transfer', 'Thanh toán chuyển khoản', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('payment.card', 'business', 'payment', 'payment', 'None', 'card', 'Thanh toán thẻ', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('payment.e_wallet', 'business', 'payment', 'payment', 'None', 'e_wallet', 'Thanh toán ví', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('payment.voucher', 'business', 'payment', 'payment', 'None', 'voucher', 'Thanh toán voucher', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('payment.point', 'business', 'payment', 'payment', 'None', 'point', 'Thanh toán điểm', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('payment.refund', 'business', 'payment', 'payment', 'None', 'refund', 'Hoàn tiền', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('payment.refund_override', 'business', 'payment', 'payment', 'None', 'refund_override', 'Hoàn tiền vượt chính sách', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('payment.reconcile', 'business', 'payment', 'payment', 'None', 'reconcile', 'Đối soát thanh toán', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('receivable.view', 'business', 'receivable', 'receivable', 'None', 'view', 'Xem công nợ KH', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('receivable.create', 'business', 'receivable', 'receivable', 'None', 'create', 'Tạo công nợ KH', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('receivable.collect', 'business', 'receivable', 'receivable', 'None', 'collect', 'Thu công nợ KH', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('receivable.adjust', 'business', 'receivable', 'receivable', 'None', 'adjust', 'Điều chỉnh công nợ KH', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('receivable.write_off', 'business', 'receivable', 'receivable', 'None', 'write_off', 'Xóa nợ/xử lý nợ xấu', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('receivable.export', 'business', 'receivable', 'receivable', 'None', 'export', 'Xuất công nợ', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('store.view', 'business', 'store', 'store', 'None', 'view', 'Xem cửa hàng', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('store.create', 'business', 'store', 'store', 'None', 'create', 'Tạo cửa hàng', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('store.update', 'business', 'store', 'store', 'None', 'update', 'Sửa cửa hàng', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('store.disable', 'business', 'store', 'store', 'None', 'disable', 'Tắt cửa hàng', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('store.config.update', 'business', 'store', 'store', 'None', 'config_update', 'Sửa cấu hình cửa hàng', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('store.device.bind', 'business', 'store', 'device', 'None', 'bind', 'Gán thiết bị POS', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('staff.view', 'business', 'staff', 'staff', 'None', 'view', 'Xem nhân viên', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('staff.create', 'business', 'staff', 'staff', 'None', 'create', 'Tạo nhân viên', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('staff.update', 'business', 'staff', 'staff', 'None', 'update', 'Sửa nhân viên', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('staff.disable', 'business', 'staff', 'staff', 'None', 'disable', 'Khóa nhân viên', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('staff.assign_store', 'business', 'staff', 'staff', 'None', 'assign_store', 'Gán nhân viên vào store', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('staff.assign_role', 'business', 'staff', 'staff', 'None', 'assign_role', 'Gán quyền nhân viên', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('staff.reset_pin', 'business', 'staff', 'staff', 'None', 'reset_pin', 'Reset PIN', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('staff.salary.view', 'business', 'staff', 'staff', 'None', 'salary_view', 'Xem lương', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('staff.salary.update', 'business', 'staff', 'staff', 'None', 'salary_update', 'Sửa lương', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('role.view', 'business', 'rbac', 'role', 'None', 'view', 'Xem role', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('role.create', 'business', 'rbac', 'role', 'None', 'create', 'Tạo role', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('role.update', 'business', 'rbac', 'role', 'None', 'update', 'Sửa role', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('role.assign_permission', 'business', 'rbac', 'role', 'None', 'assign_permission', 'Gán permission', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('product.view', 'business', 'product', 'product', 'None', 'view', 'Xem sản phẩm', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('product.create', 'business', 'product', 'product', 'None', 'create', 'Tạo sản phẩm', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('product.update', 'business', 'product', 'product', 'None', 'update', 'Sửa sản phẩm', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('product.delete', 'business', 'product', 'product', 'None', 'delete', 'Xóa sản phẩm', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('product.import', 'business', 'product', 'product', 'None', 'import', 'Import sản phẩm', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('product.export', 'business', 'product', 'product', 'None', 'export', 'Export sản phẩm', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('product.price.update', 'business', 'product', 'product', 'None', 'price_update', 'Sửa giá bán', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('product.cost.update', 'business', 'product', 'product', 'None', 'cost_update', 'Sửa giá vốn', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('product.barcode.manage', 'business', 'product', 'product', 'None', 'barcode_manage', 'Quản lý barcode', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('product.recipe.manage', 'business', 'product', 'product', 'None', 'recipe_manage', 'Quản lý recipe/BOM', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('product.lot.manage', 'business', 'product', 'product', 'None', 'lot_manage', 'Quản lý lô/hạn sử dụng', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('product.serial.manage', 'business', 'product', 'product', 'None', 'serial_manage', 'Quản lý serial/IMEI', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('product.media.manage', 'business', 'product', 'product', 'None', 'media_manage', 'Quản lý media sản phẩm', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('promotion.view', 'business', 'promotion', 'promotion', 'None', 'view', 'Xem khuyến mãi', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('promotion.create', 'business', 'promotion', 'promotion', 'None', 'create', 'Tạo khuyến mãi', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('promotion.update', 'business', 'promotion', 'promotion', 'None', 'update', 'Sửa khuyến mãi', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('promotion.delete', 'business', 'promotion', 'promotion', 'None', 'delete', 'Xóa khuyến mãi', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('inventory.view', 'business', 'inventory', 'inventory', 'None', 'view', 'Xem tồn kho', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('inventory.view_cost', 'business', 'inventory', 'inventory', 'None', 'view_cost', 'Xem giá trị tồn kho', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('inventory.reserve', 'business', 'inventory', 'inventory', 'None', 'reserve', 'Giữ hàng', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('inventory.deduct', 'business', 'inventory', 'inventory', 'None', 'deduct', 'Trừ kho', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('inventory.adjust', 'business', 'inventory', 'inventory', 'None', 'adjust', 'Điều chỉnh kho', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('inventory.transfer', 'business', 'inventory', 'inventory', 'None', 'transfer', 'Chuyển kho', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('inventory.transfer.approve', 'business', 'inventory', 'inventory', 'None', 'transfer_approve', 'Duyệt chuyển kho', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('inventory.stocktake', 'business', 'inventory', 'inventory', 'None', 'stocktake', 'Kiểm kho', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('inventory.stocktake.approve', 'business', 'inventory', 'inventory', 'None', 'stocktake_approve', 'Chốt kiểm kho', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('inventory.transaction.view', 'business', 'inventory', 'inventory', 'None', 'transaction_view', 'Xem lịch sử kho', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('inventory.costing.view', 'business', 'inventory', 'inventory', 'None', 'costing_view', 'Xem costing', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('inventory.costing.adjust', 'business', 'inventory', 'inventory', 'None', 'costing_adjust', 'Điều chỉnh costing', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('purchase.view', 'business', 'purchase', 'purchase', 'None', 'view', 'Xem đơn nhập', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('purchase.create', 'business', 'purchase', 'purchase', 'None', 'create', 'Tạo đơn nhập', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('purchase.receive', 'business', 'purchase', 'purchase', 'None', 'receive', 'Nhận hàng', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('purchase.cancel', 'business', 'purchase', 'purchase', 'None', 'cancel', 'Hủy đơn nhập', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('purchase.return', 'business', 'purchase', 'purchase', 'None', 'return', 'Trả hàng NCC', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('purchase.payable.view', 'business', 'purchase', 'purchase', 'None', 'payable_view', 'Xem công nợ NCC', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('purchase.payment.process', 'business', 'purchase', 'purchase', 'None', 'payment_process', 'Thanh toán NCC', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('supplier.view', 'business', 'supplier', 'supplier', 'None', 'view', 'Xem NCC', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('supplier.create', 'business', 'supplier', 'supplier', 'None', 'create', 'Tạo NCC', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('supplier.update', 'business', 'supplier', 'supplier', 'None', 'update', 'Sửa NCC', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('supplier.disable', 'business', 'supplier', 'supplier', 'None', 'disable', 'Khóa NCC', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('customer.view', 'business', 'customer', 'customer', 'None', 'view', 'Xem khách hàng', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('customer.create', 'business', 'customer', 'customer', 'None', 'create', 'Tạo khách hàng', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('customer.update', 'business', 'customer', 'customer', 'None', 'update', 'Sửa khách hàng', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('customer.disable', 'business', 'customer', 'customer', 'None', 'disable', 'Khóa khách hàng', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('customer.merge', 'business', 'customer', 'customer', 'None', 'merge', 'Gộp khách hàng', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('customer.export', 'business', 'customer', 'customer', 'None', 'export', 'Xuất khách hàng', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('customer.point.adjust', 'business', 'customer', 'customer', 'None', 'point_adjust', 'Điều chỉnh điểm', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('customer.consent.update', 'business', 'customer', 'customer', 'None', 'consent_update', 'Sửa consent', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('customer.campaign.manage', 'business', 'customer', 'campaign', 'None', 'manage', 'Quản lý chiến dịch', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('loyalty.view', 'business', 'loyalty', 'loyalty', 'None', 'view', 'Xem loyalty', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('loyalty.manage', 'business', 'loyalty', 'loyalty', 'None', 'manage', 'Quản lý loyalty', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('wallet.view', 'business', 'wallet', 'wallet', 'None', 'view', 'Xem ví khách hàng', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('wallet.adjust', 'business', 'wallet', 'wallet', 'None', 'adjust', 'Điều chỉnh ví khách hàng', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('report.sales.view', 'business', 'report', 'report', 'None', 'sales_view', 'Xem báo cáo doanh thu', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('report.inventory.view', 'business', 'report', 'report', 'None', 'inventory_view', 'Xem báo cáo kho', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('report.profit.view', 'business', 'report', 'report', 'None', 'profit_view', 'Xem báo cáo lợi nhuận', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('report.staff.view', 'business', 'report', 'report', 'None', 'staff_view', 'Xem báo cáo nhân viên', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('report.export', 'business', 'report', 'report', 'None', 'export', 'Xuất báo cáo', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('report.cost_profit.view', 'business', 'report', 'report', 'None', 'cost_profit_view', 'Xem giá vốn/lợi nhuận', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('invoice.view', 'business', 'invoice', 'invoice', 'None', 'view', 'Xem hóa đơn', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('invoice.create', 'business', 'invoice', 'invoice', 'None', 'create', 'Tạo hóa đơn', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('invoice.cancel', 'business', 'invoice', 'invoice', 'None', 'cancel', 'Hủy hóa đơn', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('invoice.credit_note.create', 'business', 'invoice', 'invoice', 'None', 'credit_note_create', 'Tạo credit note', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('cash.view', 'business', 'cash', 'cash', 'None', 'view', 'Xem quỹ', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('cash.movement.create', 'business', 'cash', 'cash', 'None', 'movement_create', 'Tạo giao dịch quỹ', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('cash.drawer.count', 'business', 'cash', 'cash', 'None', 'drawer_count', 'Đếm két', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('cash.drawer.reconcile', 'business', 'cash', 'cash', 'None', 'drawer_reconcile', 'Đối soát két', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('cash.bank_deposit', 'business', 'cash', 'cash', 'None', 'bank_deposit', 'Nộp tiền ngân hàng', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('finance.view', 'business', 'finance', 'finance', 'None', 'view', 'Xem tài chính', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('finance.journal.post', 'business', 'finance', 'finance', 'None', 'journal_post', 'Ghi bút toán', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('finance.period.lock', 'business', 'finance', 'finance', 'None', 'period_lock', 'Khóa kỳ', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('finance.period.reopen', 'business', 'finance', 'finance', 'None', 'period_reopen', 'Mở lại kỳ', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('setting.view', 'business', 'setting', 'setting', 'None', 'view', 'Xem cấu hình', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('setting.update', 'business', 'setting', 'setting', 'None', 'update', 'Sửa cấu hình', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('activity_log.view', 'business', 'audit', 'audit', 'None', 'view', 'Xem log hoạt động', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('approval.view', 'business', 'approval', 'approval', 'None', 'view', 'Xem yêu cầu duyệt', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('approval.approve', 'business', 'approval', 'approval', 'None', 'approve', 'Duyệt yêu cầu', 'Full new DB business permission', 'critical', TRUE, TRUE),
  ('approval.reject', 'business', 'approval', 'approval', 'None', 'reject', 'Từ chối yêu cầu', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('notification.view', 'business', 'notification', 'notification', 'None', 'view', 'Xem thông báo', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('notification.send', 'business', 'notification', 'notification', 'None', 'send', 'Gửi thông báo', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('channel.view', 'business', 'channel', 'channel', 'None', 'view', 'Xem kênh bán', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('channel.manage', 'business', 'channel', 'channel', 'None', 'manage', 'Quản lý kênh bán', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('channel.sync', 'business', 'channel', 'channel', 'None', 'sync', 'Đồng bộ kênh bán', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('shipping.view', 'business', 'shipping', 'shipping', 'None', 'view', 'Xem vận chuyển', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('shipping.create', 'business', 'shipping', 'shipping', 'None', 'create', 'Tạo shipment', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('shipping.update', 'business', 'shipping', 'shipping', 'None', 'update', 'Cập nhật shipment', 'Full new DB business permission', 'medium', FALSE, FALSE),
  ('shipping.cod_reconcile', 'business', 'shipping', 'shipping', 'None', 'cod_reconcile', 'Đối soát COD', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('service.view', 'business', 'service', 'service', 'None', 'view', 'Xem dịch vụ/bảo hành', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('service.manage', 'business', 'service', 'service', 'None', 'manage', 'Quản lý dịch vụ/bảo hành', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('warranty.claim.process', 'business', 'service', 'warranty', 'None', 'claim_process', 'Xử lý bảo hành', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('production.view', 'business', 'production', 'production', 'None', 'view', 'Xem sản xuất/bếp', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('production.manage', 'business', 'production', 'production', 'None', 'manage', 'Quản lý sản xuất/bếp', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('waste.create', 'business', 'production', 'waste', 'None', 'create', 'Ghi nhận hao hụt', 'Full new DB business permission', 'high', TRUE, FALSE),
  ('kitchen.view', 'business', 'kitchen', 'kitchen', 'None', 'view', 'Xem bếp', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('kitchen.update', 'business', 'kitchen', 'kitchen', 'None', 'update', 'Cập nhật trạng thái bếp', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('table.view', 'business', 'table', 'table', 'None', 'view', 'Xem bàn', 'Full new DB business permission', 'low', FALSE, FALSE),
  ('table.manage', 'business', 'table', 'table', 'None', 'manage', 'Quản lý bàn', 'Full new DB business permission', 'medium', FALSE, FALSE)
ON CONFLICT (permission_key) DO UPDATE SET
  scope_type = EXCLUDED.scope_type,
  module_key = EXCLUDED.module_key,
  screen_key = EXCLUDED.screen_key,
  button_key = EXCLUDED.button_key,
  action_key = EXCLUDED.action_key,
  permission_name = EXCLUDED.permission_name,
  description = EXCLUDED.description,
  risk_level = EXCLUDED.risk_level,
  require_reason = EXCLUDED.require_reason,
  require_mfa = EXCLUDED.require_mfa;

-- OWNER and ADMIN get all business permissions
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON TRUE
WHERE r.role_key IN ('OWNER','ADMIN')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CASHIER default permissions
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.permission_key = ANY(ARRAY[
  'pos.enter','receipt.print','shift.view','shift.open','shift.close','order.view','order.create','order.update_draft','order.complete','order.discount.apply','payment.view','payment.process','payment.partial','payment.cash','payment.bank_transfer','payment.card','payment.e_wallet','payment.voucher','payment.point','customer.view','customer.create','customer.update','product.view','inventory.view','table.view','kitchen.view'
]) WHERE r.role_key = 'CASHIER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- INVENTORY default permissions
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.permission_key = ANY(ARRAY[
  'product.view','inventory.view','inventory.view_cost','inventory.reserve','inventory.adjust','inventory.transfer','inventory.stocktake','inventory.transaction.view','purchase.view','purchase.create','purchase.receive','purchase.return','supplier.view','supplier.create','supplier.update','report.inventory.view','activity_log.view'
]) WHERE r.role_key = 'INVENTORY'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- KITCHEN default permissions
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.permission_key = ANY(ARRAY[
  'kitchen.view','kitchen.update','order.view','table.view','production.view','waste.create'
]) WHERE r.role_key = 'KITCHEN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- DELIVERY default permissions
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.permission_key = ANY(ARRAY[
  'shipping.view','shipping.update','order.view','customer.view','payment.cash','receivable.collect'
]) WHERE r.role_key = 'DELIVERY'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- STAFF default permissions
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.permission_key = ANY(ARRAY[
  'product.view','customer.view','order.view','inventory.view','activity_log.view'
]) WHERE r.role_key = 'STAFF'
ON CONFLICT (role_id, permission_id) DO NOTHING;



-- =====================================================================
-- NEW-DATABASE TENANT REGISTRATION FUNCTION
-- This function registers a business metadata record only.
-- Tenant schema creation is handled by 02_CREATE_BUSINESS_SCHEMA_FULL.sql.
-- =====================================================================
SET search_path TO platform, public;

CREATE OR REPLACE FUNCTION platform.fn_register_tenant(
  p_business_code VARCHAR,
  p_legal_name VARCHAR,
  p_brand_name VARCHAR DEFAULT NULL,
  p_email VARCHAR DEFAULT NULL,
  p_phone VARCHAR DEFAULT NULL,
  p_plan VARCHAR DEFAULT 'standard',
  p_timezone VARCHAR DEFAULT 'Asia/Ho_Chi_Minh',
  p_status VARCHAR DEFAULT 'trial'
) RETURNS TABLE(business_id UUID, schema_name VARCHAR, business_code VARCHAR)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_schema VARCHAR := 'tenant_' || p_business_code;
  v_id UUID;
BEGIN
  IF p_business_code !~ '^[a-z0-9_]{3,50}$' THEN
    RAISE EXCEPTION 'business_code không hợp lệ: %', p_business_code;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata s WHERE s.schema_name = v_schema) THEN
    RAISE EXCEPTION 'Schema % chưa tồn tại. Hãy chạy 02_CREATE_BUSINESS_SCHEMA_FULL.sql trước.', v_schema;
  END IF;
  INSERT INTO platform.businesses(
    business_code, schema_name, legal_name, brand_name, email, phone,
    subscription_plan, timezone_name, status
  ) VALUES (
    p_business_code, v_schema, p_legal_name, p_brand_name, p_email, p_phone,
    COALESCE(p_plan, 'standard'), COALESCE(p_timezone, 'Asia/Ho_Chi_Minh'), COALESCE(p_status, 'trial')
  )
  ON CONFLICT (business_code) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    brand_name = EXCLUDED.brand_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    subscription_plan = EXCLUDED.subscription_plan,
    timezone_name = EXCLUDED.timezone_name,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_schema, p_business_code;
END;
$$;




-- =====================================================================
-- TENANT HARDENING CONSTRAINTS / INDEXES FOR NEW DATABASE
-- =====================================================================
SELECT set_config('search_path', 'business_template, platform, public', false);

-- Unique business codes
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_members_staff_code ON staff_members(staff_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_customer_code ON customers(customer_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_supplier_code ON suppliers(supplier_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_orders_order_code ON sales_orders(order_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_po_code ON purchase_orders(po_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_transfers_transfer_code ON stock_transfers(transfer_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stocktakes_stocktake_code ON stocktakes(stocktake_code) WHERE stocktake_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_registers_store_code ON registers(store_id, register_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_locations_store_code ON stock_locations(store_id, location_code);

-- Nullable variant-safe unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_balances_no_variant
ON stock_balances(location_id, product_id, unit_name)
WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_balances_with_variant
ON stock_balances(location_id, product_id, variant_id, unit_name)
WHERE variant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_price_book_items_no_variant
ON price_book_items(price_book_id, product_id, min_qty)
WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_price_book_items_with_variant
ON price_book_items(price_book_id, product_id, variant_id, min_qty)
WHERE variant_id IS NOT NULL;

-- Core positive amount/quantity checks
ALTER TABLE sales_order_lines DROP CONSTRAINT IF EXISTS chk_sol_quantity_positive;
ALTER TABLE sales_order_lines ADD CONSTRAINT chk_sol_quantity_positive CHECK (quantity > 0);
ALTER TABLE order_payments DROP CONSTRAINT IF EXISTS chk_order_payment_amount_positive;
ALTER TABLE order_payments ADD CONSTRAINT chk_order_payment_amount_positive CHECK (amount > 0);
ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS chk_stock_txn_quantity_positive;
ALTER TABLE stock_transactions ADD CONSTRAINT chk_stock_txn_quantity_positive CHECK (quantity > 0);
ALTER TABLE cash_transactions DROP CONSTRAINT IF EXISTS chk_cash_txn_amount_positive;
ALTER TABLE cash_transactions ADD CONSTRAINT chk_cash_txn_amount_positive CHECK (amount > 0);
ALTER TABLE purchase_order_lines DROP CONSTRAINT IF EXISTS chk_po_line_qty_nonnegative;
ALTER TABLE purchase_order_lines ADD CONSTRAINT chk_po_line_qty_nonnegative CHECK (ordered_qty >= 0 AND received_qty >= 0);
ALTER TABLE stock_transfer_items DROP CONSTRAINT IF EXISTS chk_transfer_item_qty_nonnegative;
ALTER TABLE stock_transfer_items ADD CONSTRAINT chk_transfer_item_qty_nonnegative CHECK (requested_qty >= 0 AND shipped_qty >= 0 AND received_qty >= 0);

-- Helpful hot-path indexes
CREATE INDEX IF NOT EXISTS idx_order_payments_order_status ON order_payments(order_id, status);
CREATE INDEX IF NOT EXISTS idx_order_payments_transaction_ref ON order_payments(transaction_ref) WHERE transaction_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_txn_store_created ON stock_transactions(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_txn_location_product_variant_created ON stock_transactions(location_id, product_id, variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_account_created ON activity_logs(account_id, created_at DESC) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_staff_created ON activity_logs(staff_id, created_at DESC) WHERE staff_id IS NOT NULL;



-- Nullable-scope safe RBAC and product indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_role_bindings_tenant_scope
ON staff_role_bindings(staff_id, role_id)
WHERE store_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_role_bindings_store_scope
ON staff_role_bindings(staff_id, role_id, store_id)
WHERE store_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_store_settings_no_variant
ON product_store_settings(store_id, product_id)
WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_store_settings_with_variant
ON product_store_settings(store_id, product_id, variant_id)
WHERE variant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_lots_no_variant
ON product_lots(product_id, lot_code)
WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_lots_with_variant
ON product_lots(product_id, variant_id, lot_code)
WHERE variant_id IS NOT NULL;
COMMIT;
