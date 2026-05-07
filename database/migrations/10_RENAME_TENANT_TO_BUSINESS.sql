-- =====================================================================
-- Migration 10: Rename tenant → business in platform schema
-- Chạy sau khi code đã switch sang naming 'business'
-- Sau khi chạy: cập nhật src/schema/platform/index.ts
--   businesses = platform.table('tenants', ...) → platform.table('businesses', ...)
--   accountBusinesses = platform.table('account_tenants', ...) → 'account_businesses'
--   businessSubscriptions = platform.table('tenant_subscriptions', ...) → 'business_subscriptions'
-- =====================================================================
SET search_path TO platform, public;

BEGIN;

-- 1. Rename tables
ALTER TABLE platform.tenants              RENAME TO businesses;
ALTER TABLE platform.account_tenants      RENAME TO account_businesses;
ALTER TABLE platform.tenant_subscriptions RENAME TO business_subscriptions;

-- 2. Rename columns: tenant_id → business_id
ALTER TABLE platform.account_businesses   RENAME COLUMN tenant_id TO business_id;
ALTER TABLE platform.business_subscriptions RENAME COLUMN tenant_id TO business_id;
ALTER TABLE platform.audit_events         RENAME COLUMN tenant_id TO business_id;
ALTER TABLE platform.tenant_branches      RENAME COLUMN tenant_id TO business_id;
ALTER TABLE platform.tenant_usage_counters RENAME COLUMN tenant_id TO business_id;
ALTER TABLE platform.tenant_usage_daily   RENAME COLUMN tenant_id TO business_id;

-- 3. Rename tenant_code → business_code
ALTER TABLE platform.businesses RENAME COLUMN tenant_code TO business_code;

-- 4. Rename remaining tables with tenant_ prefix (nếu còn)
-- ALTER TABLE platform.tenant_branches      RENAME TO business_branches;
-- ALTER TABLE platform.tenant_usage_counters RENAME TO business_usage_counters;
-- ALTER TABLE platform.tenant_usage_daily    RENAME TO business_usage_daily;

COMMIT;

-- Sau khi chạy: cập nhật lại src/schema/platform/index.ts:
-- businesses = platform.table('businesses', { businessCode: varchar('business_code'...) ... })
-- accountBusinesses = platform.table('account_businesses', { businessId: uuid('business_id')... })
-- businessSubscriptions = platform.table('business_subscriptions', { businessId: uuid('business_id')... })
-- auditLogs.businessId → column('business_id')
