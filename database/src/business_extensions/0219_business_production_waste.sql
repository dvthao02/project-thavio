-- =====================================================================
-- 0219 Production / prep batch / waste / kitchen stations
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS kitchen_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  station_code VARCHAR(50) NOT NULL,
  station_name VARCHAR(150) NOT NULL,
  station_type VARCHAR(30) NOT NULL DEFAULT 'kitchen',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, station_code)
);

CREATE TABLE IF NOT EXISTS production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  location_id UUID REFERENCES stock_locations(id),
  production_code VARCHAR(60) NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  planned_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  produced_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  planned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_production_order_status CHECK (status = ANY(ARRAY['draft','planned','in_progress','completed','cancelled']))
);

CREATE TABLE IF NOT EXISTS production_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  ingredient_product_id UUID NOT NULL REFERENCES products(id),
  ingredient_variant_id UUID REFERENCES product_variants(id),
  required_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  consumed_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit_name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredient_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  order_id UUID REFERENCES sales_orders(id),
  order_line_id UUID REFERENCES sales_order_lines(id),
  production_order_id UUID REFERENCES production_orders(id),
  ingredient_product_id UUID NOT NULL REFERENCES products(id),
  ingredient_variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(18,4) NOT NULL,
  unit_name VARCHAR(50) NOT NULL,
  stock_transaction_id UUID REFERENCES stock_transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  location_id UUID REFERENCES stock_locations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  lot_id UUID REFERENCES product_lots(id),
  quantity NUMERIC(18,4) NOT NULL,
  unit_name VARCHAR(50) NOT NULL,
  waste_reason VARCHAR(80) NOT NULL,
  stock_transaction_id UUID REFERENCES stock_transactions(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_waste_qty CHECK (quantity > 0),
  CONSTRAINT chk_waste_reason CHECK (waste_reason = ANY(ARRAY[
    'spoilage','expired','damaged','prep_loss','customer_discard','breakage','contamination','quality_issue','other'
  ]))
);

CREATE TABLE IF NOT EXISTS prep_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  batch_code VARCHAR(80) NOT NULL UNIQUE,
  produced_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  remaining_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  prepared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  CONSTRAINT chk_prep_batch_status CHECK (status = ANY(ARRAY['active','used_up','expired','discarded']))
);

CREATE TABLE IF NOT EXISTS menu_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  available_status VARCHAR(20) NOT NULL DEFAULT 'available',
  reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, product_id, variant_id),
  CONSTRAINT chk_menu_availability_status CHECK (available_status = ANY(ARRAY['available','sold_out','hidden','limited']))
);
