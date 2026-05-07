# POS Master v2 — AI Rules & Project Guide

> **Đọc file này TRƯỚC khi làm bất cứ điều gì.** Đây là nguồn sự thật duy nhất về tech stack, conventions, và quy tắc của dự án.

---

## 1. PROJECT OVERVIEW

**POS Master v2** là nền tảng SaaS POS đa khách hàng (multi-tenant), mỗi business có schema PostgreSQL riêng biệt.

| Layer | Tech | Path |
|---|---|---|
| Backend API | NestJS 10 + Drizzle ORM + PostgreSQL + Redis | `apps/api/` |
| Frontend POS | React 18 + Vite + TypeScript + TailwindCSS | `apps/web/` |
| DB Migrations | PostgreSQL raw SQL | `database/migrations/` |
| Shared Types | TypeScript | `packages/types/` |
| Infra | Docker + Nginx | `infra/` |

---

## 2. ARCHITECTURE — SCHEMA-PER-TENANT

```
PostgreSQL: pos_master
├── platform.*          ← Global: accounts, businesses, roles, billing
├── business_template.* ← 177-table blueprint (cloned on provision)
└── business_{code}.*   ← Per-business isolated schema (e.g. business_test_coffee)
```

### Request flow
```
HTTP Request
  → BusinessMiddleware (verify JWT, set AsyncLocalStorage context)
  → Controller → Service → Repository
  → BusinessDbService.getDb(schemaName) → Pool với search_path=business_{code}
```

### Platform Admin flow
```
POST /api/v1/platform/auth/login
  → PlatformMiddleware (verify JWT scope='platform')
  → PlatformController → PlatformService
  → PlatformDbService (search_path=platform)
```

---

## 3. CRITICAL DATABASE RULES

### 3.1 Drizzle numeric() PHẢI dùng String()
```typescript
// ✅ ĐÚNG
sellPrice: String(dto.sellPrice ?? 0)
grandTotal: String(subTotal)

// ❌ SAI — TypeScript error, runtime bug
sellPrice: dto.sellPrice
```

### 3.2 Platform accounts dùng `password` (KHÔNG phải `password_hash`)
```typescript
// ✅ ĐÚNG — actual DB column
await bcrypt.compare(password, account.password)

// ❌ SAI — column không tồn tại
await bcrypt.compare(password, account.passwordHash)
```

### 3.3 Check constraints phải khớp chính xác
| Column | Valid values |
|---|---|
| `order_type` | `'pos'`, `'table'`, `'takeaway'`, `'delivery'`, `'online'` |
| `order.status` | `'pending'`, `'confirmed'`, `'processing'`, `'ready'`, `'completed'`, `'cancelled'`, `'refunded'` |
| `payment_status` | `'unpaid'`, `'partial_paid'`, `'paid'`, `'overpaid'`, `'debt'`, `'refunded'`, `'voided'` |
| `kitchen_status` | `'pending'`, `'sent'`, `'cooking'`, `'ready'`, `'served'`, `'cancelled'` |

### 3.4 Provisioning business mới
Luôn dùng `platform.fn_provision_business()`, KHÔNG dùng `fn_provision_tenant` (đã deprecated):
```sql
SELECT * FROM platform.fn_provision_business('business_code', 'Legal Name', ...)
```

### 3.5 search_path — set ở Pool startup, KHÔNG dùng `pool.on('connect')`
```typescript
// ✅ ĐÚNG — set tại TCP startup packet
new Pool({ options: `-c search_path="${schema}",public` })

// ❌ SAI — race condition nếu pool bận
pool.on('connect', client => client.query('SET search_path=...'))
```

### 3.6 Trước khi viết Drizzle schema cho bảng mới
Chạy `node apps/api/scripts/check-platform.js` hoặc query:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'business_template' AND table_name = '{table}'
ORDER BY ordinal_position;
```

---

## 4. BACKEND API — NestJS RULES

### 4.1 Cấu trúc module
```
src/modules/{feature}/
  {feature}.module.ts
  {feature}.controller.ts
  {feature}.service.ts
  {feature}.repository.ts   ← extends BaseBusinessRepository
  dto/
    create-{feature}.dto.ts  ← Zod schema + type
    list-{feature}.dto.ts
```

### 4.2 Repository pattern
```typescript
// Business modules — extends BaseBusinessRepository
@Injectable()
export class OrdersRepository extends BaseBusinessRepository {
  constructor(businessDb: BusinessDbService) { super(businessDb); }
  // dùng this.db để truy cập DB (tự động theo schema từ AsyncLocalStorage)
}

