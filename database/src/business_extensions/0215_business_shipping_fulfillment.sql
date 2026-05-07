-- =====================================================================
-- 0215 Shipping / fulfillment / COD reconciliation
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS shipping_carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_code VARCHAR(50) NOT NULL UNIQUE,
  carrier_name VARCHAR(150) NOT NULL,
  carrier_type VARCHAR(30) NOT NULL DEFAULT 'internal',
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_shipping_carrier_type CHECK (carrier_type = ANY(ARRAY['internal','third_party','marketplace']))
);

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  carrier_id UUID REFERENCES shipping_carriers(id),
  shipment_code VARCHAR(60) NOT NULL UNIQUE,
  tracking_number VARCHAR(150),
  shipment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  recipient_name VARCHAR(255),
  recipient_phone VARCHAR(30),
  shipping_address TEXT,
  cod_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_shipment_status CHECK (shipment_status = ANY(ARRAY['pending','packed','shipped','in_transit','delivered','failed','returned','cancelled']))
);

CREATE TABLE IF NOT EXISTS shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_line_id UUID REFERENCES sales_order_lines(id),
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(18,4) NOT NULL,
  CONSTRAINT chk_shipment_item_qty CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS shipment_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  package_code VARCHAR(80) NOT NULL,
  weight_gram INTEGER,
  length_cm NUMERIC(10,2),
  width_cm NUMERIC(10,2),
  height_cm NUMERIC(10,2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipment_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_code VARCHAR(80),
  event_status VARCHAR(50) NOT NULL,
  event_message TEXT,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL DEFAULT 1,
  attempt_status VARCHAR(30) NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  note TEXT,
  CONSTRAINT chk_delivery_attempt_status CHECK (attempt_status = ANY(ARRAY['success','failed','rescheduled','cancelled']))
);

CREATE TABLE IF NOT EXISTS cod_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES shipping_carriers(id),
  reconciliation_code VARCHAR(80) NOT NULL UNIQUE,
  period_start DATE,
  period_end DATE,
  expected_cod_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  received_cod_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  fee_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT chk_cod_recon_status CHECK (status = ANY(ARRAY['draft','matched','variance','closed','cancelled']))
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(store_id, shipment_status, created_at DESC);
