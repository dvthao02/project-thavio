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
