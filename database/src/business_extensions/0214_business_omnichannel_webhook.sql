-- =====================================================================
-- 0214 Omnichannel / inbound webhook / sync jobs / external mappings
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS sales_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_code VARCHAR(50) NOT NULL UNIQUE,
  channel_name VARCHAR(150) NOT NULL,
  channel_type VARCHAR(30) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sales_channel_type CHECK (channel_type = ANY(ARRAY['pos','website','marketplace','social','api','manual'])),
  CONSTRAINT chk_sales_channel_status CHECK (status = ANY(ARRAY['active','disabled','error']))
);

CREATE TABLE IF NOT EXISTS channel_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  external_product_id VARCHAR(150) NOT NULL,
  external_variant_id VARCHAR(150),
  external_sku VARCHAR(150),
  sync_status VARCHAR(20) NOT NULL DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, external_product_id, external_variant_id)
);

CREATE TABLE IF NOT EXISTS channel_order_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  order_id UUID REFERENCES sales_orders(id),
  external_order_id VARCHAR(150) NOT NULL,
  external_order_status VARCHAR(80),
  raw_payload JSONB NOT NULL DEFAULT '{}',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  UNIQUE(channel_id, external_order_id)
);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES sales_channels(id),
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  total_items INTEGER NOT NULL DEFAULT 0,
  success_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sync_job_status CHECK (status = ANY(ARRAY['pending','running','completed','failed','cancelled']))
);

CREATE TABLE IF NOT EXISTS sync_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  entity_type VARCHAR(50),
  entity_id UUID,
  external_id VARCHAR(150),
  status VARCHAR(20) NOT NULL,
  message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL,
  source_event_id VARCHAR(150),
  event_type VARCHAR(100) NOT NULL,
  signature VARCHAR(500),
  raw_payload JSONB NOT NULL DEFAULT '{}',
  processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(source_type, source_event_id),
  CONSTRAINT chk_webhook_inbox_status CHECK (processing_status = ANY(ARRAY['pending','processing','processed','failed','ignored']))
);

CREATE TABLE IF NOT EXISTS external_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  external_id VARCHAR(150),
  direction VARCHAR(10) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_external_event_direction CHECK (direction = ANY(ARRAY['in','out'])),
  CONSTRAINT chk_external_event_status CHECK (status = ANY(ARRAY['success','failed','retrying']))
);

CREATE INDEX IF NOT EXISTS idx_webhook_inbox_pending ON webhook_inbox(processing_status, received_at) WHERE processing_status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS idx_channel_orders_external ON channel_order_mappings(channel_id, external_order_id);
