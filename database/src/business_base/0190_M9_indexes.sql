
-- ════════════════════════════════════════════════════════════════
-- MODULE 9: INDEXES — CHẠY SAU KHI TẤT CẢ BẢNG ĐÃ TẠO
-- Bỏ CONCURRENTLY — pgAdmin chạy trong transaction
-- ════════════════════════════════════════════════════════════════
SET search_path TO business_template, platform, public;

-- Products
CREATE INDEX IF NOT EXISTS idx_products_category_id  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_category_display_order ON products(category_id, display_order);
CREATE INDEX IF NOT EXISTS idx_products_barcode       ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_active     ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm     ON products USING gin(product_name gin_trgm_ops);

-- Lookup/orderable catalogs
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_display_order ON product_categories(parent_id, display_order);
CREATE INDEX IF NOT EXISTS idx_brands_display_order                     ON brands(display_order);
CREATE INDEX IF NOT EXISTS idx_units_display_order                      ON units(display_order);
CREATE INDEX IF NOT EXISTS idx_tax_classes_display_order                ON tax_classes(display_order);
CREATE INDEX IF NOT EXISTS idx_product_attribute_groups_display_order   ON product_attribute_groups(display_order);
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_group_display_order ON product_attribute_values(group_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_tags_display_order               ON product_tags(display_order);

-- Tenant lookup
CREATE INDEX IF NOT EXISTS idx_payment_methods_store_display_order      ON payment_methods(store_id, display_order);

-- Sales orders
CREATE INDEX IF NOT EXISTS idx_so_store_status  ON sales_orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_so_created       ON sales_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_so_customer      ON sales_orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_so_store_date    ON sales_orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_so_code          ON sales_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_so_shift         ON sales_orders(shift_id) WHERE shift_id IS NOT NULL;

-- Sales order lines
CREATE INDEX IF NOT EXISTS idx_sol_order_id    ON sales_order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_sol_product_id  ON sales_order_lines(product_id);

-- Stock
CREATE INDEX IF NOT EXISTS idx_stock_bal_location ON stock_balances(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_bal_product  ON stock_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_txn_product  ON stock_transactions(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_txn_ref      ON stock_transactions(ref_type, ref_id);

-- Purchase orders
CREATE INDEX IF NOT EXISTS idx_po_store_status   ON purchase_orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_po_supplier       ON purchase_orders(supplier_id);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_phone   ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_group   ON customers(group_id);

-- Order payments
CREATE INDEX IF NOT EXISTS idx_order_payments_order ON order_payments(order_id);

-- Kitchen
CREATE INDEX IF NOT EXISTS idx_kitchen_order    ON kitchen_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_status   ON kitchen_tickets(status, created_at DESC);

-- Dining tables
CREATE INDEX IF NOT EXISTS idx_tables_store_status ON dining_tables(store_id, status);

-- Realtime events (chưa xử lý)
CREATE INDEX IF NOT EXISTS idx_realtime_pending ON realtime_events(status, created_at) WHERE status = 'pending';

-- Activity logs
CREATE INDEX IF NOT EXISTS idx_activity_entity  ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_store   ON activity_logs(store_id, created_at DESC);

-- Auth sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_account ON platform.auth_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active  ON platform.auth_sessions(account_id, session_status) WHERE session_status = 'active';

-- Platform audit
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant ON platform.audit_events(business_id, created_at DESC);