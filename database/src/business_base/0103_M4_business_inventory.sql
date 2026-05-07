
-- Tồn kho (aggregated balance per product/location/variant/unit)
CREATE TABLE IF NOT EXISTS stock_balances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID          NOT NULL REFERENCES stock_locations(id),
  product_id  UUID          NOT NULL REFERENCES products(id),
  variant_id  UUID                   REFERENCES product_variants(id),
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
  variant_id   UUID                   REFERENCES product_variants(id),
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
  price_book_id UUID          NOT NULL REFERENCES price_books(id) ON DELETE CASCADE,
  product_id    UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id    UUID                   REFERENCES product_variants(id) ON DELETE CASCADE,
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
  variant_id   UUID                   REFERENCES product_variants(id),
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
  variant_id   UUID                   REFERENCES product_variants(id),
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
  CONSTRAINT chk_transfer_status CHECK (status = ANY(ARRAY['pending','approved','shipped','received','cancelled'])),
  CONSTRAINT chk_transfer_locations_distinct CHECK (from_location_id <> to_location_id)
);

-- Dòng chuyển kho
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id   UUID          NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id    UUID          NOT NULL REFERENCES products(id),
  variant_id    UUID                   REFERENCES product_variants(id),
  unit_name     VARCHAR(50)   NOT NULL,
  requested_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  shipped_qty   NUMERIC(12,3) NOT NULL DEFAULT 0,
  received_qty  NUMERIC(12,3) NOT NULL DEFAULT 0,
  note          TEXT
);

-- Quy tắc tồn kho (cảnh báo tự động)
CREATE TABLE IF NOT EXISTS stock_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id   UUID                   REFERENCES stock_locations(id) ON DELETE CASCADE,
  min_stock     NUMERIC(12,3) NOT NULL DEFAULT 0,
  max_stock     NUMERIC(12,3),
  reorder_point NUMERIC(12,3) NOT NULL DEFAULT 0,
  reorder_qty   NUMERIC(12,3) NOT NULL DEFAULT 0,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE
);