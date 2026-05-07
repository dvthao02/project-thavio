#!/usr/bin/env bash
set -euo pipefail
if [ -z "${DATABASE_URL:-}" ]; then echo "Missing DATABASE_URL"; exit 1; fi
if [ $# -lt 8 ]; then
  echo "Usage: $0 <business_code> <store_code> <store_name> <owner_username> <owner_password_hash> <owner_full_name> <owner_email> <owner_phone>"
  exit 1
fi
BUSINESS_CODE="$1"
SCHEMA="tenant_${BUSINESS_CODE}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1   -v business_schema="$SCHEMA"   -v business_code="$BUSINESS_CODE"   -v store_code="$2"   -v store_name="$3"   -v owner_username="$4"   -v owner_password_hash="$5"   -v owner_full_name="$6"   -v owner_email="$7"   -v owner_phone="$8"   -f "$ROOT_DIR/04_CREATE_TENANT_OWNER_FIRST_STORE.sql"
echo "DONE: created first store and owner for $BUSINESS_CODE"
