-- =====================================================================
-- Concurrency ACID tests for supplier debt + stock balances
-- Usage example:
--   psql "$DATABASE_URL" -v business_schema=tenant_acafe -v worker_id=1 -f scripts/concurrency_acid_tests.sql
-- Run this file concurrently in multiple terminals with different worker_id.
-- =====================================================================
\set ON_ERROR_STOP on

-- Required vars:
--   business_schema: target business schema (e.g. tenant_acafe)
--   worker_id: integer worker id (e.g. 1..5)

SELECT set_config('search_path', :'business_schema' || ', platform, public', false);

DO $$
DECLARE
  v_worker INT := COALESCE(NULLIF(current_setting('app.worker_id', true), '')::INT, 0);
BEGIN
  IF v_worker = 0 THEN
    BEGIN
      v_worker := :'worker_id'::INT;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Missing required variable worker_id';
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM stores WHERE store_code = 'TEST_CONC_STORE') THEN
    INSERT INTO stores(store_code, store_name, store_type, is_active)
    VALUES ('TEST_CONC_STORE', 'Concurrency Test Store', 'retail', TRUE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM suppliers WHERE supplier_code = 'SUPP_CONC_001') THEN
    INSERT INTO suppliers(supplier_code, supplier_name, is_active)
    VALUES ('SUPP_CONC_001', 'Supplier Concurrency', TRUE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM stock_locations WHERE location_code = 'CONC_LOC') THEN
    INSERT INTO stock_locations(store_id, location_code, location_name, location_type, is_sellable, is_active)
    SELECT id, 'CONC_LOC', 'Concurrency Location', 'main', TRUE, TRUE
    FROM stores
    WHERE store_code = 'TEST_CONC_STORE';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE product_code = 'PROD_CONC_001') THEN
    INSERT INTO products(product_code, product_name, product_type, is_active)
    VALUES ('PROD_CONC_001', 'Product Concurrency', 'simple', TRUE);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- Test A: Supplier debt under concurrent updates
-- Each worker creates one confirmed PO then updates paid_amount.
-- Expected final debt after all workers:
--   workers * (1000 - 200) = workers * 800
-- ---------------------------------------------------------------------
BEGIN;
SELECT set_config('app.worker_id', :'worker_id', false);

WITH x AS (
  SELECT
    (SELECT id FROM stores WHERE store_code = 'TEST_CONC_STORE') AS store_id,
    (SELECT id FROM suppliers WHERE supplier_code = 'SUPP_CONC_001') AS supplier_id,
    ('PO_CONC_' || :'worker_id')::VARCHAR(50) AS po_code
)
INSERT INTO purchase_orders(
  store_id, supplier_id, po_code, status, grand_total, paid_amount, order_date
)
SELECT store_id, supplier_id, po_code, 'confirmed', 1000, 0, CURRENT_DATE
FROM x
ON CONFLICT (po_code) DO UPDATE
SET status = EXCLUDED.status,
    grand_total = EXCLUDED.grand_total,
    paid_amount = EXCLUDED.paid_amount,
    updated_at = NOW();

UPDATE purchase_orders
SET paid_amount = 200,
    updated_at = NOW()
WHERE po_code = ('PO_CONC_' || :'worker_id');
COMMIT;

-- ---------------------------------------------------------------------
-- Test B: Stock balance under concurrent inserts (variant_id IS NULL)
-- Each worker inserts +10 purchase_in and -3 sale_out => net +7
-- Expected final quantity:
--   workers * 7
-- ---------------------------------------------------------------------
BEGIN;
WITH x AS (
  SELECT
    (SELECT id FROM stores WHERE store_code = 'TEST_CONC_STORE') AS store_id,
    (SELECT id FROM stock_locations WHERE location_code = 'CONC_LOC' LIMIT 1) AS location_id,
    (SELECT id FROM products WHERE product_code = 'PROD_CONC_001') AS product_id
)
INSERT INTO stock_transactions(
  store_id, location_id, product_id, variant_id, unit_name,
  txn_type, ref_type, ref_code, quantity, created_at
)
SELECT store_id, location_id, product_id, NULL, 'piece',
       'purchase_in', 'concurrency_test', ('STK_IN_' || :'worker_id'), 10, NOW()
FROM x;

WITH x AS (
  SELECT
    (SELECT id FROM stores WHERE store_code = 'TEST_CONC_STORE') AS store_id,
    (SELECT id FROM stock_locations WHERE location_code = 'CONC_LOC' LIMIT 1) AS location_id,
    (SELECT id FROM products WHERE product_code = 'PROD_CONC_001') AS product_id
)
INSERT INTO stock_transactions(
  store_id, location_id, product_id, variant_id, unit_name,
  txn_type, ref_type, ref_code, quantity, created_at
)
SELECT store_id, location_id, product_id, NULL, 'piece',
       'sale_out', 'concurrency_test', ('STK_OUT_' || :'worker_id'), 3, NOW()
FROM x;
COMMIT;

-- ---------------------------------------------------------------------
-- Snapshot results for this run
-- ---------------------------------------------------------------------
SELECT
  'supplier_debt' AS metric,
  s.total_debt::TEXT AS value,
  'Expected after N workers: N*800' AS note
FROM suppliers s
WHERE s.supplier_code = 'SUPP_CONC_001';

SELECT
  'stock_qty_null_variant' AS metric,
  sb.quantity::TEXT AS value,
  'Expected after N workers: N*7' AS note
FROM stock_balances sb
JOIN stock_locations l ON l.id = sb.location_id
JOIN products p ON p.id = sb.product_id
WHERE l.location_code = 'CONC_LOC'
  AND p.product_code = 'PROD_CONC_001'
  AND sb.unit_name = 'piece'
  AND sb.variant_id IS NULL;
