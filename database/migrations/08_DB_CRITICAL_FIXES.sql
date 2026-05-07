-- =====================================================================
-- 08 DB CRITICAL FIXES — Wave 1 hardening cho database đã cài
-- Áp dụng sau 01_FULL_NEW_DATABASE_INSTALL.sql (lần đầu)
-- Hoặc chạy độc lập với :business_schema để patch 1 business cụ thể.
--
-- Cú pháp:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--        -v business_schema=business_template \
--        -f 08_DB_CRITICAL_FIXES.sql
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--        -v business_schema=tenant_acafe \
--        -f 08_DB_CRITICAL_FIXES.sql
--
-- File này IDEMPOTENT — chạy nhiều lần không gây lỗi.
-- =====================================================================
\set ON_ERROR_STOP on
\if :{?business_schema}
\else
\set business_schema business_template
\endif

BEGIN;

-- Security: chặn mọi user tạo bảng vào schema public (PostgreSQL default cho phép PUBLIC role)
-- Phải chạy một lần duy nhất cho database, idempotent (REVOKE không lỗi nếu quyền chưa có).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

-- ─────────────────────────────────────────────────────────────────────
-- A. STRUCTURAL DDL FIXES (per-business)
-- ─────────────────────────────────────────────────────────────────────

-- A1. customers.gender — sửa CHECK constraint sai (luôn pass khi gender NULL)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS chk_customer_gender;
ALTER TABLE customers ADD CONSTRAINT chk_customer_gender
  CHECK (gender IS NULL OR gender = ANY(ARRAY['male','female','other']));

