
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
  table_id        UUID          REFERENCES dining_tables(id),
  table_name      VARCHAR(100),  -- Snapshot tên bàn tại thời điểm bán (giữ history khi đổi tên bàn)
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
  variant_id      UUID                   REFERENCES product_variants(id),
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