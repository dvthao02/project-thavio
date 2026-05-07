-- ════════════════════════════════════════════════════════════════
-- MODULE 10-A: CHỈ còn 2 loại FK bắt buộc dùng ALTER TABLE:
--   1) SELF-FK: parent_id → cùng bảng (table chưa tồn tại khi chạy CREATE TABLE)
--   2) CROSS-SCHEMA FK: business_template → platform (khác schema)
-- TẤT CẢ FK cùng schema khác đã được khai báo INLINE trong REFERENCES từng bảng.
-- ════════════════════════════════════════════════════════════════

-- ── 1) Self-FK: cây phân cấp (self-referencing) ───────────────────
ALTER TABLE product_categories
  ADD CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES product_categories(id);

ALTER TABLE departments
  ADD CONSTRAINT fk_dept_parent FOREIGN KEY (parent_id) REFERENCES departments(id);

ALTER TABLE chart_of_accounts
  ADD CONSTRAINT fk_coa_parent FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id);

ALTER TABLE stores
  ADD CONSTRAINT fk_store_parent FOREIGN KEY (parent_id) REFERENCES stores(id);

-- ── 2) Cross-schema FK: platform tables ──────────────────────────
ALTER TABLE platform.account_businesses
  ADD CONSTRAINT fk_at_account FOREIGN KEY (account_id) REFERENCES platform.accounts(id),
  ADD CONSTRAINT fk_at_tenant  FOREIGN KEY (business_id)  REFERENCES platform.businesses(id);

ALTER TABLE platform.account_role_bindings
  ADD CONSTRAINT fk_arb_account FOREIGN KEY (account_id) REFERENCES platform.accounts(id),
  ADD CONSTRAINT fk_arb_role    FOREIGN KEY (role_id)    REFERENCES platform.roles(id);

ALTER TABLE platform.role_permissions
  ADD CONSTRAINT fk_rp_role       FOREIGN KEY (role_id)       REFERENCES platform.roles(id),
  ADD CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES platform.permissions(id);

ALTER TABLE platform.auth_sessions
  ADD CONSTRAINT fk_as_account FOREIGN KEY (account_id)         REFERENCES platform.accounts(id),
  ADD CONSTRAINT fk_as_device  FOREIGN KEY (device_identity_id) REFERENCES platform.device_identities(id);

ALTER TABLE platform.business_branches
  ADD CONSTRAINT fk_tb_tenant FOREIGN KEY (business_id) REFERENCES platform.businesses(id);

ALTER TABLE platform.account_branch_access
  ADD CONSTRAINT fk_aba_at     FOREIGN KEY (account_business_id) REFERENCES platform.account_businesses(id),
  ADD CONSTRAINT fk_aba_branch FOREIGN KEY (tenant_branch_id)  REFERENCES platform.business_branches(id);

-- device_bindings.device_identity_id → platform schema
ALTER TABLE business_template.device_bindings
  ADD CONSTRAINT fk_db_device_identity
  FOREIGN KEY (device_identity_id) REFERENCES platform.device_identities(id);


-- ════════════════════════════════════════════════════════════════
-- fn_provision_business: Clone business_template → tenant_{code}
-- ATOMIC: PL/pgSQL EXCEPTION block tạo implicit savepoint tại đầu
-- BEGIN. Nếu lỗi xảy ra, PostgreSQL tự rollback savepoint → toàn
-- bộ DDL (CREATE SCHEMA / CREATE TABLE) + DML (INSERT tenants) đều
-- bị undone. DROP SCHEMA IF EXISTS trong handler là belt-and-suspenders
-- (schema đã bị rollback nên lệnh này là no-op).
-- PostgreSQL DDL IS transactional — khác MySQL.
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION platform.fn_provision_business(
  p_business_code  VARCHAR,
  p_legal_name   VARCHAR,
  p_brand_name   VARCHAR DEFAULT NULL,
  p_email        VARCHAR DEFAULT NULL,
  p_phone        VARCHAR DEFAULT NULL,
  p_plan         VARCHAR DEFAULT 'standard',
  p_timezone     VARCHAR DEFAULT 'Asia/Ho_Chi_Minh'
) RETURNS TABLE(new_business_id UUID, new_schema_name VARCHAR, result_status VARCHAR)
  LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_business_id      UUID;
  v_schema         VARCHAR := 'tenant_' || p_business_code;
  v_schema_created BOOLEAN := FALSE;
  v_table          RECORD;
  v_idx            RECORD;
