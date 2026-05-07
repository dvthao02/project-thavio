
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