#!/usr/bin/env bash
# =====================================================================
# create_tenant_full.sh — Tạo business mới qua fn_provision_business()
#
# Usage:
#   DATABASE_URL=postgresql://dvthao:123@localhost:5432/pos_master \
#     ./create_tenant_full.sh <business_code> <legal_name> [brand_name] [email] [phone] [plan]
#
# Example:
#   DATABASE_URL=... ./create_tenant_full.sh acafe 'ACafe Company' 'ACafe' admin@acafe.vn 0900000000 professional
#
# Plans: free | standard | professional | enterprise (default: standard)
# =====================================================================
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Missing DATABASE_URL"
  echo "   Example: DATABASE_URL=postgresql://user:pass@host:5432/pos_master"
  exit 1
fi

if [ $# -lt 2 ]; then
  echo "Usage: $0 <business_code> <legal_name> [brand_name] [email] [phone] [plan]"
  echo "Example: $0 acafe 'ACafe Company' 'ACafe' admin@acafe.vn 0900000000 professional"
  exit 1
fi

BUSINESS_CODE="$1"
LEGAL_NAME="$2"
BRAND_NAME="${3:-$2}"
EMAIL="${4:-}"
PHONE="${5:-}"
PLAN="${6:-standard}"

export PGCLIENTENCODING="${PGCLIENTENCODING:-UTF8}"

echo "Creating business: $BUSINESS_CODE ($LEGAL_NAME) plan=$PLAN ..."

# fn_provision_business handles everything atomically:
#   1. Validates business_code format
#   2. Creates schema + clones business_template tables
#   3. Registers in platform.businesses
#   4. Applies business logic triggers (fn_apply_business_logic)
#   5. Applies auto-codes (fn_apply_auto_codes)
#   6. Seeds RBAC (fn_seed_business_rbac)
#   Rolls back entire schema if any step fails.
RESULT=$(psql "$DATABASE_URL" -t -A -v ON_ERROR_STOP=1 <<SQL
SELECT
  new_business_id::TEXT || '|' || new_schema_name || '|' || result_status
FROM platform.fn_provision_business(
  p_business_code  => '$BUSINESS_CODE',
  p_legal_name   => '$LEGAL_NAME',
  p_brand_name   => '$BRAND_NAME',
  p_email        => NULLIF('$EMAIL', ''),
  p_phone        => NULLIF('$PHONE', ''),
  p_plan         => '$PLAN'
);
SQL
)

if [ -z "$RESULT" ]; then
  echo "❌ fn_provision_business returned no result — check DB logs"
  exit 1
fi

BUSINESS_ID=$(echo "$RESULT" | cut -d'|' -f1)
SCHEMA=$(echo "$RESULT" | cut -d'|' -f2)
STATUS=$(echo "$RESULT" | cut -d'|' -f3)

echo "✅ Tenant provisioned: $BUSINESS_CODE"
echo "   ID:     $BUSINESS_ID"
echo "   Schema: $SCHEMA"
echo "   Status: $STATUS"
echo ""
echo "Next steps:"
echo "  1. Tạo store đầu tiên: ./create_owner_first_store.sh $BUSINESS_CODE ..."
echo "  2. Chạy fixes nếu cần: psql \"\$DATABASE_URL\" -v business_schema=$SCHEMA -f migrations/08_DB_CRITICAL_FIXES.sql"