BEGIN
  IF p_business_code !~ '^[a-z0-9_]{3,50}$' THEN
    RAISE EXCEPTION 'business_code không hợp lệ: %', p_business_code;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.schemata s WHERE s.schema_name = v_schema) THEN
    RAISE EXCEPTION 'Schema "%" đã tồn tại.', v_schema;
  END IF;
  IF EXISTS (SELECT 1 FROM platform.businesses t WHERE t.business_code = p_business_code) THEN
    RAISE EXCEPTION 'business_code "%" đã được đăng ký.', p_business_code;
  END IF;

  EXECUTE format('CREATE SCHEMA %I', v_schema);
  EXECUTE format('ALTER SCHEMA %I OWNER TO %I', v_schema, current_user);
  v_schema_created := TRUE;

  -- Clone tất cả bảng từ business_template (bao gồm ALL columns, constraints, indexes)
  FOR v_table IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'business_template' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    EXECUTE format('CREATE TABLE %I.%I (LIKE business_template.%I INCLUDING ALL)',
      v_schema, v_table.table_name, v_table.table_name);
    EXECUTE format('ALTER TABLE %I.%I OWNER TO %I', v_schema, v_table.table_name, current_user);
  END LOOP;

  -- Đăng ký business
  INSERT INTO platform.businesses (
    business_code, schema_name, legal_name, brand_name,
    email, phone, subscription_plan, timezone_name, status
  ) VALUES (
    p_business_code, v_schema, p_legal_name, p_brand_name,
    p_email, p_phone, p_plan, p_timezone, 'trial'
  ) RETURNING id INTO v_business_id;

  -- Áp dụng business logic (triggers + views)
  PERFORM platform.fn_apply_business_logic(v_schema);
  -- Áp dụng auto-codes
  PERFORM platform.fn_apply_auto_codes(v_schema);
  -- Seed RBAC
  PERFORM platform.fn_seed_business_rbac(v_schema);

  RAISE NOTICE '✅ Tenant "%" tạo xong! Schema: % | ID: %', p_business_code, v_schema, v_business_id;
  RETURN QUERY SELECT v_business_id, v_schema::VARCHAR, 'created'::VARCHAR;

EXCEPTION WHEN OTHERS THEN
  IF v_schema_created THEN
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', v_schema);
    RAISE NOTICE '⚠️ Đã rollback schema "%"', v_schema;
  END IF;
  RAISE;
END;
$$;

-- Gọi example:
-- SELECT * FROM platform.fn_provision_business('myshop','My Shop Co.','My Shop Brand','admin@myshop.vn');

-- fn_upgrade_all_businesses: Áp dụng lại business logic cho tất cả business
CREATE OR REPLACE FUNCTION platform.fn_upgrade_all_businesses() RETURNS VOID
  LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE r RECORD;
BEGIN
  RAISE NOTICE '🚀 Upgrading all tenants...';
  PERFORM platform.fn_apply_business_logic('business_template');
  PERFORM platform.fn_apply_auto_codes('business_template');
  FOR r IN
    SELECT schema_name, business_code FROM platform.businesses
    WHERE status NOT IN ('suspended','deleted')
    ORDER BY created_at
  LOOP
    PERFORM platform.fn_apply_business_logic(r.schema_name);
    PERFORM platform.fn_apply_auto_codes(r.schema_name);
    RAISE NOTICE '  ✅ % (%)', r.business_code, r.schema_name;
  END LOOP;
  RAISE NOTICE '🎉 Upgrade hoàn tất cho tất cả businesss!';
END;
$$;

-- Gọi example:
-- SELECT platform.fn_upgrade_all_businesses();

