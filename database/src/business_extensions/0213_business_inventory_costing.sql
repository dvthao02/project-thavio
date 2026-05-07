-- =====================================================================
-- 0213 Inventory costing / COGS / landed cost / valuation
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS inventory_cost_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES stock_locations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  lot_id UUID REFERENCES product_lots(id),
  source_ref_type VARCHAR(50),
  source_ref_id UUID,
  quantity_in NUMERIC(18,4) NOT NULL DEFAULT 0,
  quantity_remaining NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cost_layer_qty CHECK (quantity_in >= 0 AND quantity_remaining >= 0)
);

CREATE TABLE IF NOT EXISTS cogs_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id),
  order_line_id UUID NOT NULL REFERENCES sales_order_lines(id),
  cost_layer_id UUID REFERENCES inventory_cost_layers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(18,4) NOT NULL,
  unit_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cogs_alloc_qty CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS landed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  landed_cost_code VARCHAR(60) NOT NULL UNIQUE,
  cost_type VARCHAR(50) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  allocation_method VARCHAR(30) NOT NULL DEFAULT 'by_value',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_landed_cost_alloc_method CHECK (allocation_method = ANY(ARRAY['by_value','by_quantity','by_weight','manual'])),
  CONSTRAINT chk_landed_cost_status CHECK (status = ANY(ARRAY['draft','allocated','posted','cancelled']))
);

CREATE TABLE IF NOT EXISTS landed_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landed_cost_id UUID NOT NULL REFERENCES landed_costs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  cost_layer_id UUID REFERENCES inventory_cost_layers(id),
  allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_cost_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  old_unit_cost NUMERIC(18,4),
  new_unit_cost NUMERIC(18,4) NOT NULL,
  quantity_affected NUMERIC(18,4),
  reason TEXT NOT NULL,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_valuation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  location_id UUID REFERENCES stock_locations(id),
  snapshot_date DATE NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  total_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(location_id, snapshot_date, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cost_layers_product ON inventory_cost_layers(product_id, variant_id, quantity_remaining);
CREATE INDEX IF NOT EXISTS idx_cogs_order_line ON cogs_allocations(order_line_id);
