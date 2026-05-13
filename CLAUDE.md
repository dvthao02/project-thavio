# Thavio Platform — AI Rules & Project Guide

> **Đọc file này TRƯỚC khi làm bất cứ điều gì.**
> Đây là nguồn sự thật duy nhất về stack, conventions, và quy tắc dự án.
> Xem `docs/INDEX.md` để navigate toàn bộ tài liệu kỹ thuật.

## 0. AGENT HANDOFF / MCP CONTEXT

Khi token của Claude bị reset, đọc thêm các file sau theo thứ tự:

1. `.ai-context/README.md`
2. `.ai-context/FLOW_STATE.md`
3. `.ai-context/AGENT_RULES.md`
4. `.ai-context/AGENT_HANDOFF_PROTOCOL.md`

Luôn ưu tiên trạng thái live DB và `FLOW_STATE.md` hơn các ghi chú cũ khi có xung đột.

---

## 1. PROJECT OVERVIEW

**Thavio** là nền tảng SaaS POS/ERP đa khách hàng (multi-tenant). Mỗi business có schema PostgreSQL riêng biệt, được clone từ `business_template`.

### Monorepo apps

| App | Tech | Path | Trạng thái |
|---|---|---|---|
| API Core | NestJS 10 + Drizzle ORM + PostgreSQL + Redis | `apps/api-core/` | 🔨 Đang build |
| POS Web | React 18 + Vite + TailwindCSS + Shadcn/ui | `apps/pos-web/` | 🔲 Chưa bắt đầu |
| Admin Web | Next.js 14 + TailwindCSS | `apps/admin-web/` | 🔲 Chưa bắt đầu |
| Customer Web | React 18 + Vite | `apps/customer-web/` | 🔲 Chưa bắt đầu |
| Mobile App | React Native + Expo | `apps/mobile-app/` | 🔲 Chưa bắt đầu |
| Realtime Gateway | Socket.IO + NestJS | `apps/realtime-gateway/` | 🔲 Chưa bắt đầu |
| Worker | BullMQ + Redis | `apps/worker/` | 🔲 Chưa bắt đầu |
| Local Agent | Electron (máy in, ngăn kéo, scanner) | `apps/local-agent/` | 🔲 Chưa bắt đầu |

### Shared packages

| Package | Mô tả | Path |
|---|---|---|
| `@thavio/types` | Shared TypeScript types | `packages/types/` |
| `@thavio/ui` | Shared UI components | `packages/ui/` |
| `@thavio/utils` | Shared utilities | `packages/utils/` |

---

## 2. DATABASE ARCHITECTURE

```
PostgreSQL: pos_master
├── platform.*           ← 37 tables: accounts, businesses, billing, RBAC
├── business_template.*  ← 177 tables: blueprint, clone khi provision
└── business_{code}.*    ← Schema riêng mỗi business (vd: business_test_coffee)
```

### Request flow — Business
```
HTTP Request
  → BusinessMiddleware (verify JWT, set AsyncLocalStorage tenant context)
  → Controller → Service → Repository (extends BaseBusinessRepository)
  → BusinessDbService.getDb(schemaName) → Pool (search_path=business_{code})
```

### Request flow — Platform Admin
```
POST /api/v1/platform/auth/login
  → PlatformMiddleware (verify JWT scope='platform')
  → PlatformController → PlatformService
  → PlatformDbService (search_path=platform)
```

### DB Schema files
```
apps/api-core/src/schema/
├── platform/
│   ├── schema.ts      ← AUTO-GENERATED (drizzle-kit introspect)
│   ├── relations.ts   ← AUTO-GENERATED
│   └── index.ts       ← AUTO-GENERATED (domain-grouped re-exports)
└── business/
    ├── schema.ts      ← AUTO-GENERATED
    ├── relations.ts   ← AUTO-GENERATED
    └── index.ts       ← AUTO-GENERATED
```

**KHÔNG viết tay schema.ts** — luôn sync từ live DB:
```bash
pnpm --filter @thavio/api-core db:sync          # sync cả 2 schema
pnpm --filter @thavio/api-core db:sync:platform
pnpm --filter @thavio/api-core db:sync:business
```

---

## 3. CRITICAL DATABASE RULES

### 3.1 Drizzle numeric() PHẢI wrap bằng String()
```typescript
// ✅ ĐÚNG
sellPrice: String(dto.sellPrice ?? 0)
grandTotal: String(subTotal)

// ❌ SAI — TypeScript error + runtime bug
sellPrice: dto.sellPrice
```

### 3.2 Password columns — follow live DB actual names
```typescript
// ✅ ĐÚNG — platform.accounts
await bcrypt.compare(password, account.password)

// ✅ ĐÚNG — business_template.staff_members
await bcrypt.compare(password, staffMember.passwordHash)

// ❌ SAI — dùng tên không khớp live DB
await bcrypt.compare(password, account.passwordHash)
```