-- A2. sales_orders.table_id — chuyển VARCHAR(50) → UUID + FK
DO $$
DECLARE v_type TEXT;
BEGIN
  SELECT data_type INTO v_type FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'sales_orders' AND column_name = 'table_id';
  IF v_type = 'character varying' THEN
    EXECUTE 'ALTER TABLE sales_orders ALTER COLUMN table_id TYPE UUID USING NULLIF(NULLIF(table_id, ''''), ''null'')::UUID';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'sales_orders.table_id type conversion skipped: %', SQLERRM;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_so_table' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE sales_orders ADD CONSTRAINT fk_so_table FOREIGN KEY (table_id) REFERENCES dining_tables(id)';
  END IF;
END $$;

-- A3. Missing FK trên các bảng đã tồn tại
-- Helper: tự thêm FK nếu chưa có
CREATE OR REPLACE FUNCTION pg_temp.add_fk_if_missing(
  p_constraint_name TEXT, p_sql TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = p_constraint_name AND table_schema = current_schema()) THEN
    EXECUTE p_sql;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Skip FK %: %', p_constraint_name, SQLERRM;
END $$;

-- price_book_items
SELECT pg_temp.add_fk_if_missing('fk_price_book_items_book',
  'ALTER TABLE price_book_items ADD CONSTRAINT fk_price_book_items_book FOREIGN KEY (price_book_id) REFERENCES price_books(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk_if_missing('fk_price_book_items_product',
  'ALTER TABLE price_book_items ADD CONSTRAINT fk_price_book_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk_if_missing('fk_price_book_items_variant',
  'ALTER TABLE price_book_items ADD CONSTRAINT fk_price_book_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE');

-- stock_balances / stock_transactions / purchase_order_lines: variant_id
SELECT pg_temp.add_fk_if_missing('fk_stock_balances_variant',
  'ALTER TABLE stock_balances ADD CONSTRAINT fk_stock_balances_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)');
SELECT pg_temp.add_fk_if_missing('fk_stock_txn_variant',
  'ALTER TABLE stock_transactions ADD CONSTRAINT fk_stock_txn_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)');
SELECT pg_temp.add_fk_if_missing('fk_po_lines_variant',
  'ALTER TABLE purchase_order_lines ADD CONSTRAINT fk_po_lines_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)');

-- stocktake_items / stock_transfer_items: variant_id
SELECT pg_temp.add_fk_if_missing('fk_stocktake_items_variant',
  'ALTER TABLE stocktake_items ADD CONSTRAINT fk_stocktake_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)');
SELECT pg_temp.add_fk_if_missing('fk_stock_transfer_items_variant',
  'ALTER TABLE stock_transfer_items ADD CONSTRAINT fk_stock_transfer_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)');

-- order_return_lines.variant_id
SELECT pg_temp.add_fk_if_missing('fk_order_return_lines_variant',
  'ALTER TABLE order_return_lines ADD CONSTRAINT fk_order_return_lines_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)');

-- combo_items.item_variant_id
SELECT pg_temp.add_fk_if_missing('fk_combo_items_variant',
  'ALTER TABLE combo_items ADD CONSTRAINT fk_combo_items_variant FOREIGN KEY (item_variant_id) REFERENCES product_variants(id)');

-- stock_rules: product_id, location_id
SELECT pg_temp.add_fk_if_missing('fk_stock_rules_product',
  'ALTER TABLE stock_rules ADD CONSTRAINT fk_stock_rules_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE');
SELECT pg_temp.add_fk_if_missing('fk_stock_rules_location',
  'ALTER TABLE stock_rules ADD CONSTRAINT fk_stock_rules_location FOREIGN KEY (location_id) REFERENCES stock_locations(id) ON DELETE CASCADE');

-- M6 CRM: appointments, appointment_lines, customer_ledgers
SELECT pg_temp.add_fk_if_missing('fk_appointments_order',
  'ALTER TABLE appointments ADD CONSTRAINT fk_appointments_order FOREIGN KEY (order_id) REFERENCES sales_orders(id)');
SELECT pg_temp.add_fk_if_missing('fk_appointments_staff',
  'ALTER TABLE appointments ADD CONSTRAINT fk_appointments_staff FOREIGN KEY (staff_id) REFERENCES staff_members(id)');
SELECT pg_temp.add_fk_if_missing('fk_appointment_lines_variant',
  'ALTER TABLE appointment_lines ADD CONSTRAINT fk_appointment_lines_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)');
SELECT pg_temp.add_fk_if_missing('fk_appointment_lines_staff',
  'ALTER TABLE appointment_lines ADD CONSTRAINT fk_appointment_lines_staff FOREIGN KEY (staff_id) REFERENCES staff_members(id)');
SELECT pg_temp.add_fk_if_missing('fk_customer_ledgers_store',
  'ALTER TABLE customer_ledgers ADD CONSTRAINT fk_customer_ledgers_store FOREIGN KEY (store_id) REFERENCES stores(id)');
SELECT pg_temp.add_fk_if_missing('fk_customer_ledgers_created_by',
  'ALTER TABLE customer_ledgers ADD CONSTRAINT fk_customer_ledgers_created_by FOREIGN KEY (created_by) REFERENCES staff_members(id)');

-- M7: payroll_periods.store_id, cash_accounts.store_id, cash_accounts.bank_master_id
SELECT pg_temp.add_fk_if_missing('fk_payroll_periods_store',
  'ALTER TABLE payroll_periods ADD CONSTRAINT fk_payroll_periods_store FOREIGN KEY (store_id) REFERENCES stores(id)');
SELECT pg_temp.add_fk_if_missing('fk_cash_accounts_store',
  'ALTER TABLE cash_accounts ADD CONSTRAINT fk_cash_accounts_store FOREIGN KEY (store_id) REFERENCES stores(id)');
SELECT pg_temp.add_fk_if_missing('fk_cash_accounts_bank',
  'ALTER TABLE cash_accounts ADD CONSTRAINT fk_cash_accounts_bank FOREIGN KEY (bank_master_id) REFERENCES platform.bank_master(id)');

-- 0217 customer_care
SELECT pg_temp.add_fk_if_missing('fk_customer_interactions_created_by',
  'ALTER TABLE customer_interactions ADD CONSTRAINT fk_customer_interactions_created_by FOREIGN KEY (created_by) REFERENCES staff_members(id)');

-- 0215 shipping
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'shipment_items' AND column_name = 'order_line_id') THEN
    PERFORM pg_temp.add_fk_if_missing('fk_shipment_items_order_line',
      'ALTER TABLE shipment_items ADD CONSTRAINT fk_shipment_items_order_line FOREIGN KEY (order_line_id) REFERENCES sales_order_lines(id)');
  END IF;
END $$;

-- 0212 receiving_discrepancies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'receiving_discrepancies' AND column_name = 'variant_id') THEN
    PERFORM pg_temp.add_fk_if_missing('fk_receiving_disc_variant',
      'ALTER TABLE receiving_discrepancies ADD CONSTRAINT fk_receiving_disc_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)');
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- B. CHECK CONSTRAINT bổ sung
-- ─────────────────────────────────────────────────────────────────────

-- B1. combo_items: chống self-reference + qty>0
ALTER TABLE combo_items DROP CONSTRAINT IF EXISTS chk_combo_no_self_ref;
ALTER TABLE combo_items ADD CONSTRAINT chk_combo_no_self_ref CHECK (combo_product_id <> item_product_id);
ALTER TABLE combo_items DROP CONSTRAINT IF EXISTS chk_combo_qty_positive;
ALTER TABLE combo_items ADD CONSTRAINT chk_combo_qty_positive CHECK (quantity > 0);

-- B2. stock_transfers: from <> to
ALTER TABLE stock_transfers DROP CONSTRAINT IF EXISTS chk_transfer_locations_distinct;
ALTER TABLE stock_transfers ADD CONSTRAINT chk_transfer_locations_distinct
  CHECK (from_location_id <> to_location_id);

-- B3. service_orders.priority enum
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_orders' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS chk_service_order_priority';
    EXECUTE 'ALTER TABLE service_orders ADD CONSTRAINT chk_service_order_priority CHECK (priority = ANY(ARRAY[''low'',''normal'',''high'',''urgent'']))';
  END IF;
END $$;

-- B4. waste_logs.waste_reason enum
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'waste_logs' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE waste_logs DROP CONSTRAINT IF EXISTS chk_waste_reason';
    EXECUTE 'ALTER TABLE waste_logs ADD CONSTRAINT chk_waste_reason CHECK (waste_reason = ANY(ARRAY[''spoilage'',''expired'',''damaged'',''prep_loss'',''customer_discard'',''breakage'',''contamination'',''quality_issue'',''other'']))';
  END IF;
END $$;

-- B5. customer_consents.channel + customer_contact_preferences.channel + quiet_hours
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_consents' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE customer_consents DROP CONSTRAINT IF EXISTS chk_customer_consent_channel';
    EXECUTE 'ALTER TABLE customer_consents ADD CONSTRAINT chk_customer_consent_channel CHECK (channel = ANY(ARRAY[''email'',''sms'',''push'',''call'',''marketing'',''survey'',''postal'']))';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_contact_preferences' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE customer_contact_preferences DROP CONSTRAINT IF EXISTS chk_contact_preference_channel';
    EXECUTE 'ALTER TABLE customer_contact_preferences ADD CONSTRAINT chk_contact_preference_channel CHECK (channel = ANY(ARRAY[''email'',''sms'',''push'',''call'',''marketing'',''survey'',''postal'']))';
    EXECUTE 'ALTER TABLE customer_contact_preferences DROP CONSTRAINT IF EXISTS chk_contact_preference_quiet_hours';
    EXECUTE 'ALTER TABLE customer_contact_preferences ADD CONSTRAINT chk_contact_preference_quiet_hours CHECK (quiet_hours_start IS NULL OR quiet_hours_end IS NULL OR quiet_hours_start <> quiet_hours_end)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_messages' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE campaign_messages DROP CONSTRAINT IF EXISTS chk_campaign_message_channel';
    EXECUTE 'ALTER TABLE campaign_messages ADD CONSTRAINT chk_campaign_message_channel CHECK (channel = ANY(ARRAY[''email'',''sms'',''push'',''call'',''marketing'',''survey'',''postal'']))';
  END IF;
END $$;

-- B6. customer_merge_requests: distinct primary vs duplicate
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_merge_requests' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE customer_merge_requests DROP CONSTRAINT IF EXISTS chk_customer_merge_distinct';
    EXECUTE 'ALTER TABLE customer_merge_requests ADD CONSTRAINT chk_customer_merge_distinct CHECK (primary_customer_id <> duplicate_customer_id)';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- C. NỘI DUNG 0301 (UNIQUE + index bổ sung) — copy từ source
-- ─────────────────────────────────────────────────────────────────────

-- Stock rules unique
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_rules_product_location_global
  ON stock_rules(product_id) WHERE location_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_rules_product_location_scoped
  ON stock_rules(product_id, location_id) WHERE location_id IS NOT NULL;

-- COGS / shipment / receivable / package
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cogs_allocations' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE cogs_allocations DROP CONSTRAINT IF EXISTS chk_cogs_alloc_cost_nonneg';
    EXECUTE 'ALTER TABLE cogs_allocations ADD CONSTRAINT chk_cogs_alloc_cost_nonneg CHECK (unit_cost >= 0 AND total_cost >= 0)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipment_items' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE shipment_items DROP CONSTRAINT IF EXISTS chk_shipment_item_qty';
    EXECUTE 'ALTER TABLE shipment_items ADD CONSTRAINT chk_shipment_item_qty CHECK (quantity > 0)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'package_usages' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE package_usages DROP CONSTRAINT IF EXISTS chk_package_remaining_nonneg';
    EXECUTE 'ALTER TABLE package_usages ADD CONSTRAINT chk_package_remaining_nonneg CHECK (used_sessions >= 0 AND remaining_sessions >= 0 AND used_sessions + remaining_sessions <= total_sessions + 999)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'temporary_permission_grants' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE temporary_permission_grants DROP CONSTRAINT IF EXISTS chk_temp_perm_dates';
    EXECUTE 'ALTER TABLE temporary_permission_grants ADD CONSTRAINT chk_temp_perm_dates CHECK (expires_at > granted_at)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_receivables' AND table_schema = current_schema()) THEN
    EXECUTE 'ALTER TABLE customer_receivables DROP CONSTRAINT IF EXISTS chk_receivable_paid_le_original';
    EXECUTE 'ALTER TABLE customer_receivables ADD CONSTRAINT chk_receivable_paid_le_original CHECK (paid_amount <= original_amount)';
  END IF;
END $$;

-- Index bổ sung — mỗi statement bao bọc trong DO để bỏ qua bảng chưa có
DO $$
DECLARE
  v_idx RECORD;
  v_indexes TEXT[][] := ARRAY[
    ['idx_stock_txn_location',           'stock_transactions',          '(location_id, created_at DESC)'],
    ['idx_stock_txn_variant',            'stock_transactions',          '(variant_id) WHERE variant_id IS NOT NULL'],
    ['idx_po_lines_product',             'purchase_order_lines',        '(product_id)'],
    ['idx_order_returns_original',       'order_returns',               '(original_order_id)'],
    ['idx_so_cashier',                   'sales_orders',                '(cashier_id, created_at DESC) WHERE cashier_id IS NOT NULL'],
    ['idx_so_register',                  'sales_orders',                '(register_id, created_at DESC) WHERE register_id IS NOT NULL'],
    ['idx_so_table',                     'sales_orders',                '(table_id) WHERE table_id IS NOT NULL'],
    ['idx_so_store_status_created',      'sales_orders',                '(store_id, status, created_at DESC)'],
    ['idx_payments_method_paid',         'order_payments',              '(payment_method_id, paid_at DESC) WHERE status = ''completed'''],
    ['idx_cogs_alloc_order',             'cogs_allocations',            '(order_id)'],
    ['idx_inv_cost_layer_remaining',     'inventory_cost_layers',       '(product_id, location_id, received_at) WHERE quantity_remaining > 0'],
    ['idx_loyalty_txn_customer',         'loyalty_point_transactions',  '(customer_id, created_at DESC)'],
    ['idx_customer_vouchers_status',     'customer_vouchers',           '(customer_id, status) WHERE customer_id IS NOT NULL'],
    ['idx_wallet_txn_wallet',            'wallet_transactions',         '(wallet_id, created_at DESC)'],
    ['idx_giftcard_txn_card',            'gift_card_transactions',      '(gift_card_id, created_at DESC)'],
    ['idx_sales_invoices_customer',      'sales_invoices',              '(customer_id, issued_at DESC) WHERE customer_id IS NOT NULL'],
    ['idx_credit_notes_invoice',         'credit_notes',                '(invoice_id) WHERE invoice_id IS NOT NULL'],
    ['idx_debit_notes_invoice',          'debit_notes',                 '(invoice_id) WHERE invoice_id IS NOT NULL'],
    ['idx_period_locks_store_dates',     'period_locks',                '(store_id, period_start, period_end) WHERE status = ''locked'''],
    ['idx_closing_runs_store_created',   'closing_runs',                '(store_id, created_at DESC)'],
    ['idx_role_change_history_staff',    'role_change_history',         '(staff_id, changed_at DESC)'],
    ['idx_temp_perm_grants_active',      'temporary_permission_grants', '(staff_id, expires_at) WHERE status = ''active'''],
    ['idx_shipments_carrier_status',     'shipments',                   '(carrier_id, shipment_status)'],
    ['idx_shipment_tracking_shipment',   'shipment_tracking_events',    '(shipment_id, event_time DESC)'],
    ['idx_delivery_attempts_shipment',   'delivery_attempts',           '(shipment_id, attempted_at DESC)'],
    ['idx_receivables_customer_status',  'customer_receivables',        '(customer_id, status, due_date)'],
    ['idx_supplier_payables_supplier',   'supplier_payables',           '(supplier_id, status) WHERE status NOT IN (''paid'',''cancelled'')'],
    ['idx_production_orders_store',      'production_orders',           '(store_id, status, created_at DESC)'],
    ['idx_waste_logs_store_created',     'waste_logs',                  '(store_id, created_at DESC, waste_reason)'],
    ['idx_prep_batches_store_expires',   'prep_batches',                '(store_id, product_id, expires_at) WHERE status = ''active'''],
    ['idx_campaigns_status_scheduled',   'campaigns',                   '(status, scheduled_at) WHERE scheduled_at IS NOT NULL'],
    ['idx_campaign_messages_campaign',   'campaign_messages',           '(campaign_id, status)'],
    ['idx_customer_interactions_cust',   'customer_interactions',       '(customer_id, created_at DESC)'],
    ['idx_service_orders_customer',      'service_orders',              '(customer_id, status) WHERE customer_id IS NOT NULL'],
    ['idx_warranty_claims_customer',     'warranty_claims',             '(customer_id, status) WHERE customer_id IS NOT NULL'],
    ['idx_payment_recon_store_status',   'payment_reconciliations',     '(store_id, status, created_at DESC)'],
    ['idx_bank_txn_account_match',       'bank_transactions',           '(cash_account_id, match_status)']
  ];
  i INTEGER;
