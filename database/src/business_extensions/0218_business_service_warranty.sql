-- =====================================================================
-- 0218 Service orders / warranty / repair / service packages
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  service_order_code VARCHAR(60) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promised_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_staff_id UUID REFERENCES staff_members(id),
  problem_description TEXT,
  internal_note TEXT,
  order_id UUID REFERENCES sales_orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_service_order_status CHECK (status = ANY(ARRAY['new','diagnosing','waiting_parts','in_service','completed','cancelled','returned'])),
  CONSTRAINT chk_service_order_priority CHECK (priority = ANY(ARRAY['low','normal','high','urgent']))
);

CREATE TABLE IF NOT EXISTS service_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  service_product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS warranty_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  policy_name VARCHAR(150) NOT NULL,
  warranty_months INTEGER NOT NULL DEFAULT 0,
  terms TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  sales_order_id UUID REFERENCES sales_orders(id),
  product_id UUID REFERENCES products(id),
  serial_id UUID REFERENCES product_serials(id),
  service_order_id UUID REFERENCES service_orders(id),
  claim_code VARCHAR(60) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'submitted',
  issue_description TEXT,
  resolution TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT chk_warranty_claim_status CHECK (status = ANY(ARRAY['submitted','approved','rejected','repairing','resolved','cancelled']))
);

CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_code VARCHAR(60) NOT NULL UNIQUE,
  package_name VARCHAR(150) NOT NULL,
  product_id UUID REFERENCES products(id),
  total_sessions INTEGER NOT NULL DEFAULT 0,
  valid_days INTEGER,
  price NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES service_packages(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID REFERENCES sales_orders(id),
  total_sessions INTEGER NOT NULL DEFAULT 0,
  used_sessions INTEGER NOT NULL DEFAULT 0,
  remaining_sessions INTEGER NOT NULL DEFAULT 0,
  valid_from DATE,
  valid_to DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_package_usage_status CHECK (status = ANY(ARRAY['active','used_up','expired','cancelled']))
);