### 3.3 Enum values — phải khớp chính xác với DB check constraint
| Column | Valid values |
|---|---|
| `order_type` | `'pos'` `'table'` `'takeaway'` `'delivery'` `'online'` |
| `order.status` | `'pending'` `'confirmed'` `'processing'` `'ready'` `'partial_paid'` `'completed'` `'cancelled'` `'refunded'` `'partial_refund'` |
| `payment_status` | `'unpaid'` `'partial_paid'` `'paid'` `'overpaid'` `'debt'` `'refunded'` `'partial_refunded'` `'voided'` |
| `kitchen_status` | `'pending'` `'sent'` `'cooking'` `'ready'` `'served'` `'cancelled'` |

### 3.4 Provision business mới — dùng đúng function
```sql
-- ✅ ĐÚNG
SELECT * FROM platform.fn_provision_business('business_code', 'Legal Name', ...)

-- ❌ SAI — đã deprecated
SELECT * FROM platform.fn_provision_tenant(...)
```

### 3.5 search_path — set ở Pool options, KHÔNG dùng pool.on('connect')
```typescript
// ✅ ĐÚNG — set tại TCP startup packet, không race condition
new Pool({ options: `-c search_path="${schema}",public` })

// ❌ SAI — race condition nếu pool đang bận
pool.on('connect', client => client.query('SET search_path=...'))
```

### 3.6 Trước khi code logic liên quan đến bảng mới
Kiểm tra column thực tế trong DB:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'business_template' AND table_name = '{table}'
ORDER BY ordinal_position;
```

### 3.7 Platform table names — đã đổi (KHÔNG dùng tên cũ)
| ❌ Tên cũ | ✅ Tên mới |
|---|---|
| `platform.tenants` | `platform.businesses` |
| `platform.account_tenants` | `platform.account_businesses` |
| `platform.tenant_subscriptions` | `platform.business_subscriptions` |
| `tenant_id` (column) | `business_id` |
| `tenant_code` (column) | `business_code` |

---

## 4. BACKEND — NestJS RULES (`apps/api-core/`)

### 4.1 Cấu trúc module
```
src/modules/
├── platform/          ← Platform-level modules (auth, billing, tenants...)
│   └── {feature}/
│       ├── {feature}.module.ts
│       ├── {feature}.controller.ts
│       ├── {feature}.service.ts
│       └── dto/
└── business/          ← Per-tenant business modules (orders, products...)
    └── {feature}/
        ├── {feature}.module.ts
        ├── {feature}.controller.ts
        ├── {feature}.service.ts
        ├── {feature}.repository.ts   ← extends BaseBusinessRepository
        └── dto/
            ├── create-{feature}.dto.ts   ← Zod schema + inferred type
            └── list-{feature}.dto.ts
```

### 4.2 Repository pattern
```typescript
// Business module → extends BaseBusinessRepository (tự động lấy schema từ AsyncLocalStorage)
@Injectable()
export class OrdersRepository extends BaseBusinessRepository {
  constructor(businessDb: BusinessDbService) { super(businessDb); }
  // this.db → truy cập đúng schema của tenant hiện tại
}

// Platform module → inject PlatformDbService trực tiếp
@Injectable()
export class BusinessesService {
  constructor(private readonly platformDb: PlatformDbService) {}
  private get db() { return this.platformDb.db; }
}
```

### 4.3 Validation — Zod only (KHÔNG dùng class-validator)
```typescript
// AllExceptionsFilter tự động trả HTTP 422 khi ZodError
const { email, password } = LoginSchema.parse(body);
```

### 4.4 Middleware exclusion — tự xử lý trong use(), không dùng forRoutes exclude
```typescript
use(req, res, next) {
  if (req.path.startsWith('/platform/') || req.path.endsWith('/auth/login')) return next();
  // ... verify business JWT
}
```

### 4.5 Path aliases trong `apps/api-core/tsconfig.json`
```typescript
// ✅ DÙNG alias
import { PlatformDbService } from '@common/database/platform-db.service';
import { salesOrders } from '@schema/business';
import { OrdersModule } from '@modules/business/orders/orders.module';

