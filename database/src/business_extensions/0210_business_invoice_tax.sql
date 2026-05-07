-- =====================================================================
-- 0210 Invoice / tax / credit note / debit note
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS invoice_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  invoice_type VARCHAR(30) NOT NULL DEFAULT 'sales_invoice',
  prefix VARCHAR(30) NOT NULL DEFAULT '',
  suffix VARCHAR(30) NOT NULL DEFAULT '',
  pad_length INTEGER NOT NULL DEFAULT 6,
  last_number BIGINT NOT NULL DEFAULT 0,
  reset_period VARCHAR(20) NOT NULL DEFAULT 'yearly',
  last_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, invoice_type),
  CONSTRAINT chk_invoice_seq_reset CHECK (reset_period = ANY(ARRAY['never','daily','monthly','yearly']))
);

CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES sales_orders(id),
  invoice_code VARCHAR(60) NOT NULL,
  invoice_type VARCHAR(30) NOT NULL DEFAULT 'standard',
  invoice_status VARCHAR(30) NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  buyer_name VARCHAR(255),
  buyer_tax_code VARCHAR(50),
  buyer_address TEXT,
  buyer_email VARCHAR(255),
  sub_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  external_invoice_id VARCHAR(120),
  external_invoice_url TEXT,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(invoice_code),
  CONSTRAINT chk_sales_invoice_type CHECK (invoice_type = ANY(ARRAY['standard','replacement','adjustment','consolidated'])) ,
  CONSTRAINT chk_sales_invoice_status CHECK (invoice_status = ANY(ARRAY['draft','issued','cancelled','adjusted','replaced']))
);

CREATE TABLE IF NOT EXISTS sales_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  order_line_id UUID REFERENCES sales_order_lines(id),
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_name VARCHAR(50),
  unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_invoice_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  tax_code VARCHAR(30) NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  taxable_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  invoice_id UUID REFERENCES sales_invoices(id),
  order_id UUID REFERENCES sales_orders(id),
  credit_note_code VARCHAR(60) NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  issued_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_credit_note_status CHECK (status = ANY(ARRAY['draft','issued','cancelled','applied']))
);

CREATE TABLE IF NOT EXISTS credit_note_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  invoice_line_id UUID REFERENCES sales_invoice_lines(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  invoice_id UUID REFERENCES sales_invoices(id),
  debit_note_code VARCHAR(60) NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  issued_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_debit_note_status CHECK (status = ANY(ARRAY['draft','issued','cancelled','applied']))
);

CREATE TABLE IF NOT EXISTS tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  period_code VARCHAR(30) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  output_tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  input_tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tax_report_status CHECK (status = ANY(ARRAY['draft','submitted','closed','reopened']))
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_store_status ON sales_invoices(store_id, invoice_status, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_order ON sales_invoices(order_id) WHERE order_id IS NOT NULL;
