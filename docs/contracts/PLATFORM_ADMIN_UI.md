# Platform Admin UI Contract

## Muc tieu

Tai lieu nay la contract chung cho frontend va backend khi build trang admin he thong Thavio. Frontend duoc phep dung fallback voi field chua co, nhung backend can tien toi response contract nay de tranh lech nghiep vu.

## Nguyen tac nghiep vu

- Business moi dang ky duoc dua vao dung thu 10 ngay.
- Business trong thoi gian trial van duoc dang nhap, nen `business.status = active`.
- Trial khong phai la access status. Trial la trang thai subscription.
- Het trial ma chua gia han thi job he thong chuyen:
  - `business.status = suspended`
  - `businessSubscription.status = suspended`
- `pending` chi dung cho business chua kich hoat xong hoac provisioning dang treo. Khong dung `pending` lam flow mac dinh.
- Platform account la tai khoan admin he thong. Admin cua hang la `staff_members` trong schema business, khong phai platform account.
- Moi hanh dong rui ro cao phai kiem tra permission key va ghi audit log.

## Database hien tai can luu y

Repo dang co lech giua cac lop:

- Migration goc co `platform.businesses.status`: `trial`, `active`, `suspended`, `closed`.
- Drizzle schema hien tai co `platform.businesses.status`: `active`, `pending`, `suspended`, `inactive`.
- Flow doc mong muon access status: `active`, `pending`, `suspended`, `inactive`.
- Migration goc co `business_subscriptions.status`: `trial`, `active`, `past_due`, `cancelled`, `suspended`.
- Flow doc mong muon lifecycle: `trialing`, `active`, `past_due`, `suspended`, `cancelled`.
- Drizzle schema hien tai dang introspect `business_subscriptions.status`: `active`, `inactive`, `cancelled`, `pending`.

Huong chuan hoa de build UI:

- Access status: `active`, `pending`, `suspended`, `inactive`.
- Subscription status: `trialing`, `active`, `past_due`, `suspended`, `cancelled`.
- Neu backend tam thoi tra `trial`, frontend map thanh `trialing`.
- Neu backend tam thoi thieu subscription row, frontend fallback theo `subscriptionExpiresAt` hoac `createdAt`.

## Module navigation

### Tong quan

| Route | Label | Permission |
|---|---|---|
| `/dashboard` | Dashboard | `platform.dashboard.view` |
| `/alerts` | Canh bao & SLA | `platform.dashboard.view` |
| `/audit-logs` | Nhat ky hoat dong | `platform.audit.view` |

### Doanh nghiep

| Route | Label | Permission |
|---|---|---|
| `/businesses` | Danh sach doanh nghiep | `platform.business.view` |
| `/businesses/new` | Tao doanh nghiep | `platform.business.create` |
| `/subscriptions/trials` | Trial & gia han | `platform.subscription.view` |
| `/subscriptions/plans` | Goi dich vu | `platform.subscription.view` |
| `/billing/invoices` | Hop dong & hoa don | `platform.billing.view` |

### Tai khoan & RBAC

| Route | Label | Permission |
|---|---|---|
| `/accounts` | Tai khoan platform | `platform.account.view` |
| `/rbac/roles` | Vai tro platform | `platform.account.view` |
| `/rbac/permissions` | Phan quyen | `platform.account.view` |
| `/sessions` | Phien dang nhap | `platform.account.view` |
| `/security/devices` | MFA & thiet bi | `platform.account.view` |

### Van hanh

| Route | Label | Permission |
|---|---|---|
| `/operations/assignees` | Nhan vien phu trach | `platform.business.view` |
| `/support/tickets` | Ticket ho tro | `platform.support_ticket.view` |
| `/billing/reconciliation` | Doi soat thanh toan | `platform.billing.view` |
| `/support/impersonation` | Impersonate ho tro | `platform.business.impersonate` |

### Cau hinh

| Route | Label | Permission |
|---|---|---|
| `/settings/catalogs` | Danh muc | `platform.system_setting.view` |
| `/integrations/webhooks` | Webhook/API | `platform.system_setting.view` |
| `/settings/security` | Bao mat | `platform.system_setting.view` |

## Businesses list API

### Request

`GET /api/v1/platform/businesses`

Query params:

| Param | Type | Ghi chu |
|---|---|---|
| `search` | string | Tim theo ten, ma, email, phone |
| `status` | `active` \| `pending` \| `suspended` \| `inactive` | Access status |
| `subscriptionStatus` | `trialing` \| `active` \| `past_due` \| `suspended` \| `cancelled` | Lifecycle subscription |
| `assignedAccountId` | uuid | Platform account phu trach |
| `trial` | `active` \| `expiring` \| `expired` | Filter theo ngay trial |
| `plan` | `starter` \| `standard` \| `professional` \| `enterprise` | Goi dang dung |
| `page` | number | Default 1 |
| `limit` | number | Default 20, max 100 |

### Response

