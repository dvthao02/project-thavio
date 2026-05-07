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