// ❌ KHÔNG dùng relative cross-module
import { PlatformDbService } from '../../../common/database/platform-db.service';
```

| Alias | Maps to |
|---|---|
| `@common/*` | `src/common/*` |
| `@modules/*` | `src/modules/*` |
| `@schema/*` | `src/schema/*` |
| `@config/*` | `src/config/*` |

---

## 5. FRONTEND — REACT RULES (`apps/pos-web/`)

### 5.1 Tech stack
- **React 18 + Vite + TypeScript** (strict mode)
- **TailwindCSS + Shadcn/ui** — UI components
- **Zustand** — client state (auth token, cart, UI state)
- **TanStack Query v5** — server state (fetch/cache/sync)
- **React Router v6** — routing
- **Socket.io client** — realtime events từ `apps/realtime-gateway/`
- **Axios** — HTTP client (instance tại `src/lib/api.ts`)

### 5.2 Cấu trúc feature
```
src/features/{feature}/
  components/   ← UI components
  hooks/        ← useQuery / useMutation hooks
  stores/       ← Zustand store (nếu cần)
  types.ts
  index.ts      ← Re-export public API
```

### 5.3 Auth flow (2-step)
```
Step 1: POST /api/v1/auth/login       → accessToken (chưa có storeId)
Step 2: POST /api/v1/auth/select-store → accessToken (có storeId, dùng cho mọi call)
```

### 5.4 Naming conventions
| Loại | Convention | Ví dụ |
|---|---|---|
| File | kebab-case | `order-card.tsx` |
| Component | PascalCase | `OrderCard` |
| Hook | use prefix | `useOrderList` |
| Store | use{Feature}Store | `useCartStore` |

---

## 6. GIT & COMMIT

### Commit types
```
feat:     tính năng mới
fix:      sửa bug
refactor: tái cấu trúc (không thêm feature, không fix bug)
docs:     cập nhật tài liệu
chore:    build, dependencies
test:     thêm/sửa tests
db:       migration, schema changes
```

### Branch naming
```
feat/ten-tinh-nang
fix/mo-ta-bug
db/migration-name
```

---

## 7. ENVIRONMENT VARIABLES

### `apps/api-core/.env`
```env
DATABASE_URL=postgresql://dvthao:123@localhost:5432/pos_master
JWT_SECRET=pos-master-dev-secret-change-in-production
JWT_EXPIRES_IN=8h
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### `apps/pos-web/.env`
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
VITE_APP_NAME=Thavio POS
```

---

## 8. STARTUP & DEVELOPMENT

### API Core (Windows)
```powershell
cd apps/api-core
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
node node_modules/@nestjs/cli/bin/nest.js start --watch
```

### POS Web
```bash
cd apps/pos-web
pnpm dev   # http://localhost:5173
```

### Test API nhanh
```powershell
# Platform login
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/platform/auth/login" `
  -Method POST `
  -Body '{"email":"admin@pos-master.vn","password":"Admin@123456"}' `
  -ContentType "application/json"

# Health check
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health"
```

### DB commands
```bash
pnpm --filter @thavio/api-core db:sync          # sync Drizzle schema từ live DB
pnpm db:dump                                    # dump SQL source files từ live DB
pnpm db:dump --platform                         # platform only
pnpm db:dump --business                         # business_template only
```

---

## 9. TEST ACCOUNTS

| Role | Email | Password | Scope |
|---|---|---|---|
| Platform Owner | `admin@pos-master.vn` | `Admin@123456` | Full platform (65 permissions) |
| Business Owner | `owner@test-coffee.vn` | `Owner@123456` | business_test_coffee |

**Test data IDs** (business_test_coffee):
```
storeId:   0ec8db42-0c05-4f1f-ba80-5495c67523ea
productId: 51ce0062-9d99-4315-afa6-e5e34ebfc9e0
```

---

## 10. DOCS REFERENCE

> Xem `docs/INDEX.md` để navigate toàn bộ tài liệu.

| Cần biết về... | File |
|---|---|
| Kiến trúc tổng thể | `docs/architecture/SYSTEM_OVERVIEW.md` |
| Database — 214 tables, triggers, functions | `database/DB_OVERVIEW.md` |
| Module boundaries & import rules | `docs/architecture/MODULE_BOUNDARIES.md` |
| RBAC, permissions, auth flow | `docs/modules/RBAC.md` |
| Order flow & enum values | `docs/flows/ORDER_FLOW.md` |
| Inventory trigger & ledger | `docs/database/INVENTORY_OVERVIEW.md` |
| Drizzle schema (auto-generated) | `apps/api-core/src/schema/` |
| SQL source files (auto-generated) | `database/platform/` `database/business/` |

---

## 11. WHAT NOT TO DO

- **KHÔNG** dùng `class-validator` / `@IsString()` — dùng Zod
- **KHÔNG** tạo file `.md` khi không được yêu cầu
- **KHÔNG** import relative xuyên module — dùng `@common/`, `@schema/`, `@modules/`
- **KHÔNG** gọi `fn_provision_tenant` — dùng `fn_provision_business`
- **KHÔNG** chạy `nest start` trực tiếp — dùng `node node_modules/@nestjs/cli/bin/nest.js start --watch`
- **KHÔNG** dùng `pool.on('connect')` để set search_path — dùng `options: '-c search_path=...'`
- **KHÔNG** hardcode `'dine_in'` hay `'retail'` làm `order_type`
- **KHÔNG** query `platform.tenants` — đã đổi thành `platform.businesses`
- **KHÔNG** viết tay `schema.ts` — chạy `db:sync` để pull từ live DB
- **KHÔNG** push thẳng lên `main` — tạo branch trước
- **KHÔNG** reference `apps/api/` — đường dẫn đúng là `apps/api-core/`
