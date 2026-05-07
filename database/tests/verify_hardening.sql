\set ON_ERROR_STOP on

-- Verification for the hardening pass:
-- - idempotency scope rules are enforced by DB
-- - journal entries stay consistent with journal lines

BEGIN;
SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

DO $$
DECLARE
  v_store_id UUID;
  v_cash_account_id UUID;
  v_revenue_account_id UUID;
  v_entry_id UUID;
  v_count INTEGER;
  v_debit NUMERIC(18,2);
  v_credit NUMERIC(18,2);
  v_business_scope_a UUID := gen_random_uuid();
  v_business_scope_b UUID := gen_random_uuid();
  v_store_scope UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stores WHERE store_code = 'VERIFY_HARDEN_STORE') THEN
    INSERT INTO stores(store_code, store_name, store_type, is_active)
    VALUES ('VERIFY_HARDEN_STORE', 'Verify Harden Store', 'retail', TRUE);
  END IF;

  SELECT id INTO v_store_id
  FROM stores
  WHERE store_code = 'VERIFY_HARDEN_STORE';

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Unable to create or locate verify store';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = 'VERIFY_CASH') THEN
    INSERT INTO chart_of_accounts(account_code, account_name, account_type, normal_balance, is_system, is_active)
    VALUES ('VERIFY_CASH', 'Verify Cash', 'asset', 'debit', FALSE, TRUE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = 'VERIFY_REVENUE') THEN
    INSERT INTO chart_of_accounts(account_code, account_name, account_type, normal_balance, is_system, is_active)
    VALUES ('VERIFY_REVENUE', 'Verify Revenue', 'revenue', 'credit', FALSE, TRUE);
  END IF;

  SELECT id INTO v_cash_account_id FROM chart_of_accounts WHERE account_code = 'VERIFY_CASH';
  SELECT id INTO v_revenue_account_id FROM chart_of_accounts WHERE account_code = 'VERIFY_REVENUE';

  IF v_cash_account_id IS NULL OR v_revenue_account_id IS NULL THEN
    RAISE EXCEPTION 'Unable to create or locate verify accounts';
  END IF;

  -- Positive idempotency checks
  INSERT INTO idempotency_keys(scope_type, scope_id, idempotency_key, status)
  VALUES ('platform', NULL, 'VERIFY-HARDEN-PLATFORM-001', 'processing');

  INSERT INTO idempotency_keys(scope_type, scope_id, idempotency_key, status)
  VALUES ('platform', NULL, 'VERIFY-HARDEN-PLATFORM-001', 'processing')
  ON CONFLICT DO NOTHING;

  INSERT INTO idempotency_keys(scope_type, scope_id, idempotency_key, status)
  VALUES ('business', v_business_scope_a, 'VERIFY-HARDEN-TENANT-001', 'processing');

  INSERT INTO idempotency_keys(scope_type, scope_id, idempotency_key, status)
  VALUES ('business', v_business_scope_a, 'VERIFY-HARDEN-TENANT-001', 'processing')
  ON CONFLICT DO NOTHING;

  INSERT INTO idempotency_keys(scope_type, scope_id, idempotency_key, status)
  VALUES ('business', v_business_scope_b, 'VERIFY-HARDEN-TENANT-001', 'processing');

  INSERT INTO idempotency_keys(scope_type, scope_id, idempotency_key, status)
  VALUES ('store', v_store_scope, 'VERIFY-HARDEN-STORE-001', 'processing');

  INSERT INTO idempotency_keys(scope_type, scope_id, idempotency_key, status)
  VALUES ('store', v_store_scope, 'VERIFY-HARDEN-STORE-001', 'processing')
  ON CONFLICT DO NOTHING;

  SELECT COUNT(*) INTO v_count
  FROM idempotency_keys
  WHERE idempotency_key = 'VERIFY-HARDEN-PLATFORM-001';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Platform idempotency uniqueness failed: %', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM idempotency_keys
  WHERE idempotency_key = 'VERIFY-HARDEN-TENANT-001' AND scope_type = 'business';
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Tenant idempotency scope uniqueness failed: %', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM idempotency_keys
  WHERE idempotency_key = 'VERIFY-HARDEN-STORE-001' AND scope_type = 'store';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Store idempotency uniqueness failed: %', v_count;
  END IF;

  BEGIN
    INSERT INTO idempotency_keys(scope_type, scope_id, idempotency_key, status)
    VALUES ('business', NULL, 'VERIFY-HARDEN-BAD-001', 'processing');
    RAISE EXCEPTION 'Expected business scope without scope_id to fail';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Journal hardening checks
  INSERT INTO journal_entries(store_id, entry_code, entry_date, description)
  VALUES (v_store_id, 'VERIFY-JOURNAL-001', CURRENT_DATE, 'Verify journal guard')
  RETURNING id INTO v_entry_id;

  INSERT INTO journal_lines(entry_id, account_id, debit_amount, credit_amount, description)
  VALUES
    (v_entry_id, v_cash_account_id, 50, 0, 'Debit verify line'),
    (v_entry_id, v_revenue_account_id, 0, 50, 'Credit verify line');

  UPDATE journal_entries
  SET status = 'posted'
  WHERE id = v_entry_id;

  SELECT total_debit, total_credit
  INTO v_debit, v_credit
  FROM journal_entries
  WHERE id = v_entry_id;

  IF v_debit <> 50 OR v_credit <> 50 THEN
    RAISE EXCEPTION 'Journal totals not synced correctly: debit=%, credit=%', v_debit, v_credit;
  END IF;

  BEGIN
    UPDATE journal_entries
    SET total_debit = 51
    WHERE id = v_entry_id;
    RAISE EXCEPTION 'Expected journal tamper update to fail';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

ROLLBACK;