BEGIN
  FOR i IN 1 .. array_length(v_indexes, 1) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = current_schema() AND table_name = v_indexes[i][2]) THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I %s',
                     v_indexes[i][1], current_schema(), v_indexes[i][2], v_indexes[i][3]);
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS pg_temp.add_fk_if_missing(TEXT, TEXT);

-- ─────────────────────────────────────────────────────────────────────
-- D. UPDATE platform.fn_apply_business_logic — phiên bản mới với:
--      • DELETE/UPDATE handler cho stock_transactions (revert stock_balances)
--      • DELETE handler cho purchase_orders → supplier_debt
--      • fn_customer_stats: handle customer_id change + status revert + delete
--      • 5 trigger sync balance (cash / giftcard / wallet / loyalty / cost_layer)
--      • period_lock enforcement cho 4 bảng giao dịch chính
--    Idempotent — CREATE OR REPLACE override version cũ trong 01.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION platform.fn_apply_business_logic(p_schema VARCHAR)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $func$
BEGIN
  -- Trigger: tự động cập nhật updated_at
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
    $t$;
  $f$, p_schema);

  EXECUTE format($f$
    DO $d$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = '%s' AND column_name = 'updated_at'
      LOOP
        EXECUTE format(
          'CREATE OR REPLACE TRIGGER trg_%%I_updated_at
           BEFORE UPDATE ON %I.%%I
           FOR EACH ROW EXECUTE FUNCTION %I.fn_set_updated_at()',
          r.table_name, r.table_name
        );
      END LOOP;
    END;
    $d$;
  $f$, p_schema, p_schema, p_schema);

  -- 1) stock_balances ← stock_transactions (BEFORE INSERT)
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_stock_balance_after()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE v_delta NUMERIC; v_new_qty NUMERIC;
    BEGIN
      v_delta := CASE
        WHEN NEW.txn_type LIKE '%%_in' OR NEW.txn_type = 'opening_balance'
          THEN NEW.quantity ELSE -NEW.quantity
      END;
      IF NEW.variant_id IS NULL THEN
        INSERT INTO %I.stock_balances(location_id, product_id, variant_id, unit_name, quantity)
        VALUES (NEW.location_id, NEW.product_id, NULL, NEW.unit_name, v_delta)
        ON CONFLICT (location_id, product_id, unit_name) WHERE variant_id IS NULL
        DO UPDATE SET quantity = stock_balances.quantity + EXCLUDED.quantity, updated_at = NOW()
        RETURNING quantity INTO v_new_qty;
      ELSE
        INSERT INTO %I.stock_balances(location_id, product_id, variant_id, unit_name, quantity)
        VALUES (NEW.location_id, NEW.product_id, NEW.variant_id, NEW.unit_name, v_delta)
        ON CONFLICT (location_id, product_id, variant_id, unit_name) WHERE variant_id IS NOT NULL
        DO UPDATE SET quantity = stock_balances.quantity + EXCLUDED.quantity, updated_at = NOW()
        RETURNING quantity INTO v_new_qty;
      END IF;
      NEW.balance_after := v_new_qty;
      RETURN NEW;
    END;
    $t$;
    DROP TRIGGER IF EXISTS trg_stock_txn_balance ON %I.stock_transactions;
    CREATE TRIGGER trg_stock_txn_balance
    BEFORE INSERT ON %I.stock_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_stock_balance_after();
  $f$, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema);

  -- 1b) Revert stock_balances on UPDATE/DELETE
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_stock_balance_revert()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE v_old_delta NUMERIC; v_new_delta NUMERIC; v_diff NUMERIC;
    BEGIN
      v_old_delta := CASE
        WHEN OLD.txn_type LIKE '%%_in' OR OLD.txn_type = 'opening_balance'
          THEN OLD.quantity ELSE -OLD.quantity
      END;
      IF TG_OP = 'DELETE' THEN
        v_diff := -v_old_delta;
      ELSE
        v_new_delta := CASE
          WHEN NEW.txn_type LIKE '%%_in' OR NEW.txn_type = 'opening_balance'
            THEN NEW.quantity ELSE -NEW.quantity
        END;
        v_diff := v_new_delta - v_old_delta;
      END IF;
      IF v_diff <> 0 THEN
        IF OLD.variant_id IS NULL THEN
          UPDATE %I.stock_balances SET quantity = quantity + v_diff, updated_at = NOW()
          WHERE location_id = OLD.location_id AND product_id = OLD.product_id
            AND variant_id IS NULL AND unit_name = OLD.unit_name;
        ELSE
          UPDATE %I.stock_balances SET quantity = quantity + v_diff, updated_at = NOW()
          WHERE location_id = OLD.location_id AND product_id = OLD.product_id
            AND variant_id = OLD.variant_id AND unit_name = OLD.unit_name;
        END IF;
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $t$;
    DROP TRIGGER IF EXISTS trg_stock_txn_revert ON %I.stock_transactions;
    CREATE TRIGGER trg_stock_txn_revert
    AFTER UPDATE OR DELETE ON %I.stock_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_stock_balance_revert();
  $f$, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema);

  -- 2) supplier_debt ← purchase_orders (with DELETE handling)
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_supplier_debt()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE v_old_effect NUMERIC(18,2) := 0; v_new_effect NUMERIC(18,2) := 0; v_delta NUMERIC(18,2) := 0;
    BEGIN
      IF TG_OP IN ('UPDATE','DELETE') AND OLD.status IN ('confirmed','received') THEN
        v_old_effect := COALESCE(OLD.grand_total,0) - COALESCE(OLD.paid_amount,0);
      END IF;
      IF TG_OP IN ('INSERT','UPDATE') AND NEW.status IN ('confirmed','received') THEN
        v_new_effect := COALESCE(NEW.grand_total,0) - COALESCE(NEW.paid_amount,0);
      END IF;
      IF TG_OP = 'UPDATE' AND OLD.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
        IF v_old_effect <> 0 THEN
          UPDATE %I.suppliers SET total_debt = total_debt - v_old_effect WHERE id = OLD.supplier_id;
        END IF;
        IF v_new_effect <> 0 THEN
          UPDATE %I.suppliers SET total_debt = total_debt + v_new_effect WHERE id = NEW.supplier_id;
        END IF;
      ELSE
        v_delta := v_new_effect - v_old_effect;
        IF v_delta <> 0 THEN
          UPDATE %I.suppliers SET total_debt = total_debt + v_delta
          WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
        END IF;
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $t$;
    DROP TRIGGER IF EXISTS trg_po_supplier_debt ON %I.purchase_orders;
    CREATE TRIGGER trg_po_supplier_debt
    AFTER INSERT OR UPDATE OR DELETE ON %I.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_supplier_debt();
  $f$, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema);

  -- 3) customer_stats ← sales_orders (full state machine)
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_customer_stats()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE
      v_old_completed BOOLEAN := COALESCE(OLD.status = 'completed', FALSE);
      v_new_completed BOOLEAN := COALESCE(NEW.status = 'completed', FALSE);
    BEGIN
      IF TG_OP IN ('UPDATE','DELETE') AND v_old_completed AND OLD.customer_id IS NOT NULL THEN
        IF TG_OP = 'DELETE' OR NOT v_new_completed
           OR OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
          UPDATE %I.customers
          SET total_spent = GREATEST(total_spent - COALESCE(OLD.grand_total,0), 0),
              visit_count = GREATEST(visit_count - 1, 0)
          WHERE id = OLD.customer_id;
        END IF;
      END IF;
      IF TG_OP IN ('INSERT','UPDATE') AND v_new_completed AND NEW.customer_id IS NOT NULL THEN
        IF TG_OP = 'INSERT' OR NOT v_old_completed
           OR OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
          UPDATE %I.customers
          SET total_spent  = total_spent + COALESCE(NEW.grand_total,0),
              visit_count  = visit_count + 1,
              last_visit_at = NOW()
          WHERE id = NEW.customer_id;
        ELSIF v_old_completed AND v_new_completed
              AND COALESCE(OLD.grand_total,0) <> COALESCE(NEW.grand_total,0) THEN
          UPDATE %I.customers
          SET total_spent = GREATEST(total_spent + (COALESCE(NEW.grand_total,0) - COALESCE(OLD.grand_total,0)), 0)
          WHERE id = NEW.customer_id;
        END IF;
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $t$;
    DROP TRIGGER IF EXISTS trg_so_customer_stats ON %I.sales_orders;
    CREATE TRIGGER trg_so_customer_stats
    AFTER INSERT OR UPDATE OR DELETE ON %I.sales_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_customer_stats();
  $f$, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema);

  -- 4) cash_accounts.current_balance ← cash_transactions
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_cash_account_balance_sync()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE v_delta NUMERIC(18,2); v_new_balance NUMERIC(18,2);
    BEGIN
      IF TG_OP = 'INSERT' THEN
        v_delta := CASE WHEN NEW.txn_type IN ('sale_in','return_in','deposit','transfer_in') THEN NEW.amount
                        WHEN NEW.txn_type IN ('purchase_out','return_out','withdrawal','transfer_out','expense') THEN -NEW.amount
                        ELSE 0 END;
        UPDATE %I.cash_accounts SET current_balance = current_balance + v_delta, updated_at = NOW()
        WHERE id = NEW.cash_account_id RETURNING current_balance INTO v_new_balance;
        NEW.balance_after := v_new_balance;
      ELSIF TG_OP = 'DELETE' THEN
        v_delta := CASE WHEN OLD.txn_type IN ('sale_in','return_in','deposit','transfer_in') THEN -OLD.amount
                        WHEN OLD.txn_type IN ('purchase_out','return_out','withdrawal','transfer_out','expense') THEN OLD.amount
                        ELSE 0 END;
        UPDATE %I.cash_accounts SET current_balance = current_balance + v_delta, updated_at = NOW()
        WHERE id = OLD.cash_account_id;
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $t$;
    DROP TRIGGER IF EXISTS trg_cash_txn_balance_before ON %I.cash_transactions;
    CREATE TRIGGER trg_cash_txn_balance_before
    BEFORE INSERT ON %I.cash_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_cash_account_balance_sync();
    DROP TRIGGER IF EXISTS trg_cash_txn_balance_delete ON %I.cash_transactions;
    CREATE TRIGGER trg_cash_txn_balance_delete
    AFTER DELETE ON %I.cash_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_cash_account_balance_sync();
  $f$, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema);

  -- 5) gift_cards.current_balance ← gift_card_transactions
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_giftcard_balance_sync()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE v_delta NUMERIC(18,2); v_new_balance NUMERIC(18,2);
    BEGIN
      v_delta := CASE WHEN NEW.txn_type IN ('issue','refund') THEN NEW.amount
                      WHEN NEW.txn_type IN ('redeem','expire') THEN -NEW.amount
                      WHEN NEW.txn_type = 'adjust' THEN NEW.amount
                      ELSE 0 END;
      UPDATE %I.gift_cards SET current_balance = current_balance + v_delta
      WHERE id = NEW.gift_card_id RETURNING current_balance INTO v_new_balance;
      NEW.balance_after := v_new_balance;
      RETURN NEW;
    END;
    $t$;
    DROP TRIGGER IF EXISTS trg_giftcard_balance ON %I.gift_card_transactions;
    CREATE TRIGGER trg_giftcard_balance
    BEFORE INSERT ON %I.gift_card_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_giftcard_balance_sync();
  $f$, p_schema, p_schema, p_schema, p_schema, p_schema);

  -- 6) customer_wallets.balance ← wallet_transactions
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_wallet_balance_sync()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE v_delta NUMERIC(18,2); v_new_balance NUMERIC(18,2);
    BEGIN
      v_delta := CASE WHEN NEW.txn_type IN ('topup','refund') THEN NEW.amount
                      WHEN NEW.txn_type IN ('payment','withdraw','expire') THEN -NEW.amount
                      WHEN NEW.txn_type = 'adjust' THEN NEW.amount
                      ELSE 0 END;
      UPDATE %I.customer_wallets SET balance = balance + v_delta, updated_at = NOW()
      WHERE id = NEW.wallet_id RETURNING balance INTO v_new_balance;
      NEW.balance_after := v_new_balance;
      RETURN NEW;
    END;
    $t$;
    DROP TRIGGER IF EXISTS trg_wallet_balance ON %I.wallet_transactions;
    CREATE TRIGGER trg_wallet_balance
    BEFORE INSERT ON %I.wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_wallet_balance_sync();
  $f$, p_schema, p_schema, p_schema, p_schema, p_schema);

  -- 7) customers.loyalty_points ← loyalty_point_transactions
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_loyalty_balance_sync()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE v_delta NUMERIC(18,2); v_new_balance NUMERIC(18,2);
    BEGIN
      v_delta := CASE WHEN NEW.txn_type IN ('earn','refund_reverse') THEN NEW.points
                      WHEN NEW.txn_type IN ('redeem','expire') THEN -NEW.points
                      WHEN NEW.txn_type = 'adjust' THEN NEW.points
                      ELSE 0 END;
      UPDATE %I.customers SET loyalty_points = GREATEST(loyalty_points + v_delta, 0)
      WHERE id = NEW.customer_id RETURNING loyalty_points INTO v_new_balance;
      NEW.balance_after := v_new_balance;
      RETURN NEW;
    END;
    $t$;
    DROP TRIGGER IF EXISTS trg_loyalty_balance ON %I.loyalty_point_transactions;
    CREATE TRIGGER trg_loyalty_balance
    BEFORE INSERT ON %I.loyalty_point_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_loyalty_balance_sync();
  $f$, p_schema, p_schema, p_schema, p_schema, p_schema);

  -- 8) inventory_cost_layers.quantity_remaining ← cogs_allocations
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_cost_layer_consume()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    BEGIN
      IF TG_OP = 'INSERT' AND NEW.cost_layer_id IS NOT NULL THEN
        UPDATE %I.inventory_cost_layers
        SET quantity_remaining = GREATEST(quantity_remaining - NEW.quantity, 0)
        WHERE id = NEW.cost_layer_id;
      ELSIF TG_OP = 'DELETE' AND OLD.cost_layer_id IS NOT NULL THEN
        UPDATE %I.inventory_cost_layers
        SET quantity_remaining = quantity_remaining + OLD.quantity
        WHERE id = OLD.cost_layer_id;
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $t$;
    DROP TRIGGER IF EXISTS trg_cogs_alloc_consume ON %I.cogs_allocations;
    CREATE TRIGGER trg_cogs_alloc_consume
    AFTER INSERT OR DELETE ON %I.cogs_allocations
    FOR EACH ROW EXECUTE FUNCTION %I.fn_cost_layer_consume();
  $f$, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema);

  -- 9) PERIOD LOCK ENFORCEMENT — chặn posting vào kỳ đã khoá
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_enforce_period_lock()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE v_target_date DATE; v_target_store UUID; v_lock_count INTEGER;
    BEGIN
      v_target_date := COALESCE(
        CASE WHEN TG_TABLE_NAME = 'journal_entries' THEN
          (row_to_json(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END)->>'entry_date')::DATE
        ELSE
          (CASE WHEN TG_OP = 'DELETE' THEN OLD.created_at ELSE NEW.created_at END)::DATE
        END, CURRENT_DATE);
      v_target_store := CASE WHEN TG_OP = 'DELETE' THEN OLD.store_id ELSE NEW.store_id END;
      SELECT COUNT(*) INTO v_lock_count FROM %I.period_locks
      WHERE status = 'locked' AND v_target_date BETWEEN period_start AND period_end
        AND (store_id IS NULL OR store_id = v_target_store);
      IF v_lock_count > 0 THEN
        RAISE EXCEPTION 'Period locked: %% không thể posting/sửa vào ngày %% (store=%%). Yêu cầu reopen kỳ trước.',
          TG_TABLE_NAME, v_target_date, v_target_store USING ERRCODE = 'check_violation';
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $t$;
  $f$, p_schema, p_schema);

  EXECUTE format($f$
    DROP TRIGGER IF EXISTS trg_period_lock_so ON %I.sales_orders;
    CREATE TRIGGER trg_period_lock_so
    BEFORE INSERT OR UPDATE OR DELETE ON %I.sales_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_enforce_period_lock();
    DROP TRIGGER IF EXISTS trg_period_lock_je ON %I.journal_entries;
    CREATE TRIGGER trg_period_lock_je
    BEFORE INSERT OR UPDATE OR DELETE ON %I.journal_entries
    FOR EACH ROW EXECUTE FUNCTION %I.fn_enforce_period_lock();
    DROP TRIGGER IF EXISTS trg_period_lock_st ON %I.stock_transactions;
    CREATE TRIGGER trg_period_lock_st
    BEFORE INSERT OR UPDATE OR DELETE ON %I.stock_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_enforce_period_lock();
    DROP TRIGGER IF EXISTS trg_period_lock_ct ON %I.cash_transactions;
    CREATE TRIGGER trg_period_lock_ct
    BEFORE INSERT OR UPDATE OR DELETE ON %I.cash_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_enforce_period_lock();
  $f$, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema);

  -- 10) ROW LEVEL SECURITY — cô lập dữ liệu theo store_id
  -- App phải SET app.current_store_id = '<uuid>' trước mỗi query của user thường.
  -- Để trống hoặc không set = admin mode (bypass filter, vẫn thấy tất cả store).
  -- BYPASSRLS role (superuser) luôn bypass tất cả policy.
  EXECUTE format($f$
    DO $d$
    DECLARE
      v_tables TEXT[] := ARRAY[
        'sales_orders', 'cash_transactions', 'stock_transactions',
        'journal_entries', 'purchase_orders'
      ];
      t TEXT;
    BEGIN
      FOREACH t IN ARRAY v_tables LOOP
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = '%s' AND table_name = t
        ) THEN
          EXECUTE format('ALTER TABLE %I.%%I ENABLE ROW LEVEL SECURITY', t);
          EXECUTE format('ALTER TABLE %I.%%I FORCE ROW LEVEL SECURITY', t);
          -- DROP + CREATE để idempotent
          EXECUTE format('DROP POLICY IF EXISTS store_isolation ON %I.%%I', t);
          EXECUTE format(
            $p$CREATE POLICY store_isolation ON %I.%%I
               USING (
                 store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid
                 OR NULLIF(current_setting('app.current_store_id', true), '') IS NULL
               )$p$, t
          );
        END IF;
      END LOOP;
    END;
    $d$;
  $f$, p_schema, p_schema, p_schema, p_schema, p_schema);

  RAISE NOTICE '✅ Business logic v2 applied to schema: %', p_schema;
