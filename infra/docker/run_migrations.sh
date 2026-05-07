#!/usr/bin/env bash
# =====================================================================
# POS MasterV2 — Migration runner cho Docker dev stack
#
# Scan migrations_source/ + chạy file theo đúng thứ tự:
#   platform_base/         → search_path=platform,public
#   platform_saas_billing/ → search_path=platform,public
#   tenant_base/           → search_path=tenant_template,platform,public
#                            + -v tenant_schema=tenant_template
#   tenant_full_business/  → search_path=tenant_template,platform,public
#                            + -v tenant_schema=tenant_template
#
# Sau khi xong tenant_full_business, chạy 08_DB_CRITICAL_FIXES.sql
# (nếu APPLY_HARDENING=true) để gắn 9 trigger + DDL fixes.
#
# Env vars:
#   MODE             ALL | PLATFORM_ONLY | TENANT_ONLY  (default ALL)
#   DRY_RUN          true | false                       (default false)
#   STOP_ON_ERROR    true | false                       (default true)
#   APPLY_HARDENING  true | false                       (default true)
#   TENANT_SCHEMA    schema target                      (default tenant_template)
# =====================================================================

set -euo pipefail

# ── Load .env ────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "❌ Missing .env. Run 'make env' first."
  exit 1
fi

POSTGRES_USER="${POSTGRES_USER:-posadmin}"
POSTGRES_DB="${POSTGRES_DB:-pos_masterv2}"
TENANT_SCHEMA="${TENANT_SCHEMA:-tenant_template}"
MODE="${MODE:-ALL}"
DRY_RUN="${DRY_RUN:-false}"
STOP_ON_ERROR="${STOP_ON_ERROR:-true}"
APPLY_HARDENING="${APPLY_HARDENING:-true}"

COMPOSE="docker compose"
SVC="postgres"

# Path inside container (mount points trong docker-compose.yml)
CN_SOURCE="/migrations_source"
CN_FIXED="/migrations"

# Path on host
HOST_SOURCE="$(cd ../../database/migrations_source && pwd)"

# ── Colors ───────────────────────────────────────────────────────────
if [ -t 1 ]; then
  C_R=$'\033[0;31m'; C_G=$'\033[0;32m'; C_Y=$'\033[1;33m'
  C_B=$'\033[0;34m'; C_M=$'\033[0;35m'; C_C=$'\033[0;36m'; C_0=$'\033[0m'
else
  C_R=""; C_G=""; C_Y=""; C_B=""; C_M=""; C_C=""; C_0=""
fi

# ── Verify container is up ───────────────────────────────────────────
if [ "$DRY_RUN" != "true" ]; then
  if ! $COMPOSE ps --status=running --services 2>/dev/null | grep -q "^${SVC}$"; then
    echo "${C_R}❌ Container '${SVC}' chưa chạy. Run 'make up' trước.${C_0}"
    exit 1
  fi
  if ! $COMPOSE exec -T "$SVC" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    echo "${C_R}❌ Postgres chưa healthy. Đợi vài giây rồi thử lại.${C_0}"
    exit 1
  fi
fi

# ── Folder order ─────────────────────────────────────────────────────
PLATFORM_FOLDERS=(platform_base platform_saas_billing)
TENANT_FOLDERS=(tenant_base tenant_full_business)

case "$MODE" in
  PLATFORM_ONLY) FOLDERS=("${PLATFORM_FOLDERS[@]}") ;;
  TENANT_ONLY)   FOLDERS=("${TENANT_FOLDERS[@]}") ;;
  ALL)           FOLDERS=("${PLATFORM_FOLDERS[@]}" "${TENANT_FOLDERS[@]}") ;;
  *) echo "${C_R}Unknown MODE=$MODE${C_0}"; exit 1 ;;
esac

# ── Helpers ──────────────────────────────────────────────────────────
search_path_for() {
  case "$1" in
    platform_*) echo "platform,public" ;;
    tenant_*)   echo "${TENANT_SCHEMA},platform,public" ;;
    *)          echo "public" ;;
  esac
}

