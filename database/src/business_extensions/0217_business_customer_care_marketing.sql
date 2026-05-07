-- =====================================================================
-- 0217 Customer care / consent / segmentation / campaigns
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_code VARCHAR(50) NOT NULL UNIQUE,
  tag_name VARCHAR(100) NOT NULL,
  tag_color VARCHAR(7) DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS customer_tag_mappings (
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(customer_id, tag_id)
);

CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_code VARCHAR(50) NOT NULL UNIQUE,
  segment_name VARCHAR(150) NOT NULL,
  segment_type VARCHAR(20) NOT NULL DEFAULT 'dynamic',
  rules JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_customer_segment_type CHECK (segment_type = ANY(ARRAY['static','dynamic']))
);

CREATE TABLE IF NOT EXISTS customer_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'granted',
  source VARCHAR(50),
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, consent_type, channel),
  CONSTRAINT chk_customer_consent_status CHECK (status = ANY(ARRAY['granted','revoked','unknown'])),
  CONSTRAINT chk_customer_consent_channel CHECK (channel = ANY(ARRAY['email','sms','push','call','marketing','survey','postal']))
);

CREATE TABLE IF NOT EXISTS customer_contact_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, channel),
  CONSTRAINT chk_contact_preference_channel CHECK (channel = ANY(ARRAY['email','sms','push','call','marketing','survey','postal'])),
  CONSTRAINT chk_contact_preference_quiet_hours CHECK (
    quiet_hours_start IS NULL OR quiet_hours_end IS NULL OR quiet_hours_start <> quiet_hours_end
  )
);

CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  store_id UUID REFERENCES stores(id),
  interaction_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  content TEXT,
  ref_type VARCHAR(50),
  ref_id UUID,
  created_by UUID REFERENCES staff_members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_merge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_customer_id UUID NOT NULL REFERENCES customers(id),
  duplicate_customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_by UUID,
  approved_by UUID,
  merged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_customer_merge_status CHECK (status = ANY(ARRAY['pending','approved','rejected','merged','cancelled'])),
  CONSTRAINT chk_customer_merge_distinct CHECK (primary_customer_id <> duplicate_customer_id)
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code VARCHAR(60) NOT NULL UNIQUE,
  campaign_name VARCHAR(150) NOT NULL,
  campaign_type VARCHAR(30) NOT NULL,
  target_config JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_campaign_status CHECK (status = ANY(ARRAY['draft','scheduled','running','completed','cancelled','failed']))
);

CREATE TABLE IF NOT EXISTS campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  channel VARCHAR(30) NOT NULL,
  recipient VARCHAR(255),
  message_payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_campaign_message_status CHECK (status = ANY(ARRAY['pending','sent','delivered','failed','skipped'])),
  CONSTRAINT chk_campaign_message_channel CHECK (channel = ANY(ARRAY['email','sms','push','call','marketing','survey','postal']))
);