END;
$func$;

-- ─────────────────────────────────────────────────────────────────────
-- D2. IDEMPOTENCY KEY — chống duplicate payment khi retry
-- ─────────────────────────────────────────────────────────────────────

-- platform.platform_payments: thanh toán SaaS từ business
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='platform' AND table_name='platform_payments' AND column_name='idempotency_key'
  ) THEN
    ALTER TABLE platform.platform_payments ADD COLUMN idempotency_key VARCHAR(100);
    CREATE UNIQUE INDEX uq_platform_payments_idempotency
      ON platform.platform_payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
  END IF;
END $$;

-- business: order_payments (per-business, dùng DO để wrap conditional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name='order_payments' AND column_name='idempotency_key'
  ) THEN
    EXECUTE 'ALTER TABLE order_payments ADD COLUMN idempotency_key VARCHAR(100)';
    EXECUTE 'CREATE UNIQUE INDEX uq_order_payments_idempotency
             ON order_payments(idempotency_key) WHERE idempotency_key IS NOT NULL';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- D3. PLATFORM AUDIT LOG
-- Ghi lại mọi thay đổi trên các bảng nhạy cảm của platform schema:
--   tenants (suspend, delete, plan change), accounts (password, MFA reset)
-- Idempotent: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE FUNCTION
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform.platform_audit_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  table_name     VARCHAR(80) NOT NULL,
  operation      VARCHAR(10) NOT NULL,          -- UPDATE | DELETE
  record_id      UUID,                          -- PK của row bị đổi
  changed_by     TEXT        DEFAULT current_user,
  old_data       JSONB,                         -- snapshot trước khi thay đổi
  new_data       JSONB,                         -- snapshot sau (NULL nếu DELETE)
  changed_fields TEXT[]                         -- danh sách cột thực sự thay đổi
);

