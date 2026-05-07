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
