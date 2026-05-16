\set ON_ERROR_STOP on

-- Keep only two demo businesses in the local development database.
-- Run:
--   psql "postgresql://dvthao:123@localhost:5432/pos_master" -f database/scripts/cleanup_business_demo_data.sql

DROP TABLE IF EXISTS cleanup_business_keep_codes;
DROP TABLE IF EXISTS cleanup_business_schemas;

CREATE TEMP TABLE cleanup_business_keep_codes (
  business_code text PRIMARY KEY
) ON COMMIT PRESERVE ROWS;

INSERT INTO cleanup_business_keep_codes (business_code)
VALUES ('test_newbiz_01'), ('ttc_chau_thanh');

CREATE TEMP TABLE cleanup_business_schemas (
  schema_name text PRIMARY KEY
) ON COMMIT PRESERVE ROWS;

INSERT INTO cleanup_business_schemas (schema_name)
SELECT b.schema_name
FROM platform.businesses b
LEFT JOIN cleanup_business_keep_codes k ON k.business_code = b.business_code
WHERE k.business_code IS NULL
  AND b.schema_name IS NOT NULL
  AND b.schema_name ~ '^business_[a-z0-9_]+$'
  AND b.schema_name <> 'business_template'
ON CONFLICT DO NOTHING;

INSERT INTO cleanup_business_schemas (schema_name)
SELECT s.schema_name
FROM information_schema.schemata s
LEFT JOIN platform.businesses b ON b.schema_name = s.schema_name
WHERE s.schema_name LIKE 'business\_%' ESCAPE '\'
  AND s.schema_name <> 'business_template'
  AND b.id IS NULL
  AND s.schema_name ~ '^business_[a-z0-9_]+$'
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_tax_code_unique
ON platform.businesses (LOWER(tax_code))
WHERE tax_code IS NOT NULL;

DO $$
DECLARE
  keep_codes text[] := ARRAY['test_newbiz_01', 'ttc_chau_thanh'];
  delete_ids uuid[];
  table_row record;
  keep_count integer;
BEGIN
  IF current_database() <> 'pos_master' THEN
    RAISE EXCEPTION 'Refusing to cleanup database "%". Expected local database "pos_master".', current_database();
  END IF;

  SELECT COUNT(*) INTO keep_count
  FROM platform.businesses
  WHERE business_code = ANY(keep_codes);

  IF keep_count <> array_length(keep_codes, 1) THEN
    RAISE EXCEPTION 'Expected keep businesses %, found only %.', keep_codes, keep_count;
  END IF;

  UPDATE platform.businesses
  SET
    legal_name = 'Cong ty TNHH Demo NewBiz 01',
    brand_name = 'Demo NewBiz 01',
    tax_code = '0123456789',
    status = 'active',
    subscription_plan = 'standard',
    trial_ends_at = COALESCE(trial_ends_at, NOW() + INTERVAL '10 days'),
    updated_at = NOW()
  WHERE business_code = 'test_newbiz_01';

  UPDATE platform.businesses
  SET
    legal_name = 'Cong ty TNHH Demo Store 02',
    brand_name = 'Demo Store 02',
    tax_code = '082838283823',
    status = 'suspended',
    subscription_plan = 'standard',
    trial_ends_at = COALESCE(trial_ends_at, NOW() + INTERVAL '10 days'),
    updated_at = NOW()
  WHERE business_code = 'ttc_chau_thanh';

  SELECT
    ARRAY_AGG(id ORDER BY business_code)
  INTO delete_ids
  FROM platform.businesses
  WHERE business_code <> ALL(keep_codes);

  IF delete_ids IS NOT NULL THEN
    FOR table_row IN
      SELECT t.table_name
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON c.table_schema = t.table_schema
       AND c.table_name = t.table_name
      WHERE t.table_schema = 'platform'
        AND t.table_type = 'BASE TABLE'
        AND c.column_name = 'business_id'
        AND t.table_name <> 'businesses'
      ORDER BY t.table_name
    LOOP
      EXECUTE format('DELETE FROM platform.%I WHERE business_id = ANY($1)', table_row.table_name)
      USING delete_ids;
    END LOOP;

    DELETE FROM platform.account_role_bindings
    WHERE scope_type = 'business'
      AND scope_id = ANY(delete_ids);

    DELETE FROM platform.businesses
    WHERE id = ANY(delete_ids);
  END IF;

  WITH orphan_accounts AS (
    SELECT a.id
    FROM platform.accounts a
    WHERE NOT EXISTS (
        SELECT 1 FROM platform.account_businesses ab WHERE ab.account_id = a.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM platform.account_role_bindings arb WHERE arb.account_id = a.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM platform.auth_sessions aus WHERE aus.account_id = a.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM platform.session_limits sl WHERE sl.account_id = a.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM platform.account_mfa_methods mfa WHERE mfa.account_id = a.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM platform.device_identities di WHERE di.account_id = a.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM platform.platform_announcements ann WHERE ann.created_by = a.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM platform.system_settings st WHERE st.updated_by = a.id
      )
  )
  DELETE FROM platform.accounts a
  USING orphan_accounts o
  WHERE a.id = o.id;
END $$;

-- Execute each DROP SCHEMA as a separate autocommit statement to avoid
-- exhausting max_locks_per_transaction on tenant schemas with many tables.
SELECT format('DROP SCHEMA IF EXISTS %I CASCADE;', schema_name)
FROM cleanup_business_schemas
ORDER BY schema_name;
\gexec

SELECT
  business_code,
  schema_name,
  legal_name,
  tax_code,
  status,
  trial_ends_at
FROM platform.businesses
ORDER BY business_code;

SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE 'business\_%' ESCAPE '\'
ORDER BY schema_name;
