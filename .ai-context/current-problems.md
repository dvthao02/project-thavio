# Current Problems

## What is already done

- Platform and business Drizzle schemas re-synced from live DB.
- tenant → business rename applied to DB, CLAUDE.md, docs, and context files.
- Security hardening migration (13) fully applied and verified 8/8:
  - `platform.accounts.password` NOT NULL
  - `business_template.staff_members.password_hash` NOT NULL
  - `payment_methods` RLS with store_isolation
  - `staff_password_audit` trigger writing to `activity_logs`
  - `chk_session_expiry` on `auth_sessions`
  - `platform.session_limits` table created
- CLAUDE.md §3.3 enum tables corrected (partial_paid, partial_refund, partial_refunded added).
- CLAUDE.md §3.4 corrected — fn_provision_business does not exist; provisioning is API-layer only.

## What remains open

- Identify the 2 platform tables dropped since May 10 audit (no migration log entry).
- ~~Apply `password_hash NOT NULL` to provisioned schemas~~ — done 2026-05-13.
- Consider PII encryption for customer and staff data.
- Classify uncategorized tables in `scripts/db-sync.js`.

## Resume point

Start with `CLAUDE.md`, then `.ai-context/FLOW_STATE.md`.