// Platform modules — inject PlatformDbService trực tiếp
@Injectable()
export class BusinessesService {
  constructor(private readonly platformDb: PlatformDbService) {}
  private get db() { return this.platformDb.db; }
}
```

### 4.3 Validation với Zod (KHÔNG dùng class-validator)
```typescript
// Mọi DTO đều dùng Zod — AllExceptionsFilter tự trả về HTTP 422 khi ZodError
const { email, password } = LoginSchema.parse(body);
```

### 4.4 Middleware tự xử lý exclusion (KHÔNG rely vào forRoutes exclude)
```typescript
// BusinessMiddleware
use(req, res, next) {
  if (req.path.includes('/platform/') || req.path.endsWith('/auth/login')) return next();
  // ...
}
```

### 4.5 Path alias trong tsconfig
```typescript
// ✅ DÙNG alias, không dùng relative import xuyên module
import { PlatformDbService } from '@common/database/platform-db.service';
import { salesOrders } from '@schema/business/orders';
```

Alias đã config trong `apps/api/tsconfig.json`:
- `@common/*` → `src/common/*`
- `@modules/*` → `src/modules/*`
- `@schema/*` → `src/schema/*`

---

## 5. FRONTEND WEB — REACT RULES

### 5.1 Tech stack
- **Vite + React 18 + TypeScript** (strict mode)
- **TailwindCSS + Shadcn/ui** cho UI components
- **Zustand** cho client state (auth token, cart, UI)
- **TanStack Query v5** cho server state (fetch/cache/sync)
- **React Router v6** cho routing
- **Socket.io client** cho realtime events
- **Axios** cho HTTP (instance tại `src/lib/api.ts`)

### 5.2 Cấu trúc feature
```
src/features/{feature}/
  components/    ← UI components của feature này
  hooks/         ← useQuery, useMutation hooks
  stores/        ← Zustand store nếu cần local state
  types.ts       ← Types riêng của feature (nếu không có trong packages/types)
  index.ts       ← Re-export public API
```

### 5.3 API call convention
```typescript
// ✅ DÙNG TanStack Query cho mọi server state
const { data, isLoading } = useQuery({
  queryKey: ['products', { page, search }],
  queryFn: () => api.get('/products').then(r => r.data),
});

// ✅ Mutation với optimistic update
const mutation = useMutation({
  mutationFn: (dto) => api.post('/orders', dto),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
});
```

### 5.4 Auth flow (2-step)
```
Step 1: POST /api/v1/auth/login → accessToken (no storeId)
Step 2: POST /api/v1/auth/select-store → accessToken (with storeId)
```
Token step 2 mới được dùng cho mọi API call business khác.

### 5.5 Component naming
- Files: `kebab-case.tsx` (e.g. `order-card.tsx`)
- Components: `PascalCase` (e.g. `OrderCard`)
- Hooks: `use` prefix (e.g. `useOrderList`)
- Stores: `use{Feature}Store` (e.g. `useAuthStore`, `useCartStore`)

---

## 6. GIT & COMMIT CONVENTION

```
feat: thêm tính năng mới
fix: sửa bug
refactor: tái cấu trúc code (không thêm feature, không fix bug)
docs: cập nhật documentation
chore: build process, dependency updates
test: thêm/sửa tests
db: thêm migration, thay đổi schema
```

**Branch naming**: `feat/ten-tinh-nang`, `fix/mo-ta-bug`, `db/migration-name`

---

## 7. ENVIRONMENT VARIABLES

### apps/api/.env
```env
DATABASE_URL=postgresql://dvthao:123@localhost:5432/pos_master
JWT_SECRET=pos-master-dev-secret-change-in-production
JWT_EXPIRES_IN=8h
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### apps/web/.env
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
VITE_APP_NAME=POS Master
```

---

## 8. STARTUP & DEVELOPMENT

### Khởi động API (Windows)
```powershell
cd apps/api
# Kill old process nếu cần
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
# Start dev server (auto-reload)
node node_modules/@nestjs/cli/bin/nest.js start --watch
```

### Khởi động Web
```bash
cd apps/web
npm run dev   # hoặc pnpm dev
# Mở http://localhost:5173
```

### Test API nhanh
```powershell
# Platform login
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/platform/auth/login" `
  -Method POST -Body '{"email":"admin@pos-master.vn","password":"Admin@123456"}' `
  -ContentType "application/json"

# Health check
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health"
```

---

## 9. SEEDED TEST ACCOUNTS

| Role | Email | Password | Note |
|---|---|---|---|
| Platform Owner | `admin@pos-master.vn` | `Admin@123456` | Full 65 permissions |
| Business Owner | `owner@test-coffee.vn` | `Owner@123456` | business_test_coffee |

**Test data IDs** (business_test_coffee):
- storeId: `0ec8db42-0c05-4f1f-ba80-5495c67523ea`
- productId: `51ce0062-9d99-4315-afa6-e5e34ebfc9e0`

---

## 10. WHAT NOT TO DO

- **KHÔNG** dùng `class-validator` / `@IsString()` — dự án dùng Zod
- **KHÔNG** tạo file `.md` hay README khi không được yêu cầu
- **KHÔNG** import relative `../../` xuyên module — dùng `@common/`, `@schema/`
- **KHÔNG** gọi `fn_provision_tenant` — dùng `fn_provision_business`
- **KHÔNG** chạy `nest start` với PowerShell trực tiếp — dùng `node node_modules/@nestjs/cli/bin/nest.js`
- **KHÔNG** dùng `SET search_path` trong `pool.on('connect')` — dùng `options: '-c search_path=...'`
- **KHÔNG** hardcode `'dine_in'` hay `'retail'` làm `order_type` — chỉ dùng: `pos|table|takeaway|delivery|online`
- **KHÔNG** query `platform.tenants` — bảng đã đổi thành `platform.businesses`
- **KHÔNG** push thẳng lên `main` — tạo branch trước
