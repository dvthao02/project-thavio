# RBAC

## Muc tieu

He thong co 2 lop phan quyen rieng nhau:

- **Platform RBAC**: dung cho trang admin he thong, quan ly tai khoan admin, doanh nghiep/cua hang, goi dich vu, ho tro va audit.
- **Business RBAC**: dung cho nhan vien trong tung doanh nghiep/cua hang, quan ly ban hang, kho, nhan vien, bao cao va cau hinh noi bo.

Hai lop quyen nay khong dung chung token va khong duoc tron scope.

## Nguyen tac nghiep vu

- Tai khoan admin he thong dang nhap qua `/api/v1/platform/auth/login`.
- Tai khoan nhan vien cua hang dang nhap theo 2 buoc:
  - Buoc 1: `/api/v1/auth/login` voi `businessCode` va tai khoan nhan vien.
  - Buoc 2: `/api/v1/auth/select-store` de chon cua hang lam viec.
- Moi hanh dong tren admin phai kiem tra theo `permission_key`, khong chi dua vao ten role.
- Quyen gan theo role; user nhan quyen thong qua role binding.
- Role co the gan o scope `platform`, `tenant` hoac `store`.
- Quyen rui ro cao phai co audit log; quyen critical nen yeu cau ly do va/hoac MFA.

## Admin He Thong

### Nhom Role

| Role | Mo ta | Pham vi |
|---|---|---|
| `platform_owner` | Chu he thong | Toan quyen tren platform |
| `platform_admin` | Quan tri van hanh | Quan ly doanh nghiep, tai khoan, trang thai, ho tro |
| `platform_support` | Ho tro khach hang | Xem du lieu can thiet, xu ly ticket, khong thao tac pha huy |
| `platform_billing` | Tai chinh/goi dich vu | Quan ly plan, hoa don, gia han, khoa/mo khoa theo thanh toan |
| `platform_auditor` | Kiem toan | Chi xem log, cau hinh va bao cao |

### Nhom Quyen Cu The

| Nhom | Permission key | Mo ta |
|---|---|---|
| Dashboard | `platform.dashboard.view` | Xem tong quan he thong |
| Business | `platform.business.view` | Xem danh sach doanh nghiep/cua hang |
| Business | `platform.business.create` | Tao doanh nghiep/cua hang moi |
| Business | `platform.business.update` | Cap nhat thong tin doanh nghiep/cua hang |
| Business | `platform.business.suspend` | Tam khoa doanh nghiep/cua hang |
| Business | `platform.business.activate` | Kich hoat lai doanh nghiep/cua hang |
| Business | `platform.business.close` | Dong doanh nghiep/cua hang |
| Business | `platform.business.export` | Xuat danh sach/du lieu business |
| Business | `platform.business.impersonate` | Dang nhap ho tro vao tenant co thoi han |
| Account | `platform.account.view` | Xem tai khoan admin he thong |
| Account | `platform.account.create` | Tao tai khoan admin he thong |
| Account | `platform.account.update` | Sua thong tin tai khoan admin |
| Account | `platform.account.lock` | Khoa/mo khoa/vo hieu hoa tai khoan admin |
| Account | `platform.account.reset_password` | Reset mat khau tai khoan admin |
| Account | `platform.account.reset_mfa` | Reset MFA tai khoan admin |
| Billing | `platform.billing.view` | Xem billing |
| Billing | `platform.billing.export` | Xuat du lieu billing |
| Subscription | `platform.subscription.view` | Xem goi dich vu |
| Subscription | `platform.subscription.change_plan` | Doi goi dich vu |
| Subscription | `platform.subscription.renew` | Gia han goi dich vu |
| Subscription | `platform.subscription.suspend` | Tam khoa do het han/qua han thanh toan |
| Support | `platform.support_ticket.view` | Xem ticket ho tro |
| Support | `platform.support_ticket.update` | Cap nhat ticket ho tro |
| Audit | `platform.audit.view` | Xem nhat ky thao tac |
| Setting | `platform.system_setting.view` | Xem cau hinh platform |

## Admin Cua Hang

Admin cua hang la nhan vien trong tenant, khong phai platform admin. Tai khoan nay duoc tao khi tao cua hang neu co du thong tin:

- `ownerEmail`
- `ownerPassword`
- `ownerFullName`
- `firstStore`

Tai khoan dau tien nen duoc gan role `OWNER`; cac admin sau co the gan role `ADMIN` hoac role tuy bien.

### Nhom Role Mac Dinh

| Role | Mo ta | Pham vi |
|---|---|---|
| `OWNER` | Chu cua hang | Toan quyen trong tenant |
| `ADMIN` | Quan tri cua hang | Quan ly van hanh, nhan vien, san pham, kho, bao cao |
| `CASHIER` | Thu ngan | POS, don hang, thanh toan, ca lam |
| `INVENTORY` | Thu kho | Ton kho, nhap hang, chuyen kho, kiem kho |
| `KITCHEN` | Bep/pha che | Xem va cap nhat trang thai bep |
| `DELIVERY` | Giao hang | Don giao, van chuyen, COD |
| `STAFF` | Nhan vien co ban | Quyen toi thieu theo cua hang |

### Nhom Quyen Cua Hang