-- ════════════════════════════════════════════════════════════════
-- fn_apply_business_logic: Áp dụng triggers + views cho 1 schema
-- Gọi: PERFORM platform.fn_apply_business_logic('business_acafe');
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION platform.fn_apply_business_logic(p_schema VARCHAR)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Trigger: tự động cập nhật updated_at
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
    $t$;
  $f$, p_schema);

  -- Gắn trigger updated_at vào tất cả bảng có cột updated_at
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

  -- Trigger: tự động cập nhật balance_after trong stock_transactions (BEFORE INSERT)
  -- Cộng hoặc trừ vào stock_balances tuỳ txn_type. Hỗ trợ variant_id NULL/NOT NULL.
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_stock_balance_after()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE
      v_delta NUMERIC;
      v_new_qty NUMERIC;
    BEGIN
      v_delta := CASE
        WHEN NEW.txn_type LIKE '%%_in' OR NEW.txn_type = 'opening_balance'
          THEN NEW.quantity
          ELSE -NEW.quantity
      END;

      IF NEW.variant_id IS NULL THEN
        INSERT INTO %I.stock_balances(location_id, product_id, variant_id, unit_name, quantity)
        VALUES (NEW.location_id, NEW.product_id, NULL, NEW.unit_name, v_delta)
        ON CONFLICT (location_id, product_id, unit_name) WHERE variant_id IS NULL
        DO UPDATE
        SET quantity = stock_balances.quantity + EXCLUDED.quantity,
            updated_at = NOW()
        RETURNING quantity INTO v_new_qty;
      ELSE
        INSERT INTO %I.stock_balances(location_id, product_id, variant_id, unit_name, quantity)
        VALUES (NEW.location_id, NEW.product_id, NEW.variant_id, NEW.unit_name, v_delta)
        ON CONFLICT (location_id, product_id, variant_id, unit_name) WHERE variant_id IS NOT NULL
        DO UPDATE
        SET quantity = stock_balances.quantity + EXCLUDED.quantity,
            updated_at = NOW()
        RETURNING quantity INTO v_new_qty;
      END IF;

      NEW.balance_after := v_new_qty;
      RETURN NEW;
    END;
    $t$;
  $f$, p_schema, p_schema, p_schema);

  EXECUTE format($f$
    DROP TRIGGER IF EXISTS trg_stock_txn_balance ON %I.stock_transactions;
    CREATE TRIGGER trg_stock_txn_balance
    BEFORE INSERT ON %I.stock_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_stock_balance_after();
  $f$, p_schema, p_schema, p_schema);

  -- Trigger: revert stock_balances khi DELETE / UPDATE quantity của stock_transactions
  -- Bảo toàn ledger consistency nếu admin sửa data thủ công.
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

  -- Trigger: tự động cộng/trừ total_debt supplier
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_supplier_debt()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE
      v_old_effect NUMERIC(18,2) := 0;
      v_new_effect NUMERIC(18,2) := 0;
      v_delta NUMERIC(18,2) := 0;
    BEGIN
      -- Debt effect only counts when PO is financially committed.
      IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.status IN ('confirmed','received') THEN
        v_old_effect := COALESCE(OLD.grand_total, 0) - COALESCE(OLD.paid_amount, 0);
      END IF;

      IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.status IN ('confirmed','received') THEN
        v_new_effect := COALESCE(NEW.grand_total, 0) - COALESCE(NEW.paid_amount, 0);
      END IF;

      IF TG_OP = 'UPDATE' AND OLD.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
        IF v_old_effect <> 0 THEN
          UPDATE %I.suppliers
          SET total_debt = total_debt - v_old_effect
          WHERE id = OLD.supplier_id;
        END IF;

        IF v_new_effect <> 0 THEN
          UPDATE %I.suppliers
          SET total_debt = total_debt + v_new_effect
          WHERE id = NEW.supplier_id;
        END IF;
      ELSE
        v_delta := v_new_effect - v_old_effect;
        IF v_delta <> 0 THEN
          UPDATE %I.suppliers
          SET total_debt = total_debt + v_delta
          WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
        END IF;
      END IF;

      RETURN NEW;
    END;
    $t$;
  $f$, p_schema, p_schema, p_schema, p_schema);

  EXECUTE format($f$
    DROP TRIGGER IF EXISTS trg_po_supplier_debt ON %I.purchase_orders;
    CREATE TRIGGER trg_po_supplier_debt
    AFTER INSERT OR UPDATE OR DELETE ON %I.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_supplier_debt();
  $f$, p_schema, p_schema, p_schema, p_schema);

  -- Trigger: cập nhật customer total_spent + visit_count
  -- Xử lý đầy đủ:
  --   • INSERT (status='completed') → cộng cho customer mới
  --   • UPDATE: status đổi pending→completed → cộng; completed→cancelled/refunded → trừ
  --   • UPDATE: customer_id đổi A→B sau khi completed → trừ A, cộng B
  --   • DELETE row đã completed → trừ
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_customer_stats()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE
      v_old_completed BOOLEAN := COALESCE(OLD.status = 'completed', FALSE);
      v_new_completed BOOLEAN := COALESCE(NEW.status = 'completed', FALSE);
    BEGIN
      -- Trừ doanh số khỏi customer cũ nếu trước đó đã completed
      IF TG_OP IN ('UPDATE','DELETE') AND v_old_completed AND OLD.customer_id IS NOT NULL THEN
        IF TG_OP = 'DELETE'
           OR NOT v_new_completed
           OR OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
          UPDATE %I.customers
          SET total_spent = GREATEST(total_spent - COALESCE(OLD.grand_total,0), 0),
              visit_count = GREATEST(visit_count - 1, 0)
          WHERE id = OLD.customer_id;
        END IF;
      END IF;

      -- Cộng doanh số cho customer mới khi đạt trạng thái completed
      IF TG_OP IN ('INSERT','UPDATE') AND v_new_completed AND NEW.customer_id IS NOT NULL THEN
        IF TG_OP = 'INSERT'
           OR NOT v_old_completed
           OR OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
          UPDATE %I.customers
          SET total_spent  = total_spent + COALESCE(NEW.grand_total,0),
              visit_count  = visit_count + 1,
              last_visit_at = NOW()
          WHERE id = NEW.customer_id;
        ELSIF v_old_completed AND v_new_completed
              AND COALESCE(OLD.grand_total,0) <> COALESCE(NEW.grand_total,0) THEN
          -- Cùng customer, cùng trạng thái completed nhưng total đổi → chỉ điều chỉnh delta
          UPDATE %I.customers
          SET total_spent = GREATEST(total_spent + (COALESCE(NEW.grand_total,0) - COALESCE(OLD.grand_total,0)), 0)
          WHERE id = NEW.customer_id;
        END IF;
      END IF;

      RETURN COALESCE(NEW, OLD);
    END;
    $t$;
  $f$, p_schema, p_schema, p_schema, p_schema);

  EXECUTE format($f$
    DROP TRIGGER IF EXISTS trg_so_customer_stats ON %I.sales_orders;
    CREATE TRIGGER trg_so_customer_stats
    AFTER INSERT OR UPDATE OR DELETE ON %I.sales_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_customer_stats();
  $f$, p_schema, p_schema, p_schema);

  -- ── 5 trigger SYNC BALANCE (critical correctness) ──────────────
  -- 1) cash_accounts.current_balance ← cash_transactions
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

  -- 2) gift_cards.current_balance ← gift_card_transactions
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

  -- 3) customer_wallets.balance ← wallet_transactions
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

  -- 4) customers.loyalty_points ← loyalty_point_transactions (auto-fill balance_after)
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

  -- 5) inventory_cost_layers.quantity_remaining ← cogs_allocations
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

  -- ── PERIOD LOCK ENFORCEMENT ─────────────────────────────────────
  -- Chặn ghi mới / sửa / xoá vào kỳ đã khoá. Áp dụng cho 4 bảng giao dịch chính.
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_enforce_period_lock()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    DECLARE
      v_target_date DATE;
      v_target_store UUID;
      v_lock_count INTEGER;
    BEGIN
      -- Lấy thời gian giao dịch (entry_date cho je, created_at cho các bảng còn lại)
      v_target_date := COALESCE(
        CASE WHEN TG_TABLE_NAME = 'journal_entries' THEN
          (row_to_json(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END)->>'entry_date')::DATE
        ELSE
          (CASE WHEN TG_OP = 'DELETE' THEN OLD.created_at ELSE NEW.created_at END)::DATE
        END,
        CURRENT_DATE
      );
      v_target_store := CASE WHEN TG_OP = 'DELETE' THEN OLD.store_id ELSE NEW.store_id END;

      SELECT COUNT(*) INTO v_lock_count
      FROM %I.period_locks
      WHERE status = 'locked'
        AND v_target_date BETWEEN period_start AND period_end
        AND (store_id IS NULL OR store_id = v_target_store);

      IF v_lock_count > 0 THEN
        RAISE EXCEPTION 'Period locked: %% không thể posting/sửa vào ngày %% (store=%%). Yêu cầu reopen kỳ trước.',
          TG_TABLE_NAME, v_target_date, v_target_store
          USING ERRCODE = 'check_violation';
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $t$;
  $f$, p_schema, p_schema);

  -- Gắn enforcement trigger vào 4 bảng giao dịch (BEFORE INSERT/UPDATE/DELETE)
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

  -- ROW LEVEL SECURITY — cô lập dữ liệu theo store_id
  -- App phải SET app.current_store_id = '<uuid>' trước mỗi query của user thường.
  -- Để trống hoặc không set = admin mode (bypass filter).
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

  RAISE NOTICE '✅ Business logic applied to schema: %', p_schema;