```ts
type BusinessListResponse = {
  data: PlatformBusinessRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type PlatformBusinessRow = {
  id: string;
  businessCode: string;
  schemaName?: string;
  legalName: string;
  brandName?: string | null;
  email?: string | null;
  phone?: string | null;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  subscriptionPlan: 'starter' | 'standard' | 'professional' | 'enterprise' | string;
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  trialDaysLeft?: number | null;
  subscriptionExpiresAt?: string | null;
  assignedAccount?: {
    id: string;
    fullName: string;
    email?: string | null;
  } | null;
  firstStore?: {
    storeCode: string;
    storeName: string;
  } | null;
  createdAt: string;
  updatedAt?: string;
};
```

## Business actions

| Action | Endpoint | Permission | Audit |
|---|---|---|---|
| Tao business | `POST /api/v1/platform/businesses` | `platform.business.create` | yes |
| Cap nhat business | `PATCH /api/v1/platform/businesses/:id` | `platform.business.update` | yes |
| Tam khoa | `PATCH /api/v1/platform/businesses/:id/status` | `platform.business.suspend` | high |
| Kich hoat lai | `PATCH /api/v1/platform/businesses/:id/status` | `platform.business.activate` | high |
| Gia han trial | `POST /api/v1/platform/businesses/:id/trial/extend` | `platform.subscription.renew` | high |
| Doi goi | `POST /api/v1/platform/businesses/:id/subscription/change-plan` | `platform.subscription.change_plan` | high |
| Gan nhan vien phu trach | `PATCH /api/v1/platform/businesses/:id/assignee` | `platform.business.update` | yes |
| Impersonate | `POST /api/v1/platform/businesses/:id/impersonate` | `platform.business.impersonate` | critical |

## Audit APIs

Admin UI tach 2 loai audit:

- `platform_audit_log`: thay doi row trong database, phu hop xem INSERT/UPDATE/DELETE va oldData/newData.
- `audit_events`: su kien nghiep vu cua platform admin, vi du login/logout, impersonate, export, reset MFA, change plan.

### Data change logs

`GET /api/v1/platform/audit-logs`

Query params:

| Param | Type | Ghi chu |
|---|---|---|
| `page` | number | Default 1 |
| `limit` | number | Default 50, max 100 |
| `tableName` | string | Vi du `businesses`, `accounts`, `account_businesses` |
| `operation` | `INSERT` \| `UPDATE` \| `DELETE` | Thao tac database |
| `recordId` | uuid | ID ban ghi |
| `from` | ISO datetime | Tu thoi diem |
| `to` | ISO datetime | Den thoi diem |

`GET /api/v1/platform/audit-logs/table-names` tra `string[]`.

### Platform events

`GET /api/v1/platform/audit-logs/events`

Query params:

| Param | Type | Ghi chu |
|---|---|---|
| `page` | number | Default 1 |
| `limit` | number | Default 50, max 100 |
| `eventType` | string | Vi du `platform_login_success`, `platform_logout` |
| `objectType` | string | Vi du `platform_auth`, `business`, `subscription` |
| `objectId` | string | ID doi tuong nghiep vu |
| `accountId` | uuid | Platform account thuc hien |
| `businessId` | uuid | Business lien quan neu co |
| `from` | ISO datetime | Tu thoi diem |
| `to` | ISO datetime | Den thoi diem |

`GET /api/v1/platform/audit-logs/event-types` tra `string[]`.

Moi thao tac admin platform co y nghia nghiep vu nen ghi `audit_events`, khong chi dua vao DB trigger. Cac event type toi thieu:

| Event type | Khi nao ghi |
|---|---|
| `platform_login_success` | Dang nhap platform thanh cong |
| `platform_login_failed` | Dang nhap platform that bai |
| `platform_logout` | Dang xuat platform |
| `platform_impersonate_start` | Bat dau impersonate tenant |
| `platform_impersonate_end` | Ket thuc impersonate tenant |
| `platform_account_status_changed` | Khoa/mo khoa/vo hieu hoa account |
| `platform_mfa_reset` | Reset MFA |
| `platform_business_assigned` | Gan nhan vien phu trach business |
| `platform_subscription_plan_changed` | Doi goi dich vu |
| `platform_export_requested` | Xuat du lieu quan tri |

## Trial rules

- Trial default: 10 ngay.
- `trialStartedAt`: thoi diem kich hoat trial.
- `trialEndsAt`: `trialStartedAt + 10 days`.
- `trialDaysLeft`: backend nen tra so nguyen, tinh theo timezone platform.
- `trial = active`: `subscriptionStatus = trialing` va `trialEndsAt >= now + 2 days`.
- `trial = expiring`: `subscriptionStatus = trialing` va `0 <= trialDaysLeft <= 2`.
- `trial = expired`: `subscriptionStatus = trialing` va `trialEndsAt < now`, hoac access da `suspended` vi het trial.

## Placeholder policy cho frontend

Khi backend chua co field:

- `subscriptionStatus`: map tu `status === active` thanh `trialing` neu `createdAt` trong 10 ngay, nguoc lai `active`.
- `trialEndsAt`: fallback `createdAt + 10 days`.
- `trialDaysLeft`: tinh client-side tu fallback `trialEndsAt`.
- `assignedAccount`: dung mock hien thi `Chua gan` hoac local sample, khong gui action that.
- `firstStore`: fallback `STORE001 - Chi nhanh chinh`.

Fallback chi de demo UI. Backend contract van la nguon dung chuan.
