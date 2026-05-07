#!/usr/bin/env bash
# =====================================================================
# backup_business.sh — Backup per-business schema ra file .sql.gz
#
# Usage:
#   # Backup 1 business cụ thể:
#   DATABASE_URL=postgresql://dvthao:123@localhost:5432/pos_master \
#     ./backup_tenant.sh tenant_acafe
#
#   # Backup tất cả business đang active:
#   DATABASE_URL=... ./backup_tenant.sh --all
#
#   # Backup platform schema:
#   DATABASE_URL=... ./backup_tenant.sh platform
#
# Biến môi trường:
#   BACKUP_DIR    Thư mục lưu backup (default: ./backups)
#   KEEP_DAYS     Số ngày giữ backup (default: 30)
# =====================================================================
set -euo pipefail

TARGET="${1:-}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../../backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Missing DATABASE_URL"
  echo "  Example: DATABASE_URL=postgresql://dvthao:123@localhost:5432/pos_master"
  exit 1
fi

if [ -z "$TARGET" ]; then
  echo "Missing argument. Usage:"
  echo "  $0 <schema_name>   — backup 1 schema"
  echo "  $0 --all           — backup tất cả business active"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

backup_schema() {
  local SCHEMA="$1"
  local OUTFILE="$BACKUP_DIR/${SCHEMA}_${TIMESTAMP}.sql.gz"

  echo -n "  Backing up $SCHEMA ... "
  pg_dump "$DATABASE_URL" \
    --schema="$SCHEMA" \
    --no-owner \
    --no-acl \
    --format=plain \
    | gzip > "$OUTFILE"

  local SIZE
  SIZE=$(du -sh "$OUTFILE" | cut -f1)
  echo "done ($SIZE) -> $OUTFILE"
}

if [ "$TARGET" = "--all" ]; then
  # Lấy danh sách tất cả business active
  SCHEMAS=$(psql "$DATABASE_URL" -t -A -c \
    "SELECT schema_name FROM platform.businesses
     WHERE status NOT IN ('suspended','deleted')
     ORDER BY created_at;" 2>&1)

  if [ -z "$SCHEMAS" ]; then
    echo "No active tenants found."
    exit 0
  fi

  COUNT=$(echo "$SCHEMAS" | wc -l | tr -d ' ')
  echo "Backing up $COUNT business(es) + platform schema..."
  echo ""

  backup_schema "platform"
  for SCHEMA in $SCHEMAS; do
    SCHEMA=$(echo "$SCHEMA" | tr -d '[:space:]')
    [ -n "$SCHEMA" ] && backup_schema "$SCHEMA"
  done
else
  backup_schema "$TARGET"
fi

# Xoa backup cu qua KEEP_DAYS ngay
echo ""
echo "Cleaning backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$KEEP_DAYS" -delete -print \
  | sed 's/^/  Deleted: /'

echo ""
echo "Backup complete. Files in: $BACKUP_DIR"