END;
$$;


-- ════════════════════════════════════════════════════════════════
-- fn_apply_auto_codes: Đặt triggers tạo mã auto cho từng schema
-- Prefix: SO, PO, KH, SP, NV, DM, LO, QU, CA, NC
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION platform.fn_apply_auto_codes(p_schema VARCHAR)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- fn_next_code: lấy số thứ tự tiếp theo từ document_sequences
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_next_code(p_doc_type VARCHAR, p_store_id UUID DEFAULT NULL)
    RETURNS VARCHAR LANGUAGE plpgsql AS $t$
    DECLARE
      v_seq RECORD;
      v_num BIGINT;
      v_code VARCHAR;
    BEGIN
      SELECT * INTO v_seq FROM %I.document_sequences
      WHERE doc_type = p_doc_type
        AND (store_id = p_store_id OR store_id IS NULL)
      ORDER BY store_id NULLS LAST LIMIT 1 FOR UPDATE;
      IF NOT FOUND THEN
        INSERT INTO %I.document_sequences(doc_type,store_id,prefix,pad_length)
        VALUES(p_doc_type, p_store_id,
          CASE p_doc_type
            WHEN 'sales_order'     THEN 'SO' WHEN 'purchase_order' THEN 'PO'
            WHEN 'customer'        THEN 'KH' WHEN 'product'        THEN 'SP'
            WHEN 'staff'           THEN 'NV' WHEN 'category'       THEN 'DM'
            WHEN 'stock_location'  THEN 'LO' WHEN 'register'       THEN 'QU'
            WHEN 'work_shift'      THEN 'CA' WHEN 'supplier'       THEN 'NC'
            ELSE UPPER(LEFT(p_doc_type,2))
          END, 6
        )
        RETURNING * INTO v_seq;
      END IF;
      v_num := v_seq.last_number + 1;
      UPDATE %I.document_sequences SET last_number = v_num
      WHERE id = v_seq.id;
      v_code := v_seq.prefix || LPAD(v_num::TEXT, v_seq.pad_length, '0') || v_seq.suffix;
      RETURN v_code;
    END;
    $t$;
  $f$, p_schema, p_schema, p_schema, p_schema);

  -- Trigger auto-code cho sales_orders
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_code_sales_order()
    RETURNS TRIGGER LANGUAGE plpgsql AS $t$
    BEGIN
      IF NEW.order_code IS NULL OR NEW.order_code = '' THEN
        NEW.order_code := %I.fn_next_code('sales_order', NEW.store_id);
      END IF;
      RETURN NEW;
    END; $t$;
    CREATE OR REPLACE TRIGGER trg_so_auto_code
    BEFORE INSERT ON %I.sales_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_code_sales_order();
  $f$, p_schema, p_schema, p_schema, p_schema);

  -- Tương tự cho purchase_orders, staff_members, customers, products, suppliers...
  -- (Mỗi bảng gắn 1 trigger BEFORE INSERT kiểm tra _code IS NULL rồi gọi fn_next_code)

  RAISE NOTICE '✅ Auto-codes applied to schema: %', p_schema;
