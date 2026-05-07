-- =====================================================================
-- 0200 Tenant core stability extensions
-- Run with: psql -v business_schema=business_template -f 0200_tenant_core_stability_extensions.sql
-- Purpose: close core business gaps for POS/CRM: partial payment, debt, refunds,
-- status history, reservation, idempotency, product store settings, lot/serial,
-- recipe, supplier payables, delivery, reporting, approvals, outbox, offline sync.
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

-- -------------------------
-- Identity / RBAC bridge
-- -------------------------
CREATE TABLE IF NOT EXISTS staff_account_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES platform.accounts(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlinked_at TIMESTAMPTZ,
  UNIQUE (staff_id),
  UNIQUE (account_id),
  CONSTRAINT chk_staff_account_link_status CHECK (status = ANY(ARRAY['active','inactive','revoked']))
);

CREATE TABLE IF NOT EXISTS staff_role_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  UNIQUE (staff_id, role_id, store_id),
  CONSTRAINT chk_staff_role_binding_status CHECK (status = ANY(ARRAY['active','expired','revoked']))
);

CREATE TABLE IF NOT EXISTS permission_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key VARCHAR(150) NOT NULL UNIQUE,
  scope_type VARCHAR(20) NOT NULL DEFAULT 'business',
  module_key VARCHAR(80) NOT NULL,
  screen_key VARCHAR(100),
  button_key VARCHAR(100),
  action_key VARCHAR(100) NOT NULL,
  permission_name VARCHAR(150) NOT NULL,
  description TEXT,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
  require_reason BOOLEAN NOT NULL DEFAULT FALSE,
  require_mfa BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_permission_def_scope CHECK (scope_type = ANY(ARRAY['business','store','platform'])),
  CONSTRAINT chk_permission_def_risk CHECK (risk_level = ANY(ARRAY['low','medium','high','critical']))
);

-- -------------------------
-- Order status split and source metadata
-- -------------------------
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS source_channel VARCHAR(30) NOT NULL DEFAULT 'pos',
  ADD COLUMN IF NOT EXISTS source_ref VARCHAR(120),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'unfulfilled',
  ADD COLUMN IF NOT EXISTS inventory_status VARCHAR(30) NOT NULL DEFAULT 'not_deducted',
  ADD COLUMN IF NOT EXISTS debt_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rounding_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_order_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);

ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS chk_payment_status;
ALTER TABLE sales_orders ADD CONSTRAINT chk_payment_status CHECK (
  payment_status = ANY(ARRAY['unpaid','partial_paid','paid','overpaid','debt','refunded','partial_refunded','voided'])
);
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS chk_fulfillment_status;
ALTER TABLE sales_orders ADD CONSTRAINT chk_fulfillment_status CHECK (
  fulfillment_status = ANY(ARRAY['unfulfilled','partial_fulfilled','fulfilled','delivering','delivered','failed','returned'])
);
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS chk_inventory_status;
ALTER TABLE sales_orders ADD CONSTRAINT chk_inventory_status CHECK (
  inventory_status = ANY(ARRAY['not_reserved','reserved','not_deducted','deducted','partial_deducted','restored'])
);

CREATE TABLE IF NOT EXISTS sales_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  old_payment_status VARCHAR(30),
  new_payment_status VARCHAR(30),
  old_fulfillment_status VARCHAR(30),
  new_fulfillment_status VARCHAR(30),
  old_inventory_status VARCHAR(30),
  new_inventory_status VARCHAR(30),
  reason TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  adjustment_type VARCHAR(30) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  reason TEXT NOT NULL,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sales_order_adjustment_type CHECK (
    adjustment_type = ANY(ARRAY['discount','surcharge','tax_adjustment','rounding','delivery_fee','service_charge','tip','manual_correction'])
  )
);

-- -------------------------
-- Idempotency for order/payment/refund/webhook/offline sync
-- -------------------------
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type VARCHAR(50) NOT NULL,
  scope_id UUID,
  idempotency_key VARCHAR(150) NOT NULL,
  request_hash VARCHAR(255),
  response_payload JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_idempotency_status CHECK (status = ANY(ARRAY['processing','completed','failed','expired']))
);

ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS chk_idempotency_scope_type;
ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS chk_idempotency_scope_id;
ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS idempotency_keys_scope_type_idempotency_key_key;
ALTER TABLE idempotency_keys
  ADD CONSTRAINT chk_idempotency_scope_type CHECK (scope_type IN ('platform','business','store')),
  ADD CONSTRAINT chk_idempotency_scope_id CHECK (
    (scope_type = 'platform' AND scope_id IS NULL) OR
    (scope_type IN ('business','store') AND scope_id IS NOT NULL)
  );
CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_platform
ON idempotency_keys(scope_type, idempotency_key)
WHERE scope_type = 'platform';
CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_tenant_store
ON idempotency_keys(scope_type, scope_id, idempotency_key)
WHERE scope_type IN ('business','store');
DROP INDEX IF EXISTS idx_idempotency_lookup;
CREATE INDEX IF NOT EXISTS idx_idempotency_lookup
ON idempotency_keys(scope_type, scope_id, idempotency_key);

-- -------------------------
-- Customer credit / receivables / debt collection
-- -------------------------
CREATE TABLE IF NOT EXISTS customer_credit_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  credit_limit NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_debt NUMERIC(18,2) NOT NULL DEFAULT 0,
  payment_terms_days INTEGER NOT NULL DEFAULT 0,
  allow_credit BOOLEAN NOT NULL DEFAULT FALSE,
  credit_status VARCHAR(20) NOT NULL DEFAULT 'normal',
  last_payment_at TIMESTAMPTZ,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_customer_credit_status CHECK (credit_status = ANY(ARRAY['normal','watchlist','blocked']))
);

CREATE TABLE IF NOT EXISTS customer_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  order_id UUID REFERENCES sales_orders(id),
  receivable_code VARCHAR(50) NOT NULL,
  original_amount NUMERIC(18,2) NOT NULL,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(18,2) NOT NULL,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receivable_status CHECK (status = ANY(ARRAY['open','partial_paid','paid','overdue','bad_debt','cancelled','written_off'])),
  CONSTRAINT chk_receivable_amount CHECK (original_amount >= 0 AND paid_amount >= 0 AND remaining_amount >= 0)
);

CREATE TABLE IF NOT EXISTS customer_receivable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  payment_code VARCHAR(50) NOT NULL,
  payment_method_id UUID REFERENCES payment_methods(id),
  amount NUMERIC(18,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receivable_payment_amount CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS customer_receivable_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_payment_id UUID NOT NULL REFERENCES customer_receivable_payments(id) ON DELETE CASCADE,
  receivable_id UUID NOT NULL REFERENCES customer_receivables(id),
  order_id UUID REFERENCES sales_orders(id),
  allocated_amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receivable_allocated_amount CHECK (allocated_amount > 0)
);

CREATE TABLE IF NOT EXISTS customer_receivable_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES customer_receivables(id),
  adjustment_type VARCHAR(30) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  reason TEXT NOT NULL,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receivable_adjustment_type CHECK (adjustment_type = ANY(ARRAY['write_off','discount_settlement','manual_correction','bad_debt','reopen'])),
  CONSTRAINT chk_receivable_adjustment_amount CHECK (amount > 0)
);

-- -------------------------
-- Refund ledger independent from returns
-- -------------------------
CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id),
  payment_id UUID REFERENCES order_payments(id),
  return_id UUID REFERENCES order_returns(id),
  refund_code VARCHAR(50) NOT NULL,
  refund_amount NUMERIC(18,2) NOT NULL,
  refund_method VARCHAR(50) NOT NULL,
  transaction_ref VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payment_refund_status CHECK (status = ANY(ARRAY['pending','completed','failed','cancelled'])),
  CONSTRAINT chk_payment_refund_amount CHECK (refund_amount > 0)
);

-- -------------------------
-- Product extensions
-- -------------------------
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_product_type;
ALTER TABLE products ADD CONSTRAINT chk_product_type CHECK (
  product_type = ANY(ARRAY['simple','variant','combo','service','modifier','ingredient','serialized','batch'])
);

CREATE TABLE IF NOT EXISTS product_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  unit_name VARCHAR(50),
  barcode VARCHAR(100) NOT NULL,
  barcode_type VARCHAR(30) NOT NULL DEFAULT 'ean13',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (barcode)
);

