-- =====================================================================
-- 0220 Period lock / closing / role-permission history
-- =====================================================================
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

CREATE TABLE IF NOT EXISTS period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  lock_type VARCHAR(30) NOT NULL DEFAULT 'business',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'locked',
  locked_by UUID,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlocked_by UUID,
  unlocked_at TIMESTAMPTZ,
  reason TEXT,
  CONSTRAINT chk_period_lock_dates CHECK (period_start <= period_end),
  CONSTRAINT chk_period_lock_status CHECK (status = ANY(ARRAY['locked','unlocked','reopened']))
);

CREATE TABLE IF NOT EXISTS closing_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  closing_code VARCHAR(60) NOT NULL UNIQUE,
  closing_type VARCHAR(30) NOT NULL DEFAULT 'daily',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_closing_run_status CHECK (status = ANY(ARRAY['draft','running','completed','failed','reopened']))
);

CREATE TABLE IF NOT EXISTS closing_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_run_id UUID NOT NULL REFERENCES closing_runs(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  result_payload JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reopen_period_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  period_lock_id UUID REFERENCES period_locks(id),
  reason TEXT NOT NULL,
  requested_by UUID NOT NULL,
  approved_by UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CONSTRAINT chk_reopen_request_status CHECK (status = ANY(ARRAY['pending','approved','rejected','cancelled']))
);

CREATE TABLE IF NOT EXISTS role_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff_members(id),
  role_id UUID REFERENCES roles(id),
  store_id UUID REFERENCES stores(id),
  action VARCHAR(30) NOT NULL,
  changed_by UUID,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_role_change_action CHECK (action = ANY(ARRAY['grant','revoke','expire','restore']))
);

CREATE TABLE IF NOT EXISTS permission_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id),
  action VARCHAR(30) NOT NULL,
  changed_by UUID,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_permission_change_action CHECK (action = ANY(ARRAY['grant','revoke']))
);

CREATE TABLE IF NOT EXISTS temporary_permission_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id),
  permission_key VARCHAR(150) NOT NULL,
  store_id UUID REFERENCES stores(id),
  reason TEXT NOT NULL,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  CONSTRAINT chk_temp_perm_status CHECK (status = ANY(ARRAY['active','expired','revoked']))
);