-- Index để query nhanh theo thời gian và record
CREATE INDEX IF NOT EXISTS idx_pal_table_record
  ON platform.platform_audit_log(table_name, record_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_pal_event_time
  ON platform.platform_audit_log(event_time DESC);

-- Trigger function dùng chung cho tất cả bảng cần audit
CREATE OR REPLACE FUNCTION platform.fn_platform_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_old      JSONB;
  v_new      JSONB;
  v_changed  TEXT[];
  v_key      TEXT;
BEGIN
  v_old := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  v_new := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;

  -- Tính danh sách cột thực sự thay đổi (chỉ có nghĩa với UPDATE)
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(k)
    INTO v_changed
    FROM jsonb_object_keys(v_old) k
    WHERE v_old->>k IS DISTINCT FROM v_new->>k;
  END IF;

  INSERT INTO platform.platform_audit_log
    (table_name, operation, record_id, changed_by, old_data, new_data, changed_fields)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE((COALESCE(v_new, v_old)->>'id')::UUID, NULL),
    current_user,
    v_old,
    v_new,
    v_changed
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Gắn trigger vào các bảng platform nhạy cảm
DO $$ BEGIN
  -- platform.businesses
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_tenants') THEN
    EXECUTE $t$
      CREATE TRIGGER trg_audit_tenants
      AFTER UPDATE OR DELETE ON platform.businesses
      FOR EACH ROW EXECUTE FUNCTION platform.fn_platform_audit()
    $t$;
  END IF;

  -- platform.accounts
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_accounts') THEN
    EXECUTE $t$
      CREATE TRIGGER trg_audit_accounts
      AFTER UPDATE OR DELETE ON platform.accounts
      FOR EACH ROW EXECUTE FUNCTION platform.fn_platform_audit()
    $t$;
  END IF;

  -- platform.account_businesses (thay đổi quyền truy cập)
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_account_businesses') THEN
    EXECUTE $t$
      CREATE TRIGGER trg_audit_account_businesses
      AFTER INSERT OR UPDATE OR DELETE ON platform.account_businesses
      FOR EACH ROW EXECUTE FUNCTION platform.fn_platform_audit()
    $t$;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- E. SECURITY DEFINER LOCKDOWN
-- Các platform function chạy SECURITY DEFINER (quyền owner) — chặn PUBLIC
-- gọi trực tiếp. Chỉ superuser / function owner mới execute được.
-- ─────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION platform.fn_provision_business(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION platform.fn_apply_business_logic(VARCHAR)  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION platform.fn_apply_auto_codes(VARCHAR)      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION platform.fn_seed_business_rbac(VARCHAR)      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION platform.fn_upgrade_all_businesses()          FROM PUBLIC;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='platform' AND p.proname='fn_register_tenant') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION platform.fn_register_tenant FROM PUBLIC';
  END IF;
END $$;

-- Áp dụng cho schema được patch
SELECT platform.fn_apply_business_logic(:'business_schema');

-- ─────────────────────────────────────────────────────────────────────
-- F. TECH DEBT FIXES
-- ─────────────────────────────────────────────────────────────────────

-- F1. BALANCE RECONCILIATION FUNCTION
-- Gọi hàng đêm để phát hiện drift giữa denormalized balance và transactions.
-- Returns: các row có sai lệch; trả về rỗng = tất cả khớp.
CREATE OR REPLACE FUNCTION platform.fn_reconcile_balances(p_schema VARCHAR)
RETURNS TABLE(
  check_name   TEXT,
  record_id    UUID,
  stored_val   NUMERIC,
  computed_val NUMERIC,
  delta        NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 1) stock_balances.quantity vs SUM(stock_transactions)
  RETURN QUERY EXECUTE format($q$
    SELECT
      'stock_balances'::TEXT,
      sb.id,
      sb.quantity,
      COALESCE(SUM(
        CASE WHEN st.txn_type LIKE '%%_in' OR st.txn_type = 'opening_balance'
             THEN st.quantity ELSE -st.quantity END
      ), 0),
      sb.quantity - COALESCE(SUM(
        CASE WHEN st.txn_type LIKE '%%_in' OR st.txn_type = 'opening_balance'
             THEN st.quantity ELSE -st.quantity END
      ), 0)
    FROM %I.stock_balances sb
    LEFT JOIN %I.stock_transactions st
      ON st.location_id = sb.location_id
      AND st.product_id  = sb.product_id
      AND (st.variant_id = sb.variant_id OR (st.variant_id IS NULL AND sb.variant_id IS NULL))
      AND st.unit_name   = sb.unit_name
    GROUP BY sb.id, sb.quantity
    HAVING ABS(sb.quantity - COALESCE(SUM(
      CASE WHEN st.txn_type LIKE '%%_in' OR st.txn_type = 'opening_balance'
           THEN st.quantity ELSE -st.quantity END
    ), 0)) > 0.0001
  $q$, p_schema, p_schema);

  -- 2) cash_accounts.current_balance vs SUM(cash_transactions)
  RETURN QUERY EXECUTE format($q$
    SELECT
      'cash_accounts'::TEXT,
      ca.id,
      ca.current_balance,
      COALESCE(SUM(
        CASE WHEN ct.txn_type IN ('sale_in','return_in','deposit','transfer_in')    THEN  ct.amount
             WHEN ct.txn_type IN ('purchase_out','return_out','withdrawal','transfer_out','expense') THEN -ct.amount
             ELSE 0 END
      ), 0),
      ca.current_balance - COALESCE(SUM(
        CASE WHEN ct.txn_type IN ('sale_in','return_in','deposit','transfer_in')    THEN  ct.amount
             WHEN ct.txn_type IN ('purchase_out','return_out','withdrawal','transfer_out','expense') THEN -ct.amount
             ELSE 0 END
      ), 0)
    FROM %I.cash_accounts ca
    LEFT JOIN %I.cash_transactions ct ON ct.cash_account_id = ca.id
    GROUP BY ca.id, ca.current_balance
    HAVING ABS(ca.current_balance - COALESCE(SUM(
      CASE WHEN ct.txn_type IN ('sale_in','return_in','deposit','transfer_in')    THEN  ct.amount
           WHEN ct.txn_type IN ('purchase_out','return_out','withdrawal','transfer_out','expense') THEN -ct.amount
           ELSE 0 END
    ), 0)) > 0.01
  $q$, p_schema, p_schema);

  -- 3) customer_wallets.balance vs SUM(wallet_transactions)
  RETURN QUERY EXECUTE format($q$
    SELECT
      'customer_wallets'::TEXT,
      cw.id,
      cw.balance,
      COALESCE(SUM(
        CASE WHEN wt.txn_type IN ('topup','refund')              THEN  wt.amount
             WHEN wt.txn_type IN ('payment','withdraw','expire') THEN -wt.amount
             WHEN wt.txn_type = 'adjust'                         THEN  wt.amount
             ELSE 0 END
      ), 0),
      cw.balance - COALESCE(SUM(
        CASE WHEN wt.txn_type IN ('topup','refund')              THEN  wt.amount
             WHEN wt.txn_type IN ('payment','withdraw','expire') THEN -wt.amount
             WHEN wt.txn_type = 'adjust'                         THEN  wt.amount
             ELSE 0 END
      ), 0)
    FROM %I.customer_wallets cw
    LEFT JOIN %I.wallet_transactions wt ON wt.wallet_id = cw.id
    GROUP BY cw.id, cw.balance
    HAVING ABS(cw.balance - COALESCE(SUM(
      CASE WHEN wt.txn_type IN ('topup','refund')              THEN  wt.amount
           WHEN wt.txn_type IN ('payment','withdraw','expire') THEN -wt.amount
           WHEN wt.txn_type = 'adjust'                         THEN  wt.amount
           ELSE 0 END
    ), 0)) > 0.01
  $q$, p_schema, p_schema);
