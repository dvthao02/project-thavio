-- Migration 14: Rename RBAC scope value 'tenant' → 'business'
-- Consistent with migration 10 (RENAME_TENANT_TO_BUSINESS)
-- Affects: platform.roles.role_scope, platform.account_role_bindings.scope_type

BEGIN;

-- 1. Update existing data
UPDATE platform.roles
  SET role_scope = 'business'
  WHERE role_scope = 'tenant';

UPDATE platform.account_role_bindings
  SET scope_type = 'business'
  WHERE scope_type = 'tenant';

-- 2. Recreate check constraint on platform.roles
ALTER TABLE platform.roles
  DROP CONSTRAINT IF EXISTS chk_platform_roles_scope;

ALTER TABLE platform.roles
  ADD CONSTRAINT chk_platform_roles_scope
  CHECK (lower(role_scope::text) = ANY (ARRAY['platform'::text, 'business'::text]));

-- 3. Recreate check constraint on platform.account_role_bindings
ALTER TABLE platform.account_role_bindings
  DROP CONSTRAINT IF EXISTS chk_arb_scope;

ALTER TABLE platform.account_role_bindings
  ADD CONSTRAINT chk_arb_scope
  CHECK (scope_type::text = ANY (ARRAY['platform'::text, 'business'::text, 'store'::text]));

COMMIT;
