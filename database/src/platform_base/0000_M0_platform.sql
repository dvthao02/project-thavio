-- ════════════════════════════════════════════════════════════════
-- MODULE 0-A: EXTENSIONS + PLATFORM SCHEMA
-- Chạy với user superuser (dvthao) 
-- ════════════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS platform;

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

INSERT INTO platform.businesses (business_code,schema_name,legal_name,brand_name,subscription_plan,status) VALUES
  ('acafe',   'business_acafe',   'ACafe Demo Company', 'ACafe',    'pro',        'active'),
  ('bar97',   'business_bar97',   'Bar 97 Co.,Ltd',     'Bar 97',   'standard',   'active'),
  ('phohai',  'business_phohai',  'Pho Hai Co.,Ltd',    'Pho Hai',  'standard',   'trial'),
  ('phuclong','business_phuclong','Phuc Long Corp',      'Phuc Long','enterprise', 'trial')
ON CONFLICT DO NOTHING;

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