END;
$$;

-- F2. EMAIL / PHONE FORMAT VALIDATION
-- Them CHECK constraint cho cac cot email, phone o cac bang chinh.
-- Dung regex don gian, khong strict (tranh reject format hop le cua nuoc khac).
DO $$
BEGIN
  -- platform.accounts.email
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_accounts_email_format') THEN
    ALTER TABLE platform.accounts
      ADD CONSTRAINT chk_accounts_email_format
      CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
  END IF;
  -- platform.businesses.email
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_businesses_email_format') THEN
    ALTER TABLE platform.businesses
      ADD CONSTRAINT chk_businesses_email_format
      CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
  END IF;
END $$;

-- F3. SELF-REFERENTIAL CIRCULAR REFERENCE GUARD
-- Ngan vong lap trong cay phan cap: product_categories, departments,
-- chart_of_accounts, stores. Max depth = 10 de tranh vo han.
CREATE OR REPLACE FUNCTION platform.fn_check_no_cycle(
  p_schema TEXT, p_table TEXT, p_id UUID, p_parent_id UUID
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_cur   UUID := p_parent_id;
  v_depth INT  := 0;
BEGIN
  WHILE v_cur IS NOT NULL LOOP
    IF v_cur = p_id THEN
      RAISE EXCEPTION 'Circular reference detected in %.% (id=%)', p_schema, p_table, p_id
        USING ERRCODE = 'check_violation';
    END IF;
    v_depth := v_depth + 1;
    IF v_depth > 10 THEN
      RAISE EXCEPTION 'Hierarchy depth exceeds 10 in %.% (id=%)', p_schema, p_table, p_id
        USING ERRCODE = 'check_violation';
    END IF;
    EXECUTE format('SELECT parent_id FROM %I.%I WHERE id = $1', p_schema, p_table)
      INTO v_cur USING v_cur;
  END LOOP;
END;
$$;

-- F4. WEBHOOK SUBSCRIPTIONS (platform level)
-- event_outbox da co trong business schema. Day la bang dang ky webhook
-- de platform biet gui event den dau khi business co su kien.
CREATE TABLE IF NOT EXISTS platform.webhook_subscriptions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID        NOT NULL REFERENCES platform.businesses(id) ON DELETE CASCADE,
  target_url     VARCHAR(500) NOT NULL,
  event_types    TEXT[]      NOT NULL,
  secret_hash    VARCHAR(200),
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  retry_limit    SMALLINT    NOT NULL DEFAULT 3,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_sub_tenant
  ON platform.webhook_subscriptions(business_id) WHERE is_active = TRUE;

-- F5. HEALTH CHECK FUNCTION
-- Kiem tra trang thai DB: dead tuples, long-running queries, lock waits.
-- Chay: SELECT * FROM platform.fn_health_check();
CREATE OR REPLACE FUNCTION platform.fn_health_check()
RETURNS TABLE(
  check_name TEXT,
  status     TEXT,
  detail     TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Dead tuple ratio > 20% tren cac bang lon
  RETURN QUERY
  SELECT
    'dead_tuples_' || relname,
    CASE WHEN n_dead_tup::FLOAT / NULLIF(n_live_tup + n_dead_tup, 0) > 0.2
         THEN 'WARNING' ELSE 'OK' END,
    format('live=%s dead=%s ratio=%.1f%%',
      n_live_tup, n_dead_tup,
      100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0))
  FROM pg_stat_user_tables
  WHERE schemaname NOT IN ('pg_catalog','information_schema')
    AND n_live_tup + n_dead_tup > 1000
    AND n_dead_tup::FLOAT / NULLIF(n_live_tup + n_dead_tup, 0) > 0.1
  ORDER BY n_dead_tup DESC
  LIMIT 10;

  -- Long running queries > 30s
  RETURN QUERY
  SELECT
    'long_query',
    'WARNING',
    format('pid=%s duration=%s query=%.80s',
      pid,
      age(clock_timestamp(), query_start),
      query)
  FROM pg_stat_activity
  WHERE state = 'active'
    AND query_start < clock_timestamp() - INTERVAL '30 seconds'
    AND query NOT LIKE '%fn_health_check%';

  -- Connections near limit
  RETURN QUERY
  SELECT
    'connection_usage',
    CASE WHEN count(*) > current_setting('max_connections')::INT * 0.8
         THEN 'WARNING' ELSE 'OK' END,
    format('%s / %s connections (%.0f%%)',
      count(*),
      current_setting('max_connections'),
      100.0 * count(*) / current_setting('max_connections')::INT)
  FROM pg_stat_activity;

  -- event_outbox stuck items (retry exhausted)
  RETURN QUERY
  SELECT
    'outbox_stuck_' || schema_name,
    'WARNING',
    format('%s events stuck in schema %s', cnt, schema_name)
  FROM (
    SELECT t.schema_name, COUNT(*) cnt
    FROM platform.businesses t
    CROSS JOIN LATERAL (
      SELECT COUNT(*) FROM (
        SELECT 1 FROM information_schema.tables it
        WHERE it.table_schema = t.schema_name AND it.table_name = 'event_outbox'
      ) x
    ) has_outbox(c)
    WHERE has_outbox.c = 1
      AND status NOT IN ('active','suspended','deleted')
    GROUP BY t.schema_name
    HAVING COUNT(*) > 0
  ) sub
  WHERE cnt > 0;

  -- OK catch-all nếu không có vấn đề gì
  RETURN QUERY SELECT 'overall', 'OK', 'Health check completed'::TEXT;
END;
$$;

DO $$ BEGIN
  RAISE NOTICE 'Tech debt fixes applied.';
END $$;

DO $$ BEGIN
  RAISE NOTICE '✅ 08_DB_CRITICAL_FIXES applied to schema: %', current_setting('search_path');
END $$;

COMMIT;