END;
$$;


-- ════════════════════════════════════════════════════════════════
-- fn_seed_business_rbac: Seed roles + permissions mặc định
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION platform.fn_seed_business_rbac(p_schema VARCHAR)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Roles
  EXECUTE format($f$
    INSERT INTO %I.roles(role_key,role_name,is_system) VALUES
      ('OWNER',   'Chủ cửa hàng',   TRUE),
      ('ADMIN',   'Quản trị viên',   TRUE),
      ('CASHIER', 'Thu ngân',        TRUE),
      ('INVENTORY','Thủ kho',        TRUE),
      ('STAFF',   'Nhân viên',       TRUE),
      ('KITCHEN', 'Bếp / Pha chế',   TRUE),
      ('DELIVERY','Giao hàng',       TRUE)
    ON CONFLICT (role_key) DO NOTHING;
  $f$, p_schema);

  -- Permissions (50 quyền theo module)
  EXECUTE format($f$
    INSERT INTO %I.permissions(permission_key,permission_name,module_key) VALUES
      -- Đơn hàng
      ('order.view',   'Xem đơn hàng',    'order'),
      ('order.create', 'Tạo đơn hàng',    'order'),
      ('order.cancel', 'Huỷ đơn hàng',    'order'),
      ('order.refund', 'Hoàn trả đơn',    'order'),
      -- Thanh toán
      ('payment.process','Xử lý thanh toán','payment'),
      ('payment.discount','Áp dụng giảm giá','payment'),
      -- Sản phẩm
      ('product.view',  'Xem sản phẩm',   'product'),
      ('product.create','Tạo sản phẩm',   'product'),
      ('product.update','Sửa sản phẩm',   'product'),
      ('product.delete','Xoá sản phẩm',   'product'),
      -- Kho
      ('inventory.view',   'Xem tồn kho',     'inventory'),
      ('inventory.adjust', 'Điều chỉnh kho',  'inventory'),
      ('inventory.import', 'Nhập hàng',       'inventory'),
      ('inventory.transfer','Chuyển kho',     'inventory'),
      -- Nhân viên
      ('staff.view',   'Xem nhân viên',   'staff'),
      ('staff.create', 'Tạo nhân viên',   'staff'),
      ('staff.update', 'Sửa nhân viên',   'staff'),
      -- Ca làm việc
      ('shift.open',   'Mở ca',           'shift'),
      ('shift.close',  'Đóng ca',         'shift'),
      -- Khách hàng
      ('customer.view',  'Xem khách hàng', 'customer'),
      ('customer.create','Tạo khách hàng', 'customer'),
      ('customer.update','Sửa khách hàng', 'customer'),
      -- Bàn
      ('table.view',   'Xem bàn',         'table'),
      ('table.manage', 'Quản lý bàn',     'table'),
      -- Báo cáo
      ('report.sales', 'Báo cáo doanh thu','report'),
      ('report.stock', 'Báo cáo kho',     'report'),
      -- Cài đặt
      ('setting.view',   'Xem cài đặt',   'setting'),
      ('setting.update', 'Sửa cài đặt',   'setting')
    ON CONFLICT (permission_key) DO NOTHING;
  $f$, p_schema);

  -- Gán quyền OWNER = tất cả
  EXECUTE format($f$
    INSERT INTO %I.role_permissions(role_id,permission_id)
    SELECT r.id, p.id FROM %I.roles r, %I.permissions p
    WHERE r.role_key = 'OWNER'
    ON CONFLICT DO NOTHING;
  $f$, p_schema, p_schema, p_schema);

  RAISE NOTICE '✅ RBAC seeded for schema: %', p_schema;
END;
$$;
