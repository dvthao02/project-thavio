# Platform Flow

## Dang Ky Va Tao Cua Hang

Nghiep vu dung cho trang admin he thong khi tao doanh nghiep/cua hang moi.

## Thong Tin Bat Buoc

Khi tao cua hang phai co:

- `businessCode`: ma doanh nghiep, viet thuong, duy nhat, chi gom `a-z`, `0-9`, `_`.
- `legalName`: ten phap ly hoac ten don vi.
- `brandName`: ten hien thi, neu khong nhap thi lay theo `legalName`.
- `email`: Gmail/email lien he cua cua hang.
- `firstStore.storeName`: ten cua hang/chi nhanh dau tien.
- `ownerEmail`: email dang nhap cua admin cua hang.
- `ownerPassword`: mat khau admin cua hang.
- `ownerFullName`: ho ten admin cua hang.

Thong tin nen co them:

- `phone`: so dien thoai lien he.
- `timezone`: mac dinh `Asia/Ho_Chi_Minh`.
- `plan`: mac dinh `standard`.
- `firstStore.storeCode`: mac dinh `STORE001`.
- `firstStore.address`, `firstStore.city`: dia chi cua hang.

## Trang Thai Cua Hang

| Status | Y nghia | Duoc dang nhap |
|---|---|---:|
| `pending` | Moi tao/cho duyet hoac cho kich hoat | No |
| `active` | Dang hoat dong binh thuong | Yes |
| `suspended` | Tam khoa do het dung thu, qua han thanh toan hoac vi pham | No |
| `inactive` | Ngung hoat dong | No |

Business login chi thanh cong khi `platform.businesses.status = 'active'`.

## Dung Thu 10 Ngay

- Nguoi dung co the dang ky tai khoan va tao cua hang dung thu.
- Thoi gian dung thu mac dinh la 10 ngay tinh tu luc kich hoat cua hang.
- Trong thoi gian dung thu, status la `active`.
- Khi het 10 ngay ma chua gia han, he thong tu doi status sang `suspended`.
- Cua hang `suspended` khong duoc dang nhap vao business app/POS/admin cua hang.
- Platform admin hoac billing admin co the gia han, doi goi, hoac kich hoat lai cua hang.

Du lieu can luu de chay nghiep vu trial:

- `trialStartedAt`: thoi diem bat dau dung thu.
- `trialEndsAt`: thoi diem het dung thu.
- `subscriptionPlan`: goi dang dung.
- `subscriptionStatus`: `trialing`, `active`, `past_due`, `suspended`, `cancelled`.
- `status`: trang thai truy cap cua business.

## Luong Tao Cua Hang

1. Admin he thong nhap thong tin doanh nghiep, cua hang dau tien va tai khoan admin cua hang.
2. He thong kiem tra `businessCode` chua ton tai.
3. He thong tao schema rieng: `business_{businessCode}`.
4. Clone bang tu `business_template`.
5. Apply trigger, function, auto code cho schema moi.
6. Tao record trong `platform.businesses`.
7. Seed role mac dinh: `OWNER`, `ADMIN`, `CASHIER`, `INVENTORY`, `KITCHEN`, `DELIVERY`, `STAFF`.
8. Seed permissions va role_permissions cho tenant.
9. Tao cua hang dau tien trong bang `stores`.
10. Tao nhan vien admin dau tien trong bang `staff_members`.
11. Gan role `OWNER` cho admin dau tien theo `staff_role_bindings`.
12. Tra ve `businessId`, `schemaName`, `status`.

Neu loi o bat ky buoc nao sau khi tao schema, phai rollback:

- Xoa schema vua tao.
- Xoa record `platform.businesses` neu da insert.
- Khong de lai tenant dang do.

## Tai Khoan Admin Cua Hang

Tai khoan admin cua hang la `staff_members` trong schema tenant, khong phai `platform.accounts`.

Thong tin dang nhap:

- Co the dang nhap bang `email`, `staff_code` hoac `phone`.
- Bat buoc co mat khau da hash.
- Chi dang nhap duoc khi `is_active = true` va `employment_status = 'active'`.

Quyen mac dinh:

- Admin dau tien duoc gan role `OWNER`.
- Role `OWNER` co toan bo permission trong tenant.
- Neu chi gan role `ADMIN`, khong nen cho phep thao tac owner-level nhu xoa/khoa tenant, thay doi goi dich vu, gan quyen critical neu chua duoc phe duyet.

## Quan Ly User Tren Admin He Thong

Trang admin he thong quan ly user trong `platform.accounts`.

Nghiep vu chinh:

- Xem danh sach user admin.
- Tao user admin moi.
- Cap nhat thong tin user.
- Khoa/mo khoa/vo hieu hoa user.
- Gan role platform cho user.
- Xem lan dang nhap cuoi va trang thai user.

Trang thai user:

| Status | Y nghia |
|---|---|
| `pending` | Moi tao, chua kich hoat |
| `active` | Dang hoat dong |
| `locked` | Bi khoa tam thoi |
| `disabled` | Vo hieu hoa dai han |

## Quyen Can Co Tren Admin He Thong

| Man hinh | Hanh dong | Permission key |
|---|---|---|
| Dashboard | Xem tong quan | `platform.dashboard.view` |
| Businesses | Xem danh sach | `platform.business.view` |
| Businesses | Tao cua hang | `platform.business.create` |
| Businesses | Sua thong tin | `platform.business.update` |
| Businesses | Tam khoa cua hang | `platform.business.suspend` |
| Businesses | Kich hoat lai cua hang | `platform.business.activate` |
| Businesses | Dong cua hang | `platform.business.close` |
| Businesses | Xuat du lieu | `platform.business.export` |
| Businesses | Vao ho tro tenant | `platform.business.impersonate` |
| Accounts | Xem user admin | `platform.account.view` |
| Accounts | Tao user admin | `platform.account.create` |
| Accounts | Sua user admin | `platform.account.update` |
| Accounts | Khoa/mo khoa user | `platform.account.lock` |
| Accounts | Reset mat khau | `platform.account.reset_password` |
| Accounts | Reset MFA | `platform.account.reset_mfa` |
| Subscription | Xem goi dich vu | `platform.subscription.view` |
| Subscription | Doi goi | `platform.subscription.change_plan` |
| Subscription | Gia han | `platform.subscription.renew` |
| Subscription | Tam khoa do qua han | `platform.subscription.suspend` |
| Billing | Xem billing | `platform.billing.view` |
| Billing | Xuat billing | `platform.billing.export` |
| Support | Xem ticket | `platform.support_ticket.view` |
| Support | Cap nhat ticket | `platform.support_ticket.update` |
| Audit | Xem audit log | `platform.audit.view` |
| Settings | Xem cau hinh platform | `platform.system_setting.view` |

## Dieu Kien Khoa Tu Dong Khi Het Trial

Job nen chay dinh ky, vi du moi gio:

1. Tim business co `subscriptionStatus = 'trialing'`.
2. Kiem tra `trialEndsAt < now()`.
3. Neu da het han, update:
   - `subscriptionStatus = 'suspended'`
   - `status = 'suspended'`
4. Ghi audit log voi actor la `system`.
5. Gui thong bao cho owner/admin cua hang.

Khong xoa du lieu khi het trial. Chi khoa truy cap cho den khi gia han hoac duoc admin kich hoat lai.
