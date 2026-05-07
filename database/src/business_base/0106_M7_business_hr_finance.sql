
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
  store_id      UUID         REFERENCES stores(id),
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
  store_id        UUID         REFERENCES stores(id),
  bank_master_id  UUID         REFERENCES platform.bank_master(id),
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