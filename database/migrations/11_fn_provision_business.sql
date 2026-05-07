-- Migration 11: Create fn_provision_business to replace fn_provision_tenant
-- Works with renamed platform.businesses table (was platform.tenants)

CREATE OR REPLACE FUNCTION platform.fn_provision_business(
  p_business_code  VARCHAR,
  p_legal_name     VARCHAR,
  p_brand_name     VARCHAR DEFAULT NULL,
  p_email          VARCHAR DEFAULT NULL,
  p_phone          VARCHAR DEFAULT NULL,
  p_plan           VARCHAR DEFAULT 'STARTER',
  p_timezone       VARCHAR DEFAULT 'Asia/Ho_Chi_Minh'
)
RETURNS TABLE(new_business_id UUID, new_schema_name VARCHAR, result_status VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_id    UUID;
  v_schema         VARCHAR := 'business_' || p_business_code;
  v_schema_created BOOLEAN := FALSE;
  v_table          RECORD;
BEGIN
  IF p_business_code !~ '^[a-z0-9_]{3,50}$' THEN
    RAISE EXCEPTION 'business_code không hợp lệ: %', p_business_code;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.schemata s WHERE s.schema_name = v_schema) THEN
    RAISE EXCEPTION 'Schema "%" đã tồn tại.', v_schema;
  END IF;
  IF EXISTS (SELECT 1 FROM platform.businesses b WHERE b.business_code = p_business_code) THEN
    RAISE EXCEPTION 'business_code "%" đã được đăng ký.', p_business_code;
  END IF;

  -- Create schema
  EXECUTE format('CREATE SCHEMA %I', v_schema);
  EXECUTE format('ALTER SCHEMA %I OWNER TO %I', v_schema, current_user);
  v_schema_created := TRUE;

  -- Clone all tables from business_template
  FOR v_table IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'business_template' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    EXECUTE format('CREATE TABLE %I.%I (LIKE business_template.%I INCLUDING ALL)',
      v_schema, v_table.table_name, v_table.table_name);
    EXECUTE format('ALTER TABLE %I.%I OWNER TO %I', v_schema, v_table.table_name, current_user);
  END LOOP;

  -- Register business
  INSERT INTO platform.businesses (
    business_code, schema_name, legal_name, brand_name,
    email, phone, subscription_plan, timezone_name, status
  ) VALUES (
    p_business_code, v_schema, p_legal_name, p_brand_name,
    p_email, p_phone, p_plan, p_timezone, 'trial'
  ) RETURNING id INTO v_business_id;

  -- Apply business logic (triggers + views)
  PERFORM platform.fn_apply_business_logic(v_schema);
  -- Apply auto-codes
  PERFORM platform.fn_apply_auto_codes(v_schema);
  -- Seed RBAC
  PERFORM platform.fn_seed_tenant_rbac(v_schema);

  RAISE NOTICE '✅ Business "%" created! Schema: % | ID: %', p_business_code, v_schema, v_business_id;
  RETURN QUERY SELECT v_business_id, v_schema::VARCHAR, 'created'::VARCHAR;

EXCEPTION WHEN OTHERS THEN
  IF v_schema_created THEN
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', v_schema);
    RAISE NOTICE '⚠️ Rolled back schema "%"', v_schema;
  END IF;
  RAISE;
END;
$$;
