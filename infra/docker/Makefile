# =====================================================================
# POS MasterV2 — Local Dev Makefile
# Usage: make help
# =====================================================================
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Cho phép thiếu .env (chỉ tải nếu có)
-include .env
export

COMPOSE := docker compose
PG_USER ?= $(POSTGRES_USER)
PG_DB   ?= $(POSTGRES_DB)

.PHONY: help up down restart migrate migrate-platform migrate-tenant migrate-dry psql logs reset status check env

help:  ## Hiển thị help này
	@echo "POS MasterV2 — Local Dev Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

env:  ## Tự tạo .env từ .env.example nếu chưa có
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ Created .env from .env.example"; \
	else \
		echo "ℹ  .env đã tồn tại"; \
	fi

check:  ## Verify docker-compose config + .env
	@if [ ! -f .env ]; then echo "❌ Missing .env. Run: make env"; exit 1; fi
	@$(COMPOSE) config --quiet && echo "✅ docker-compose.yml OK"

up: env check  ## Khởi động PostgreSQL + pgAdmin
	$(COMPOSE) up -d
	@echo ""
	@echo "✅ Postgres : localhost:$(POSTGRES_PORT)"
	@echo "✅ pgAdmin  : http://localhost:$(PGADMIN_PORT)  ($(PGADMIN_EMAIL) / $(PGADMIN_PASSWORD))"
	@echo "💡 Connection: postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:$(POSTGRES_PORT)/$(POSTGRES_DB)"

down:  ## Tắt containers (giữ data volume)
	$(COMPOSE) down

restart:  ## Restart containers
	$(COMPOSE) restart

migrate:  ## Chạy tất cả migrations + hardening
	bash run_migrations.sh

migrate-platform:  ## Chỉ platform_base + platform_saas_billing
	MODE=PLATFORM_ONLY bash run_migrations.sh

migrate-tenant:  ## Chỉ tenant_base + tenant_full_business
	MODE=TENANT_ONLY bash run_migrations.sh

migrate-dry:  ## In thứ tự file sẽ chạy (không execute)
	DRY_RUN=true bash run_migrations.sh

psql:  ## Mở psql shell trong container
	$(COMPOSE) exec postgres psql -U $(PG_USER) -d $(PG_DB)

logs:  ## Tail logs PostgreSQL real-time
	$(COMPOSE) logs -f postgres

status:  ## Kiểm tra container & port
	@$(COMPOSE) ps
	@echo ""
	@$(COMPOSE) exec -T postgres pg_isready -U $(PG_USER) -d $(PG_DB) 2>/dev/null && echo "✅ Postgres healthy" || echo "❌ Postgres not ready"

reset:  ## ⚠️ Xoá toàn bộ data + chạy lại migrations từ đầu
	@echo "⚠️  Sẽ xoá volume pgdata. Tiếp tục? [Ctrl+C để huỷ trong 5s]"
	@sleep 5
	$(COMPOSE) down -v
	$(COMPOSE) up -d
	@echo "⏳ Waiting for Postgres healthy…"
	@for i in $$(seq 1 30); do \
		$(COMPOSE) exec -T postgres pg_isready -U $(PG_USER) -d $(PG_DB) >/dev/null 2>&1 && break; \
		sleep 1; \
	done
	$(MAKE) migrate

new-tenant:  ## Tạo tenant mới: make new-tenant CODE=acafe NAME='ACafe Co.'
	@if [ -z "$(CODE)" ] || [ -z "$(NAME)" ]; then \
		echo "Usage: make new-tenant CODE=acafe NAME='ACafe Co.' [BRAND='ACafe'] [EMAIL=...] [PHONE=...] [PLAN=standard]"; \
		exit 1; \
	fi
	$(COMPOSE) exec -T postgres psql -U $(PG_USER) -d $(PG_DB) -v ON_ERROR_STOP=1 \
		-c "SELECT * FROM platform.fn_provision_tenant('$(CODE)', '$(NAME)', $(if $(BRAND),'$(BRAND)',NULL), $(if $(EMAIL),'$(EMAIL)',NULL), $(if $(PHONE),'$(PHONE)',NULL), $(if $(PLAN),'$(PLAN)','standard'));"
	$(COMPOSE) exec -T postgres psql -U $(PG_USER) -d $(PG_DB) -v ON_ERROR_STOP=1 \
		-v tenant_schema=tenant_$(CODE) -f /migrations/08_DB_CRITICAL_FIXES.sql
	@echo "✅ Tenant tenant_$(CODE) provisioned and hardened"
