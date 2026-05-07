
-- Sổ giao dịch khách hàng (chi tiêu + điểm)
CREATE TABLE IF NOT EXISTS customer_ledgers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID          NOT NULL REFERENCES customers(id),
  store_id     UUID                   REFERENCES stores(id),
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
  order_id        UUID         REFERENCES sales_orders(id),  -- Liên kết đơn hàng khi thanh toán
  appt_code       VARCHAR(50)  NOT NULL,
  appt_date       DATE         NOT NULL,
  start_time      TIMESTAMPTZ  NOT NULL,
  end_time        TIMESTAMPTZ  NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
  staff_id        UUID         REFERENCES staff_members(id),
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
  variant_id        UUID                   REFERENCES product_variants(id),
  staff_id          UUID                   REFERENCES staff_members(id),
  quantity          NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price        NUMERIC(18,4) NOT NULL,
  duration_mins     INTEGER,
  note              TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);