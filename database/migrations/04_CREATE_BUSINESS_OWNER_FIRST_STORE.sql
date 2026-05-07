-- =====================================================================
-- Create first store + owner staff + platform account link for a business.
-- Run after:
--   01_FULL_NEW_DATABASE_INSTALL.sql
--   02_CREATE_BUSINESS_SCHEMA_FULL.sql
--   03_REGISTER_TENANT.sql
-- Required psql vars:
--   business_schema, business_code, store_code, store_name, owner_username,
--   owner_password_hash, owner_full_name, owner_email, owner_phone
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('app.business_schema', :'business_schema', false);
SELECT set_config('app.business_code', :'business_code', false);
SELECT set_config('app.store_code', :'store_code', false);
SELECT set_config('app.store_name', :'store_name', false);
SELECT set_config('app.owner_username', :'owner_username', false);
SELECT set_config('app.owner_password_hash', :'owner_password_hash', false);
SELECT set_config('app.owner_full_name', :'owner_full_name', false);
SELECT set_config('app.owner_email', :'owner_email', false);
SELECT set_config('app.owner_phone', :'owner_phone', false);
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

DO $$
DECLARE
  v_business_schema TEXT := current_setting('app.business_schema');
  v_business_code TEXT := current_setting('app.business_code');
  v_store_code TEXT := current_setting('app.store_code');
  v_store_name TEXT := current_setting('app.store_name');
  v_owner_username TEXT := current_setting('app.owner_username');
  v_owner_password_hash TEXT := current_setting('app.owner_password_hash');
  v_owner_full_name TEXT := current_setting('app.owner_full_name');
  v_owner_email TEXT := NULLIF(current_setting('app.owner_email'), '');
  v_owner_phone TEXT := NULLIF(current_setting('app.owner_phone'), '');
  v_business_id UUID;
  v_store_id UUID;
  v_account_id UUID;
  v_staff_id UUID;
  v_owner_role_id UUID;
BEGIN
  SELECT id INTO v_business_id FROM platform.businesses WHERE business_code = v_business_code AND schema_name = v_business_schema;
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not registered: % / %', v_business_code, v_business_schema;
  END IF;

  INSERT INTO stores(store_code, store_name, store_type, is_active)
  VALUES (v_store_code, v_store_name, 'retail', TRUE)
  ON CONFLICT (store_code) DO UPDATE SET store_name = EXCLUDED.store_name, updated_at = NOW()
  RETURNING id INTO v_store_id;

  INSERT INTO stock_locations(store_id, location_code, location_name, location_type, is_sellable, is_active)
  VALUES (v_store_id, 'MAIN', 'Kho chính', 'main', TRUE, TRUE)
  ON CONFLICT DO NOTHING;

  INSERT INTO platform.accounts(username, password, full_name, email, phone, status)
  VALUES (v_owner_username, v_owner_password_hash, v_owner_full_name, v_owner_email, v_owner_phone, 'active')
  ON CONFLICT (username) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    updated_at = NOW()
  RETURNING id INTO v_account_id;

  INSERT INTO platform.account_businesses(account_id, business_id, access_level, default_branch_code, status)
  VALUES (v_account_id, v_business_id, 'owner', v_store_code, 'active')
  ON CONFLICT (account_id, business_id) DO UPDATE SET access_level = 'owner', status = 'active', updated_at = NOW();

  INSERT INTO staff_members(staff_code, full_name, display_name, phone, email, role, primary_store_id, employment_status, is_active)
  VALUES ('OWNER001', v_owner_full_name, v_owner_full_name, v_owner_phone, v_owner_email, 'admin', v_store_id, 'active', TRUE)
  ON CONFLICT (staff_code) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    primary_store_id = EXCLUDED.primary_store_id,
    updated_at = NOW()
  RETURNING id INTO v_staff_id;

  INSERT INTO staff_account_links(staff_id, account_id, status)
  VALUES (v_staff_id, v_account_id, 'active')
  ON CONFLICT (staff_id) DO UPDATE SET account_id = EXCLUDED.account_id, status = 'active';

  SELECT id INTO v_owner_role_id FROM roles WHERE role_key = 'OWNER';
  INSERT INTO staff_role_bindings(staff_id, role_id, store_id, status)
  VALUES (v_staff_id, v_owner_role_id, NULL, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO activity_logs(store_id, staff_id, account_id, action, entity_type, entity_id, new_data)
  VALUES (v_store_id, v_staff_id, v_account_id, 'business.bootstrap_owner', 'business', v_business_id, jsonb_build_object('store_code', v_store_code, 'owner_username', v_owner_username));
END $$;
COMMIT;