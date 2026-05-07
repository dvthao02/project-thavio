-- =====================================================================
-- 0300 Platform usage billing and plan limits
-- Run after base platform migrations.
-- =====================================================================
SET search_path TO platform, public;

CREATE TABLE IF NOT EXISTS platform.plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(50) NOT NULL REFERENCES platform.subscription_plans(plan_code),
  limit_key VARCHAR(80) NOT NULL,
  limit_value BIGINT,
  reset_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
  is_hard_limit BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_code, limit_key),
  CONSTRAINT chk_plan_limit_reset CHECK (reset_period = ANY(ARRAY['never','daily','monthly','yearly']))
);

CREATE TABLE IF NOT EXISTS platform.business_usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES platform.businesses(id),
  usage_key VARCHAR(80) NOT NULL,
  current_value BIGINT NOT NULL DEFAULT 0,
  period_start DATE,
  period_end DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, usage_key, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS platform.business_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES platform.businesses(id),
  usage_date DATE NOT NULL,
  usage_key VARCHAR(80) NOT NULL,
  usage_value BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, usage_date, usage_key)
);

CREATE TABLE IF NOT EXISTS platform.platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES platform.businesses(id),
  invoice_code VARCHAR(80) NOT NULL UNIQUE,
  invoice_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  period_start DATE,
  period_end DATE,
  sub_total_vnd BIGINT NOT NULL DEFAULT 0,
  tax_amount_vnd BIGINT NOT NULL DEFAULT 0,
  grand_total_vnd BIGINT NOT NULL DEFAULT 0,
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_platform_invoice_status CHECK (invoice_status = ANY(ARRAY['draft','issued','paid','overdue','cancelled']))
);

CREATE TABLE IF NOT EXISTS platform.platform_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES platform.platform_invoices(id) ON DELETE CASCADE,
  line_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price_vnd BIGINT NOT NULL DEFAULT 0,
  line_total_vnd BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS platform.platform_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES platform.businesses(id),
  invoice_id UUID REFERENCES platform.platform_invoices(id),
  payment_code VARCHAR(80) NOT NULL UNIQUE,
  amount_vnd BIGINT NOT NULL,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(150),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_platform_payment_status CHECK (status = ANY(ARRAY['pending','completed','failed','refunded']))
);

CREATE TABLE IF NOT EXISTS platform.usage_billing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES platform.businesses(id),
  invoice_id UUID REFERENCES platform.platform_invoices(id),
  usage_key VARCHAR(80) NOT NULL,
  usage_value BIGINT NOT NULL DEFAULT 0,
  billable_value BIGINT NOT NULL DEFAULT 0,
  unit_price_vnd BIGINT NOT NULL DEFAULT 0,
  amount_vnd BIGINT NOT NULL DEFAULT 0,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_usage_daily ON platform.business_usage_daily(business_id, usage_date DESC, usage_key);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_tenant ON platform.platform_invoices(business_id, invoice_status, issued_at DESC);
