#!/usr/bin/env bash
set -euo pipefail
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Missing DATABASE_URL, example: postgresql://user:password@localhost:5432/pos_crm_new"
  exit 1
fi
export PGCLIENTENCODING="${PGCLIENTENCODING:-UTF8}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIG_DIR="$ROOT_DIR/migrations"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIG_DIR/01_FULL_NEW_DATABASE_INSTALL.sql"
echo "✅ Step 1/2: platform + business_template DDL installed"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v business_schema=business_template -f "$MIG_DIR/08_DB_CRITICAL_FIXES.sql"
echo "✅ Step 2/3: critical fixes applied to business_template (FKs, CHECKs, triggers, indexes)"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIG_DIR/09_PLATFORM_SUPERADMIN_COMPLETE.sql"
echo "✅ Step 3/3: platform superadmin tables + enforcement functions installed"

echo "DONE: full new database installed and hardened"
