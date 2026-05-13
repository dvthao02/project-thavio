# FLOW_STATE

## Execution authority

This file is the short-lived execution state for the repo. When a model restarts, read this file first after `CLAUDE.md`.

## Verified current state (2026-05-13)

### Schema
- `apps/api-core/src/schema/platform/schema.ts` — re-synced from live DB.
- `apps/api-core/src/schema/business/schema.ts` — re-synced from live DB.
- `platform` schema: **38 tables** (prior audit reported 40 — 2 were dropped, untracked).
- `business_template` schema: 177 tables. `business_test_coffee` and `business_test`: 177 tables each.

### Security hardening (migration 13 — fully applied 2026-05-13)
- `platform.accounts.password` — **NOT NULL** enforced.
- `business_template.staff_members.password_hash` — **NOT NULL** enforced.
- `chk_accounts_password_not_empty` and `chk_staff_members_password_not_empty` — present.
- `business_template.payment_methods` — RLS enabled (`store_isolation` via `store_id`).
- `staff_password_audit` trigger — active on `business_template.staff_members`, writes to `activity_logs`.
- `chk_session_expiry` — applied to `platform.auth_sessions` (`expires_at IS NULL OR expires_at > started_at`).
- `platform.session_limits` — table created.
- Migration logged in `platform.migration_log` as `13_security_hardening`.

### Null-password audit
- `platform.accounts`: 0 NULL passwords.
- `business_test_coffee.staff_members`: 0 NULL password_hash.

### CLAUDE.md corrections applied
- §3.3 enums: `order.status` now includes `'partial_paid'` and `'partial_refund'`; `payment_status` now includes `'partial_refunded'`.
- §3.4: corrected — `fn_provision_business` does not exist; provisioning is API-layer only.

### Provisioning
- `platform.fn_provision_business` — does not exist.
- `platform.fn_register_business()` — exists but is a no-op stub.
- Business provisioning is handled entirely at the API layer.

### RLS coverage
- Current RLS tables in `business_template`: `cash_transactions`, `journal_entries`, `purchase_orders`, `sales_orders`, `stock_transactions`, `payment_methods` — all use `store_id` isolation.
- `customers`, `payroll_items` have no RLS (no `store_id` or `business_id` column — schema-level isolation applies).

## Open follow-up items

- Identify the 2 platform tables dropped since the May 10 audit (no migration log entry).
- Consider PII encryption for customer and staff data.
- Classify uncategorized platform tables in `scripts/db-sync.js`.
- ~~Apply `password_hash NOT NULL` to provisioned schemas~~ — done 2026-05-13.

## Do not redo unless the DB changes

- Full schema audit completed 2026-05-13 — do not re-run unless a migration is applied.
- Migration 13 fully verified (8/8 PASS) — do not re-apply.
- Use focused validation only for the file or table being changed.
