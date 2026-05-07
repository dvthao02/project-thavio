#!/usr/bin/env bash
# =====================================================================
# migrate_all_tenants.sh — Chạy 1 migration file lên tất cả business schema
#
# Dùng khi: thêm column/table mới vào business_template và cần apply
#           cho các business hiện có (acafe, phohai, ...).
#
# Usage:
#   DATABASE_URL=postgresql://user:pass@host:5432/pos_master \
#     ./migrate_all_tenants.sh path/to/migration.sql
#
#   # Chỉ 1 business cụ thể:
#   DATABASE_URL=... ./migrate_all_tenants.sh path/to/migration.sql tenant_acafe
#
# Biến môi trường:
#   STOP_ON_ERROR   true (default) | false — dừng nếu 1 business lỗi
#   DRY_RUN         true | false (default) — chỉ in ra danh sách, không chạy
# =====================================================================
set -euo pipefail

MIGRATION_FILE="${1:-}"
TARGET_SCHEMA="${2:-}"          # nếu trỏng → chạy tất cả business
STOP_ON_ERROR="${STOP_ON_ERROR:-true}"
DRY_RUN="${DRY_RUN:-false}"

# ── Validate ──────────────────────────────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Missing DATABASE_URL"
  echo "   Example: DATABASE_URL=postgresql://dvthao:123@localhost:5432/pos_master"
  exit 1
fi

if [ -z "$MIGRATION_FILE" ]; then
  echo "❌ Missing migration file argument"
  echo "   Usage: $0 path/to/migration.sql [business_schema]"
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ File không tồn tại: $MIGRATION_FILE"
  exit 1
fi

export PGCLIENTENCODING="${PGCLIENTENCODING:-UTF8}"

# ── Lấy danh sách business schema ───────────────────────────────────
if [ -n "$TARGET_SCHEMA" ]; then
  SCHEMAS="$TARGET_SCHEMA"
else
  SCHEMAS=$(psql "$DATABASE_URL" -t -A -c \
    "SELECT schema_name FROM platform.businesses
     WHERE status NOT IN ('suspended','deleted')
     ORDER BY created_at;" 2>&1)

  if [ $? -ne 0 ]; then
    echo "❌ Không kết nối được DB hoặc lỗi query platform.businesses"
    exit 1
  fi
fi

if [ -z "$SCHEMAS" ]; then
  echo "⚠️  Không tìm thấy business nào đang active. Kiểm tra platform.businesses."
  exit 0
fi

# ── Summary ───────────────────────────────────────────────────────
SCHEMA_COUNT=$(echo "$SCHEMAS" | wc -l | tr -d ' ')
echo "═══════════════════════════════════════════════════════════"
echo "Migration: $MIGRATION_FILE"
echo "Tenant schemas: $SCHEMA_COUNT"
echo "Stop on error: $STOP_ON_ERROR"
echo "Dry run: $DRY_RUN"
echo "═══════════════════════════════════════════════════════════"

SUCCESS=0
FAIL=0
FAIL_LIST=""

# ── Chạy migration từng business ────────────────────────────────────
for SCHEMA in $SCHEMAS; do
  SCHEMA=$(echo "$SCHEMA" | tr -d '[:space:]')
  [ -z "$SCHEMA" ] && continue

  # Kiểm tra schema có tồn tại không
  EXISTS=$(psql "$DATABASE_URL" -t -A -c \
    "SELECT 1 FROM information_schema.schemata WHERE schema_name = '$SCHEMA';" 2>/dev/null || echo "")

  if [ "$EXISTS" != "1" ]; then
    echo "⚠️  Schema '$SCHEMA' không tồn tại trong DB — bỏ qua"
    continue
  fi

  if [ "$DRY_RUN" = "true" ]; then
    echo "  [DRY RUN] Would apply to: $SCHEMA"
    continue
  fi

  echo -n "  ➜ Applying to $SCHEMA ... "

  if psql "$DATABASE_URL" \
       -v ON_ERROR_STOP=1 \
       -v business_schema="$SCHEMA" \
       -f "$MIGRATION_FILE" \
       > /tmp/migrate_tenant_last.log 2>&1; then
    echo "✅"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "❌"
    FAIL=$((FAIL + 1))
    FAIL_LIST="$FAIL_LIST $SCHEMA"
    echo "    Error log:"
    tail -5 /tmp/migrate_tenant_last.log | sed 's/^/    /'

    if [ "$STOP_ON_ERROR" = "true" ]; then
      echo ""
      echo "❌ Dừng vì STOP_ON_ERROR=true. Các business chưa chạy: chưa được apply."
      echo "   Kiểm tra lỗi và chạy lại với: $0 $MIGRATION_FILE $SCHEMA"
      exit 1
    fi
  fi
done

# ── Kết quả ───────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════"
if [ "$DRY_RUN" = "true" ]; then
  echo "DRY RUN complete — không có thay đổi nào được thực hiện."
else
  echo "Kết quả: ✅ $SUCCESS thành công  |  ❌ $FAIL thất bại"
  if [ -n "$FAIL_LIST" ]; then
    echo "Tenant lỗi:$FAIL_LIST"
    exit 1
  fi
fi
echo "═══════════════════════════════════════════════════════════"
