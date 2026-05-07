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
