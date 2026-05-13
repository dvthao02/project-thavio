-- Security Hardening Migration — Password Nullability & RLS
-- Date: 2026-05-10
-- Purpose: Enforce password NOT NULL, add check constraints, enable RLS

-- ━━━ 1. PLATFORM SCHEMA — Password NOT NULL ━━━━━━━━━━━━━━━━━━━

ALTER TABLE platform.accounts 
  ALTER COLUMN password SET NOT NULL;

ALTER TABLE platform.accounts
  ADD CONSTRAINT chk_accounts_password_not_empty 
  CHECK (password != '');

-- ━━━ 2. BUSINESS_TEMPLATE SCHEMA — Password NOT NULL ━━━━━━━━━━━━━

ALTER TABLE business_template.staff_members
  ALTER COLUMN password_hash SET NOT NULL;

ALTER TABLE business_template.staff_members
  ADD CONSTRAINT chk_staff_members_password_not_empty 
  CHECK (password_hash != '');

-- ━━━ 3. ENABLE ROW-LEVEL SECURITY (RLS) ━━━━━━━━━━━━━━━━━━━

-- business_template tables have no business_id column — tenant isolation is already
-- provided at the schema level (each business is a separate schema clone).
-- Only tables with a store_id column need RLS for intra-tenant store isolation.

-- Payment methods (PCI compliance) — store_id column exists
ALTER TABLE business_template.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_methods_isolation ON business_template.payment_methods
  FOR ALL USING (
    store_id = (NULLIF(current_setting('app.current_store_id', true), ''))::uuid
    OR NULLIF(current_setting('app.current_store_id', true), '') IS NULL
  );

-- ━━━ 4. AUDIT LOG ENHANCEMENTS ━━━━━━━━━━━━━━━━━━━

-- Add trigger for password change logging.
-- Writes to activity_logs (correct target): permission_change_history only accepts
-- action IN ('grant','revoke') and has no staff_id or hash columns.
-- Password hashes are intentionally excluded from old_data/new_data.
CREATE OR REPLACE FUNCTION business_template.log_password_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    INSERT INTO business_template.activity_logs (
      staff_id,
      action,
      entity_type,
      entity_id,
      account_id
    ) VALUES (
      NEW.id,
      'password_change',
      'staff_members',
      NEW.id,
      NULLIF(current_setting('app.user_id', true), '')::uuid
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_password_audit
  AFTER UPDATE OF password_hash ON business_template.staff_members
  FOR EACH ROW
  EXECUTE FUNCTION business_template.log_password_change();

-- ━━━ 5. SESSION SECURITY ━━━━━━━━━━━━━━━━━━━━

-- Validate expiry is after session start (stable invariant, not volatile NOW())
ALTER TABLE platform.auth_sessions
  ADD CONSTRAINT chk_session_expiry
  CHECK (expires_at IS NULL OR expires_at > started_at);

-- Add concurrent session limit tracking
CREATE TABLE IF NOT EXISTS platform.session_limits (
  account_id UUID PRIMARY KEY REFERENCES platform.accounts(id),
  max_concurrent_sessions INTEGER DEFAULT 5,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ━━━ 6. VERIFY MIGRATIONS ━━━━━━━━━━━━━━━━━━━

-- Check constraints applied
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('accounts', 'staff_members')
  AND constraint_type = 'CHECK';

-- Verify RLS policies
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'business_template'
  AND tablename = 'payment_methods';
