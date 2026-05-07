\set ON_ERROR_STOP on

-- Usage:
-- psql "$DATABASE_URL" -v business_schema=business_template -f scripts/verify_rbac_utf8_policy.sql

SELECT
  current_database() AS db_name,
  current_setting('server_encoding') AS server_encoding,
  current_setting('client_encoding') AS client_encoding;

-- Platform key policy checks (ASCII/English machine keys)
SELECT
  'platform.roles.role_key_non_ascii' AS check_name,
  COUNT(*)::int AS violations
FROM platform.roles
WHERE role_key !~ '^[A-Z0-9_]+$';

SELECT
  'platform.permissions.permission_key_non_ascii' AS check_name,
  COUNT(*)::int AS violations
FROM platform.permissions
WHERE permission_key !~ '^[a-z0-9_.]+$';

-- Platform UTF-8 display check (text must be present)
SELECT
  'platform.roles.role_name_empty' AS check_name,
  COUNT(*)::int AS violations
FROM platform.roles
WHERE NULLIF(BTRIM(role_name), '') IS NULL;

SELECT
  'platform.permissions.permission_name_empty' AS check_name,
  COUNT(*)::int AS violations
FROM platform.permissions
WHERE NULLIF(BTRIM(permission_name), '') IS NULL;

-- Tenant RBAC key policy checks
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

SELECT
  'business.roles.role_key_non_ascii' AS check_name,
  COUNT(*)::int AS violations
FROM roles
WHERE role_key !~ '^[A-Z0-9_]+$';

SELECT
  'business.permissions.permission_key_non_ascii' AS check_name,
  COUNT(*)::int AS violations
FROM permissions
WHERE permission_key !~ '^[a-z0-9_.]+$';

SELECT
  'business.roles.role_name_empty' AS check_name,
  COUNT(*)::int AS violations
FROM roles
WHERE NULLIF(BTRIM(role_name), '') IS NULL;

SELECT
  'business.permissions.permission_name_empty' AS check_name,
  COUNT(*)::int AS violations
FROM permissions
WHERE NULLIF(BTRIM(permission_name), '') IS NULL;