CREATE TABLE IF NOT EXISTS product_store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_pos BOOLEAN NOT NULL DEFAULT TRUE,
  show_online BOOLEAN NOT NULL DEFAULT TRUE,
  allow_backorder BOOLEAN NOT NULL DEFAULT FALSE,
  min_stock_level NUMERIC(12,3),
  max_stock_level NUMERIC(12,3),
  reorder_point NUMERIC(12,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_store_settings_no_variant
ON product_store_settings(store_id, product_id) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_store_settings_with_variant
ON product_store_settings(store_id, product_id, variant_id) WHERE variant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS product_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  lot_code VARCHAR(100) NOT NULL,
  manufacture_date DATE,
  expiry_date DATE,
  supplier_id UUID REFERENCES suppliers(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_lots_no_variant ON product_lots(product_id, lot_code) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_lots_with_variant ON product_lots(product_id, variant_id, lot_code) WHERE variant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS product_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  serial_number VARCHAR(150) NOT NULL UNIQUE,
  store_id UUID REFERENCES stores(id),
  location_id UUID REFERENCES stock_locations(id),
  status VARCHAR(30) NOT NULL DEFAULT 'in_stock',
  purchase_order_id UUID,
  sales_order_id UUID,
  sold_at TIMESTAMPTZ,
  warranty_start DATE,
  warranty_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_serial_status CHECK (status = ANY(ARRAY['in_stock','reserved','sold','returned','damaged','lost']))
);

CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  ingredient_product_id UUID NOT NULL REFERENCES products(id),
  ingredient_variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(18,4) NOT NULL,
  unit_name VARCHAR(50) NOT NULL,
  wastage_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_recipe_qty CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  store_id UUID REFERENCES stores(id),
  old_price NUMERIC(18,4),
  new_price NUMERIC(18,4) NOT NULL,
  changed_by UUID,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_cost_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  old_cost NUMERIC(18,4),
  new_cost NUMERIC(18,4) NOT NULL,
  changed_by UUID,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- Stock reservation and lot balance support
-- -------------------------
CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  location_id UUID NOT NULL REFERENCES stock_locations(id),
  order_id UUID REFERENCES sales_orders(id),
  order_line_id UUID REFERENCES sales_order_lines(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  lot_id UUID REFERENCES product_lots(id),
  unit_name VARCHAR(50) NOT NULL,
  quantity NUMERIC(18,4) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_stock_reservation_status CHECK (status = ANY(ARRAY['active','consumed','released','expired','cancelled'])),
  CONSTRAINT chk_stock_reservation_qty CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS stock_lot_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES stock_locations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  lot_id UUID NOT NULL REFERENCES product_lots(id),
  unit_name VARCHAR(50) NOT NULL DEFAULT 'piece',
  quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  reserved_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_lot_balances_scope
ON stock_lot_balances(location_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), lot_id, unit_name);

ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES product_lots(id);

-- -------------------------
-- Supplier payables and payments
-- -------------------------
CREATE TABLE IF NOT EXISTS supplier_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  payable_code VARCHAR(50) NOT NULL,
  original_amount NUMERIC(18,2) NOT NULL,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(18,2) NOT NULL,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_supplier_payable_status CHECK (status = ANY(ARRAY['open','partial_paid','paid','overdue','cancelled','written_off']))
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  amount NUMERIC(18,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_supplier_payment_amount CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_payment_id UUID NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE,
  supplier_payable_id UUID NOT NULL REFERENCES supplier_payables(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  allocated_amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_supplier_payment_alloc_amount CHECK (allocated_amount > 0)
);

-- -------------------------
-- Delivery MVP / COD
-- -------------------------
CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sales_orders(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  delivery_code VARCHAR(50) NOT NULL,
  carrier_name VARCHAR(100),
  shipper_id UUID,
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  cod_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_delivery_order_status CHECK (delivery_status = ANY(ARRAY['pending','assigned','picked_up','delivering','delivered','failed','returned','cancelled']))
);

-- -------------------------
-- Reporting snapshot / approval / outbox / offline sync
-- -------------------------
CREATE TABLE IF NOT EXISTS report_daily_sales_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  report_date DATE NOT NULL,
  gross_sales NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_sales NUMERIC(18,2) NOT NULL DEFAULT 0,
  cash_collected NUMERIC(18,2) NOT NULL DEFAULT 0,
  receivable_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  cogs_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  gross_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, report_date)
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  request_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  requested_by UUID NOT NULL,
  approved_by UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_approval_status CHECK (status = ANY(ARRAY['pending','approved','rejected','cancelled']))
);

CREATE TABLE IF NOT EXISTS event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_event_outbox_status CHECK (status = ANY(ARRAY['pending','processing','processed','failed']))
);

CREATE TABLE IF NOT EXISTS offline_sync_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  register_id UUID REFERENCES registers(id),
  device_identity_id UUID,
  batch_code VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL,
  error_message TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, batch_code),
  CONSTRAINT chk_offline_sync_status CHECK (status = ANY(ARRAY['pending','processing','synced','failed','conflict']))
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_staff_account_links_account ON staff_account_links(account_id);
CREATE INDEX IF NOT EXISTS idx_staff_role_bindings_staff ON staff_role_bindings(staff_id, store_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_order_payment_status ON sales_orders(store_id, payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_order_source ON sales_orders(source_channel, source_ref) WHERE source_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receivables_customer_status ON customer_receivables(customer_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_store_status ON customer_receivables(store_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON payment_refunds(order_id, status);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_barcode ON product_barcodes(barcode);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order ON stock_reservations(order_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product ON stock_reservations(location_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_event_outbox_pending ON event_outbox(status, created_at) WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_keys(scope_type, idempotency_key);