| Nhom | Permission key | Mo ta |
|---|---|---|
| POS | `pos.enter` | Vao man hinh POS |
| POS | `pos.open_register` | Mo quay POS |
| POS | `receipt.print` | In hoa don |
| Ca lam | `shift.open` | Mo ca |
| Ca lam | `shift.close` | Dong ca |
| Ca lam | `shift.view` | Xem ca |
| Don hang | `order.view` | Xem don hang |
| Don hang | `order.create` | Tao don hang |
| Don hang | `order.update_draft` | Sua don nhap |
| Don hang | `order.cancel` | Huy don |
| Don hang | `order.void` | Void don |
| Don hang | `order.complete` | Hoan tat don |
| Don hang | `order.discount.apply` | Ap giam gia |
| Don hang | `order.price.override` | Sua gia tai POS |
| Don hang | `order.return` | Tra hang |
| Don hang | `order.exchange` | Doi hang |
| Thanh toan | `payment.view` | Xem thanh toan |
| Thanh toan | `payment.process` | Xu ly thanh toan |
| Thanh toan | `payment.refund` | Hoan tien |
| Thanh toan | `payment.reconcile` | Doi soat thanh toan |
| Cua hang | `store.view` | Xem cua hang |
| Cua hang | `store.create` | Tao cua hang/chi nhanh |
| Cua hang | `store.update` | Sua cua hang |
| Cua hang | `store.disable` | Tat cua hang |
| Cua hang | `store.config.update` | Sua cau hinh cua hang |
| Nhan vien | `staff.view` | Xem nhan vien |
| Nhan vien | `staff.create` | Tao nhan vien |
| Nhan vien | `staff.update` | Sua nhan vien |
| Nhan vien | `staff.disable` | Khoa nhan vien |
| Nhan vien | `staff.assign_store` | Gan nhan vien vao cua hang |
| Nhan vien | `staff.assign_role` | Gan role/quyen nhan vien |
| Nhan vien | `staff.reset_pin` | Reset PIN |
| RBAC | `role.view` | Xem role |
| RBAC | `role.create` | Tao role |
| RBAC | `role.update` | Sua role |
| RBAC | `role.assign_permission` | Gan permission cho role |
| San pham | `product.view` | Xem san pham |
| San pham | `product.create` | Tao san pham |
| San pham | `product.update` | Sua san pham |
| San pham | `product.delete` | Xoa san pham |
| San pham | `product.price.update` | Sua gia ban |
| San pham | `product.cost.update` | Sua gia von |
| Kho | `inventory.view` | Xem ton kho |
| Kho | `inventory.view_cost` | Xem gia tri ton kho |
| Kho | `inventory.adjust` | Dieu chinh kho |
| Kho | `inventory.transfer` | Chuyen kho |
| Kho | `inventory.transfer.approve` | Duyet chuyen kho |
| Kho | `inventory.stocktake` | Kiem kho |
| Kho | `inventory.stocktake.approve` | Chot kiem kho |
| Nhap hang | `purchase.view` | Xem don nhap |
| Nhap hang | `purchase.create` | Tao don nhap |
| Nhap hang | `purchase.receive` | Nhan hang |
| Nha cung cap | `supplier.view` | Xem nha cung cap |
| Nha cung cap | `supplier.create` | Tao nha cung cap |
| Khach hang | `customer.view` | Xem khach hang |
| Khach hang | `customer.create` | Tao khach hang |
| Khach hang | `customer.update` | Sua khach hang |
| Loyalty | `loyalty.view` | Xem loyalty |
| Loyalty | `loyalty.manage` | Quan ly loyalty |
| Bao cao | `report.sales.view` | Xem bao cao doanh thu |
| Bao cao | `report.inventory.view` | Xem bao cao kho |
| Bao cao | `report.profit.view` | Xem bao cao loi nhuan |
| Bao cao | `report.staff.view` | Xem bao cao nhan vien |
| Bao cao | `report.export` | Xuat bao cao |
| Cau hinh | `setting.view` | Xem cau hinh |
| Cau hinh | `setting.update` | Sua cau hinh |
| Audit | `activity_log.view` | Xem log hoat dong |

## Quyen Rui Ro Cao

Nhung quyen sau phai ghi audit log va nen yeu cau ly do thao tac:

- `platform.business.suspend`, `platform.business.activate`, `platform.business.close`, `platform.business.impersonate`
- `platform.account.lock`, `platform.account.reset_password`, `platform.account.reset_mfa`
- `platform.subscription.change_plan`, `platform.subscription.suspend`
- `store.disable`, `staff.assign_role`, `role.assign_permission`
- `order.void`, `order.price.override`, `payment.refund`, `payment.reconcile`
- `inventory.adjust`, `inventory.transfer.approve`, `inventory.stocktake.approve`
- `product.cost.update`, `finance.period.lock`, `finance.period.reopen`

## Ma Tran Role Goi Y

| Permission group | OWNER | ADMIN | CASHIER | INVENTORY | KITCHEN | DELIVERY | STAFF |
|---|---:|---:|---:|---:|---:|---:|---:|
| POS/Order/Payment co ban | Yes | Yes | Yes | No | No | Limited | Limited |
| Refund/Void/Override | Yes | Yes | No | No | No | No | No |
| Store/Config | Yes | Yes | No | No | No | No | No |
| Staff/RBAC | Yes | Limited | No | No | No | No | No |
| Product/Promotion | Yes | Yes | No | Limited | No | No | No |
| Inventory/Purchase | Yes | Yes | No | Yes | No | No | No |
| Kitchen/Table | Yes | Yes | No | No | Yes | No | No |
| Report/Finance | Yes | Yes | No | Limited | No | No | No |
| Audit/Setting | Yes | Limited | No | No | No | No | No |

## Luong Kiem Tra Quyen

1. Xac thuc token va lay `scope`.
2. Kiem tra tai khoan/user con `active`.
3. Lay role bindings theo scope hien tai.
4. Tong hop danh sach `permission_key`.
5. Kiem tra permission can thiet truoc khi chay nghiep vu.
6. Ghi audit log voi thao tac co risk `high` hoac `critical`.