run_one() {
  local folder="$1" file_basename="$2"
  local container_path="$CN_SOURCE/$folder/$file_basename"
  local sp; sp="$(search_path_for "$folder")"
  local extra=()
  case "$folder" in
    tenant_*) extra=(-v "tenant_schema=${TENANT_SCHEMA}") ;;
  esac

  $COMPOSE exec -T \
    -e "PGOPTIONS=-c search_path=${sp}" \
    "$SVC" psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    --no-psqlrc \
    --quiet \
    "${extra[@]}" \
    -f "$container_path"
}

# ── Main loop ────────────────────────────────────────────────────────
total=0; failed=0
declare -a failed_files

start_ts="$(date +%s)"

for folder in "${FOLDERS[@]}"; do
  echo
  echo "${C_C}═══════════════════════════════════════════════════════${C_0}"
  echo "${C_C}📂 ${folder}${C_0}  ${C_M}(search_path=$(search_path_for "$folder"))${C_0}"
  echo "${C_C}═══════════════════════════════════════════════════════${C_0}"

  if [ ! -d "$HOST_SOURCE/$folder" ]; then
    echo "${C_Y}  ⚠ Folder not found, skipping${C_0}"
    continue
  fi

  while IFS= read -r -d '' file; do
    base="$(basename "$file")"
    total=$((total+1))

    if [ "$DRY_RUN" = "true" ]; then
      echo "  ${C_B}[DRY]${C_0} $folder/$base"
      continue
    fi

    printf "  ${C_B}▶${C_0} %-60s " "$folder/$base"
    if run_one "$folder" "$base" >/tmp/pos_mig.log 2>&1; then
      echo "${C_G}OK${C_0}"
    else
      echo "${C_R}FAILED${C_0}"
      echo "${C_R}─── error log ───${C_0}"
      tail -n 20 /tmp/pos_mig.log
      echo "${C_R}─────────────────${C_0}"
      failed=$((failed+1))
      failed_files+=("$folder/$base")
      if [ "$STOP_ON_ERROR" = "true" ]; then
        echo
        echo "${C_R}❌ STOP_ON_ERROR=true — abort at $folder/$base${C_0}"
        exit 1
      fi
    fi
  done < <(find "$HOST_SOURCE/$folder" -maxdepth 1 -name '*.sql' -type f -print0 | sort -z)
done

# ── Hardening patch (gắn 9 trigger + DDL fixes) ──────────────────────
if [ "$DRY_RUN" != "true" ] && [ "$APPLY_HARDENING" = "true" ] && [ "$MODE" != "PLATFORM_ONLY" ]; then
  echo
  echo "${C_C}═══════════════════════════════════════════════════════${C_0}"
  echo "${C_C}🔧 Hardening: 08_DB_CRITICAL_FIXES.sql → ${TENANT_SCHEMA}${C_0}"
  echo "${C_C}═══════════════════════════════════════════════════════${C_0}"

  if $COMPOSE exec -T "$SVC" psql \
       -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
       -v ON_ERROR_STOP=1 \
       -v "tenant_schema=${TENANT_SCHEMA}" \
       --no-psqlrc --quiet \
       -f "$CN_FIXED/08_DB_CRITICAL_FIXES.sql" >/tmp/pos_mig.log 2>&1; then
    echo "  ${C_G}✓ Hardening applied${C_0}"
  else
    echo "  ${C_R}✗ Hardening FAILED${C_0}"
    tail -n 30 /tmp/pos_mig.log
    failed=$((failed+1))
    failed_files+=("08_DB_CRITICAL_FIXES.sql")
  fi
fi

# ── Summary ──────────────────────────────────────────────────────────
end_ts="$(date +%s)"
elapsed=$((end_ts - start_ts))

echo
echo "${C_C}═══════════════════════════════════════════════════════${C_0}"
echo "${C_C}  Migration summary${C_0}"
echo "${C_C}═══════════════════════════════════════════════════════${C_0}"
echo "  Mode         : $MODE"
echo "  Tenant schema: $TENANT_SCHEMA"
echo "  Total files  : $total"
echo "  Failed       : $failed"
echo "  Elapsed      : ${elapsed}s"
echo "  Hardening    : $APPLY_HARDENING"
if [ $failed -gt 0 ]; then
  echo "${C_R}❌ Failed files:${C_0}"
  printf '  - %s\n' "${failed_files[@]}"
  exit 1
fi
echo "${C_G}✅ DONE${C_0}"
