# Tổng quan Database — `pos_master`

> Cập nhật: 2026-05-06 | PostgreSQL 18 | Schema-per-business multi-tenancy

---

## Số lượng Schema & Table

| Schema | Tables | Mục đích |
|--------|--------|----------|
| `platform` | 28 | Hệ thống SaaS multi-business: auth, billing, subscription |
| `public` | 0 | Rỗng — namespace mặc định PostgreSQL |
| `business_template` | 177 | Template clone cho mỗi business: toàn bộ nghiệp vụ POS/ERP |
| **Tổng** | **205** | |

---

## Kiến trúc tổng thể

```
platform schema                    tenant_XXX schema (clone từ business_template)
─────────────────               ──────────────────────────────────────────────
accounts                         stores ──── registers ──── work_shifts
auth_sessions                       │
business ──┐                        ├── products ──── variants ──── inventory
          │                        ├── customers ──── wallets ──── loyalty
          └── business_template       ├── sales_orders ──── payments
              (177 tables)          ├── purchase_orders ──── supplier_payables
                                   ├── journal_entries ──── chart_of_accounts
                                   └── staff_members ──── roles ──── permissions

Triggers live (sau khi áp 08_DB_CRITICAL_FIXES):
  stock_transactions     → stock_balances           (trg_stock_txn_balance)
  sales_orders           → customers.total_spent    (trg_so_customer_stats)
  purchase_orders        → suppliers.total_debt     (trg_po_supplier_debt)
  cash_transactions      → cash_accounts.balance    (trg_cash_txn_balance_before)
  gift_card_transactions → gift_cards.balance       (trg_giftcard_balance)
  wallet_transactions    → customer_wallets.balance (trg_wallet_balance)
  loyalty_transactions   → customers.loyalty_points (trg_loyalty_balance)
  [so/je/st/ct]          → chặn write kỳ locked     (trg_period_lock_*)
```

---

# SCHEMA: `platform`

> Hạ tầng SaaS: quản lý business, tài khoản hệ thống, billing, subscription.
> **Mỗi khách hàng (business) = 1 row trong `business`**.

---

## Module 1 — Identity & Authentication

### `accounts`
Tài khoản người dùng đăng nhập vào hệ thống platform (admin, owner, staff đã link).

| Column | Type | Giải thích |
|--------|------|------------|
| `id` | uuid | PK, sinh tự động |
| `username` | varchar | Tên đăng nhập, unique |
| `password` | varchar | Mật khẩu đã hash (bcrypt) |
| `full_name` | varchar | Họ tên hiển thị |
| `email` | varchar | Email liên hệ |
| `phone` | varchar | SĐT |
| `avatar_url` | varchar | Link ảnh đại diện |
| `status` | varchar | `active` / `suspended` / `deleted` |
| `is_platform_admin` | boolean | Super admin của toàn bộ platform |
| `last_login_at` | timestamptz | Lần đăng nhập cuối |

---

### `auth_sessions`
Phiên đăng nhập (JWT session). Lưu token hash thay vì token gốc để bảo mật.

| Column | Giải thích |
|--------|------------|
| `session_token_hash` | Hash của access token — dùng để verify, không lưu token rõ |
| `refresh_token_hash` | Hash của refresh token để gia hạn session |
| `login_method` | `password` / `pin` / `sso` |
| `session_status` | `active` / `revoked` / `expired` |
| `ip_address` | IP đăng nhập |
| `expires_at` | Thời điểm token hết hạn |
| `revoked_at` | Thời điểm bị thu hồi (logout / force logout) |
| `last_activity_at` | Cập nhật mỗi khi có request — dùng cho sliding expiry |

---

### `account_mfa_methods`
Các phương thức xác thực 2 lớp (MFA) của tài khoản.

| Column | Giải thích |
|--------|------------|
| `method_type` | `totp` (Google Authenticator) / `sms` / `email` |
| `secret_hash` | Hash của TOTP secret |
| `target_masked` | SĐT/email đã che (****xxxx) để hiển thị cho user |
| `is_primary` | MFA method chính khi có nhiều method |

---

### `device_identities`
Nhận diện thiết bị đăng nhập (máy POS, điện thoại, tablet).

| Column | Giải thích |
|--------|------------|
| `device_uid` | Device ID duy nhất (UUID do app sinh) |
| `device_type` | `pos_terminal` / `mobile` / `tablet` / `browser` |
| `client_type` | `pos_app` / `web` / `mobile_app` |
| `fingerprint_hash` | Hash browser/device fingerprint để detect thiết bị lạ |
| `trusted_status` | `pending` / `trusted` / `blocked` |

---

## Module 2 — Multi-Tenancy

### `business`
Mỗi business (cửa hàng/chuỗi) = 1 row. Trung tâm của toàn bộ hệ thống.

| Column | Giải thích |
|--------|------------|
| `business_code` | Mã business, unique (vd: `ACAFE`, `PHO_HAI`) |
| `schema_name | Tên schema PostgreSQL của business (vd: `business_acafe`) | |
| `legal_name` | Tên pháp lý công ty |
| `brand_name` | Tên thương hiệu hiển thị cho khách |
| `subscription_plan` | `free` / `standard` / `professional` / `enterprise` |
| `status` | `active` / `suspended` / `churned` |
| `timezone_name` | Múi giờ (default: `Asia/Ho_Chi_Minh`) |
| `currency_code` | Tiền tệ (default: `VND`) |
| `tax_code` | Mã số thuế doanh nghiệp |
| `store_public_code` | Code public cho QR menu / order online |
| `subscription_expires_at` | Ngày hết hạn subscription |

---

### `tenant_branches`
Các branch (chi nhánh schema) của business. Một business có thể có nhiều schema (multi-branch isolation).

| Column | Giải thích |
|--------|------------|
| `branch_code` | Mã chi nhánh |
| `source_schema_name` | Tên schema PostgreSQL của branch này |
| `source_branch_id` | FK tự tham chiếu — branch con của branch nào |

---

### `account_business`
Bảng nối: tài khoản nào có quyền vào business nào.

| Column | Giải thích |
|--------|------------|
| `access_level` | `owner` / `admin` / `staff` |
| `default_branch_code` | Branch mặc định khi login |

---

### `account_branch_access`
Quyền truy cập chi tiết của account vào từng branch cụ thể.

| Column | Giải thích |
|--------|------------|
| `access_level` | `full` / `read_only` / `custom` |
| `is_default` | Branch được chọn mặc định sau đăng nhập |

---

## Module 3 — Subscription & Billing

### `subscription_plans`
Các gói cước SaaS (Free, Standard, Pro...).

| Column | Giải thích |
|--------|------------|
| `plan_code` | Mã gói, unique |
| `monthly_price_vnd` | Giá tháng tính bằng đồng |
| `max_stores` | Số cửa hàng tối đa được phép |
| `max_devices` | Số thiết bị tối đa |

---

### `tenant_subscriptions`
Subscription hiện tại của business (1 business thường có 1 active subscription).

| Column | Giải thích |
|--------|------------|
| `status` | `active` / `cancelled` / `past_due` |
| `current_period_start/end` | Kỳ thanh toán hiện tại |
| `renewed_at` | Lần gia hạn gần nhất |
| `cancelled_at` | Ngày hủy (nếu có) |

---

### `plan_limits`
Định nghĩa giới hạn cụ thể của từng plan.

| Column | Giải thích |
|--------|------------|
| `limit_key` | Tên giới hạn: `max_orders_monthly` / `max_products` / `max_staff` |
| `limit_value` | Giá trị giới hạn (NULL = không giới hạn) |
| `reset_period` | `monthly` / `yearly` / `never` |
| `is_hard_limit` | Hard limit thì block; soft limit thì chỉ cảnh báo |

---

### `platform_invoices` + `platform_invoice_lines`
Hóa đơn phần mềm xuất cho business (SaaS billing).

| Column | Giải thích |
|--------|------------|
| `invoice_status` | `draft` / `issued` / `paid` / `overdue` |
| `sub_total_vnd` / `tax_amount_vnd` / `grand_total_vnd` | Tiền trước thuế, thuế, tổng |
| `due_at` | Hạn thanh toán |
| `paid_at` | Ngày đã thanh toán |

---

### `platform_payments`
Các khoản thanh toán thực tế nhận được từ business.

| Column | Giải thích |
|--------|------------|
| `payment_code` | Mã giao dịch |
| `payment_method` | `bank_transfer` / `momo` / `vnpay` |
| `payment_reference` | Mã tham chiếu ngân hàng |
| `status` | `completed` / `pending` / `failed` |

---

### `billing_events`
Sự kiện billing (tạo invoice, gia hạn, nâng cấp plan...) — audit trail.

| Column | Giải thích |
|--------|------------|
| `event_type` | `plan_upgrade` / `renewal` / `invoice_created` / `payment_received` |
| `amount_vnd` | Số tiền liên quan |
| `renewal_key` | Link đến key gia hạn nếu dùng renewal key |

---

### `renewal_keys`
Key gia hạn subscription (bán qua đại lý, tặng cho khách).

| Column | Giải thích |
|--------|------------|
| `key_code` | Mã key (random string) |
| `extend_months` | Gia hạn bao nhiêu tháng |
| `status` | `active` / `used` / `expired` |
| `used_by` | Tenant nào đã dùng |
| `expires_at` | Key hết hạn vào ngày này nếu chưa dùng |

---

### `tenant_usage_counters` + `tenant_usage_daily`
Theo dõi usage thực tế của business (đếm số đơn hàng, sản phẩm...).

| Column | Giải thích |
|--------|------------|
| `usage_key` | `order_count` / `product_count` / `api_calls` |
| `current_value` | Giá trị tích lũy trong kỳ |
| `period_start/end` | Kỳ đang tính |

---

### `usage_billing_items`
Chi tiết usage billing cho từng mục (đính kèm invoice).

---

## Module 4 — Access Control (Platform Level)

### `roles` + `permissions` + `role_permissions`
RBAC cấp platform (dành cho admin platform, không phải staff trong cửa hàng).

| Column | Giải thích |
|--------|------------|
| `role_scope` | `platform` / `business` / `support` |
| `is_system` | Role hệ thống, không xóa được |
| `permission_key` | Mã quyền: `platform.business.read` / `billing.invoice.create` |
| `module_key` | Module chứa permission: `billing` / `tenant_mgmt` |

---

### `account_role_bindings`
Gán role cho account (platform-level RBAC).

| Column | Giải thích |
|--------|------------|
| `scope_type | `global` / `business` / `branch` |
| `scope_id` | ID của scope (tenant_id hoặc branch_id) |
| `support_grant_until` | Quyền tạm thời cho support staff |

---

## Module 5 — Integrations & Infrastructure

### `api_clients`
Client key API cho third-party tích hợp với platform.

| Column | Giải thích |
|--------|------------|
| `api_key_hash` | Hash của API key thực tế |
| `scopes` | JSON array: `["orders.read", "products.write"]` |
| `expires_at` | Ngày hết hạn key |
| `last_used_at` | Lần dùng cuối — phát hiện key không dùng |

---

### `webhook_endpoints`
Cấu hình webhook để notify business khi có sự kiện (event-driven).

| Column | Giải thích |
|--------|------------|
| `endpoint_url` | URL nhận webhook |
| `secret_hash` | Hash secret để verify HMAC signature |
| `event_types` | JSON: `["order.created", "payment.completed"]` |
| `retry_limit` | Số lần retry nếu endpoint fail |

---

### `audit_events`
Audit log mọi thay đổi quan trọng ở tầng platform.

| Column | Giải thích |
|--------|------------|
| `event_type` | `login` / `plan_change` / `tenant_suspend` |
| `object_type` | Loại đối tượng bị tác động |
| `event_payload` | JSON chi tiết toàn bộ sự kiện |

---

### `bank_master`
Danh mục ngân hàng Việt Nam (dùng cho QR payment, transfer).

| Column | Giải thích |
|--------|------------|
| `bank_bin` | BIN code ngân hàng (3-6 chữ số) |
| `bank_code` | Mã viết tắt: `VCB`, `TCB`, `MBB` |
| `short_name` | Tên ngắn: Vietcombank, Techcombank |

---

### `flyway_schema_history`
Lịch sử migration của Flyway. Tránh chạy migration 2 lần.

---

---

# SCHEMA: `business_template`

> Clone mỗi business thành 1 schema riêng. Toàn bộ 177 bảng sau đây xuất hiện
> trong schema của **mỗi business** (vd: `business_acafe`, `business_phohai`).

---

## Module 1 — Core / Cửa hàng

### `stores`
Cửa hàng / chi nhánh. Đơn vị vật lý hoạt động kinh doanh.

| Column | Giải thích |
|--------|------------|
| `parent_id` | Store cha (cho chuỗi: HQ → chi nhánh) |
| `store_code` | Mã cửa hàng, unique |
| `store_type` | `retail` / `restaurant` / `warehouse` / `online` |
| `timezone` | Múi giờ của store (tính giờ mở/đóng) |
| `open_time` / `close_time` | Giờ mở/đóng cửa |
| `latitude` / `longitude` | Tọa độ GPS |

---

### `store_configs`
Cấu hình linh hoạt theo store (key-value pattern).

| Column | Giải thích |
|--------|------------|
| `config_key` | Khóa cấu hình: `default_tax_rate` / `receipt_footer` / `rounding_mode` |
| `config_value` | Giá trị (string) |
| `value_type` | `string` / `integer` / `boolean` / `json` — dùng để parse đúng |
| `is_system` | Config hệ thống, không sửa qua UI |

---

### `registers`
Máy tính tiền (POS terminal) tại quầy.

| Column | Giải thích |
|--------|------------|
| `register_code` | Mã máy: `COUNTER-01` |
| `status` | `open` / `closed` / `paused` |
| `ip_address` | IP của máy POS |
| `current_staff_id` | Staff đang làm việc tại máy này |

---

### `work_shifts`
Ca làm việc của nhân viên tại máy POS.

| Column | Giải thích |
|--------|------------|
| `shift_code` | Mã ca: `S240506-001` |
| `shift_date` | Ngày làm |
| `planned_start/end` | Ca theo kế hoạch |
| `actual_start/end` | Ca thực tế (chấm công) |
| `opening_cash` | Tiền mặt đầu ca |
| `closing_cash` | Tiền mặt cuối ca (sau khi đếm) |
| `expected_cash` | Tiền mặt dự kiến (tổng đơn tiền mặt) |
| `cash_variance` | Chênh lệch = `closing_cash - expected_cash` |
| `status` | `scheduled` / `open` / `closed` |

---

### `departments`
Phòng ban nội bộ (dùng cho HR). Hỗ trợ phân cấp qua `parent_id`.

---

### `document_sequences`
Bộ đếm số thứ tự cho các loại chứng từ.

| Column | Giải thích |
|--------|------------|
| `doc_type` | `sales_order` / `purchase_order` / `stock_transfer` |
| `prefix` / `suffix` | Tiền/hậu tố: `HD`, `PO` |
| `pad_length` | Độ dài số, padding bằng `0`: `000123` |
| `last_number` | Số cuối đã phát |
| `reset_period` | `never` / `yearly` / `monthly` — reset về 1 khi sang kỳ |

---

### `invoice_number_sequences`
Bộ đếm số hóa đơn VAT (tách riêng vì quy định thuế).

---

### `business_periods`
Kỳ kế toán (tháng/quý).

| Column | Giải thích |
|--------|------------|
| `period_type` | `month` / `quarter` / `year` |
| `start_date` / `end_date` | Ngày bắt đầu/kết thúc kỳ |
| `is_closed` | Kỳ đã đóng sổ chưa |
| `closed_by` | Ai đóng sổ |

---

### `period_locks`
Khóa kỳ kế toán — ngăn nhập chứng từ vào kỳ đã đóng.
Được trigger `trg_period_lock_*` enforce tự động.

| Column | Giải thích |
|--------|------------|
| `lock_type` | `business` / `tax` / `audit` |
| `period_start` / `period_end` | Khoảng thời gian bị khóa |
| `status` | `locked` / `unlocked` |
| `locked_by` / `unlocked_by` | Staff thực hiện |

---

### `reopen_period_requests`
Yêu cầu mở lại kỳ đã khóa — cần approval.

---

## Module 2 — Catalog / Sản phẩm

### `products`
Sản phẩm / dịch vụ. Master record của danh mục.

| Column | Giải thích |
|--------|------------|
| `product_code` | Mã sản phẩm nội bộ |
| `category_id` | Danh mục |
| `brand_id` | Thương hiệu |
| `tax_id` | Thuế suất áp dụng |
| `unit_id` | Đơn vị tính mặc định |
| `sku` | Stock Keeping Unit — mã quản lý kho |
| `barcode` | Barcode chính (EAN13/QR) |
| `sell_price` | Giá bán mặc định |
| `cost_price` | Giá vốn |
| `compare_price` | Giá so sánh (giá gốc, hiện khuyến mãi) |
| `earn_points` | Điểm tích lũy khi mua |
| `weight_gram` | Cân nặng (tính phí ship) |
| `min_stock_level` | Ngưỡng tồn kho tối thiểu (cảnh báo) |
| `show_on_pos` | Hiển thị trên màn hình POS |
| `show_online` | Hiển thị trên kênh online |
| `allow_backorder` | Cho phép bán khi hết hàng |
| `track_inventory` | Có quản lý tồn kho không |
| `has_variants` | Sản phẩm có nhiều biến thể (size/màu) |
| `product_type` | `simple` / `variant` / `combo` / `service` / `ingredient` |
| `pos_color` | Màu hiển thị trên nút POS (hex) |

---

### `product_variants`
Biến thể sản phẩm (size S/M/L, màu đỏ/xanh...).

| Column | Giải thích |
|--------|------------|
| `variant_name` | Tên biến thể: `Size M - Đỏ` |
| `sku` | SKU riêng của biến thể |
| `attributes` | JSON: `{"size": "M", "color": "red"}` |
| `sell_price` | Override giá bán (nếu khác product) |

---

### `product_categories`
Danh mục sản phẩm (cây phân cấp qua `parent_id`).

| Column | Giải thích |
|--------|------------|
| `category_type` | `product` / `service` / `ingredient` |
| `track_inventory` | Danh mục này có quản lý kho không |
| `color_code` | Màu hiển thị trên POS |
| `slug` | URL-friendly name cho website |

---

### `brands`
Thương hiệu (Nike, Samsung, Vinamilk...).

---

### `product_barcodes`
Nhiều barcode cho 1 sản phẩm (barcode đơn vị khác nhau).

| Column | Giải thích |
|--------|------------|
| `unit_name` | Đơn vị của barcode này (thùng/lốc/cái) |
| `barcode_type` | `ean13` / `ean8` / `qr` / `code128` |
| `is_primary` | Barcode chính |

---

### `units`
Đơn vị tính (cái, kg, lít, thùng...).

| Column | Giải thích |
|--------|------------|
| `unit_symbol` | Ký hiệu ngắn: `kg`, `L`, `pcs` |
| `unit_type` | `piece` / `weight` / `volume` / `length` |

---

### `product_units`
Bảng chuyển đổi đơn vị cho sản phẩm (1 thùng = 24 lon).

| Column | Giải thích |
|--------|------------|
| `conversion_factor` | Hệ số quy đổi về đơn vị cơ sở |
| `is_base_unit` | Đơn vị gốc của sản phẩm |

---

### `tax_classes`
Thuế suất (VAT 0%, 5%, 10%...).

| Column | Giải thích |
|--------|------------|
| `tax_code` | Mã thuế: `VAT10`, `VAT0` |
| `tax_rate` | Phần trăm: `10.00` |
| `is_default` | Thuế mặc định áp cho sản phẩm mới |

---

### `product_store_settings`
Cấu hình sản phẩm theo từng store (override global settings).

| Column | Giải thích |
|--------|------------|
| `is_available` | Sản phẩm có bán tại store này không |
| `min_stock_level` / `max_stock_level` | Ngưỡng tồn kho riêng của store |
| `reorder_point` | Ngưỡng đặt hàng lại |
| `allow_backorder` | Override backorder setting cho store này |

---

### `product_attribute_groups` + `product_attribute_values`
Quản lý thuộc tính sản phẩm dạng modifier (chọn topping, size...).

| Column | Giải thích |
|--------|------------|
| `input_type` | `single` (chọn 1) / `multiple` (chọn nhiều) |
| `is_required` | Bắt buộc chọn trước khi thêm vào giỏ |
| `extra_price` | Giá thêm của option này |

---

### `product_recipes`
Công thức nguyên liệu cho sản phẩm (F&B).

| Column | Giải thích |
|--------|------------|
| `ingredient_product_id` | Nguyên liệu dùng |
| `quantity` | Định lượng |
| `unit_name` | Đơn vị nguyên liệu |
| `wastage_rate` | Hệ số hao hụt (0.05 = 5% hao phí khi chế biến) |

---

### `combo_items`
Cấu thành combo (set A gồm burger + khoai + nước).

| Column | Giải thích |
|--------|------------|
| `combo_product_id` | Sản phẩm combo |
| `item_product_id` | Sản phẩm thành phần (≠ combo, tránh đệ quy) |
| `quantity` | Số lượng trong combo |
| `is_optional` | Thành phần tùy chọn (có thể bỏ) |

---

### `product_lots`
Lô hàng (batch) — quản lý HSD, nguồn gốc.

| Column | Giải thích |
|--------|------------|
| `lot_code` | Mã lô: `LOT-240501` |
| `manufacture_date` | Ngày sản xuất |
| `expiry_date` | Ngày hết hạn |
| `supplier_id` | Nhà cung cấp lô hàng này |

---

### `product_serials`
Serial number từng sản phẩm (điện tử, máy móc).

| Column | Giải thích |
|--------|------------|
| `serial_number` | Số serial |
| `status` | `in_stock` / `sold` / `returned` / `warranty` |
| `warranty_start` / `warranty_end` | Thời hạn bảo hành |
| `sold_at` | Ngày bán |

---

### `product_tags` + `product_tag_mappings`
Nhãn tùy chỉnh gắn vào sản phẩm (best-seller, new, hot...).

---

### `price_books` + `price_book_items`
Bảng giá linh hoạt theo thời gian, kênh bán, nhóm khách.

| Column | Giải thích |
|--------|------------|
| `book_type` | `standard` / `wholesale` / `happy_hour` |
| `priority` | Ưu tiên áp dụng (số cao hơn = ưu tiên hơn) |
| `valid_from` / `valid_to` | Thời hạn hiệu lực |
| `time_start` / `time_end` | Khung giờ áp dụng (happy hour) |
| `days_of_week` | JSON: `[1,2,3,4,5]` — thứ 2 đến 6 |
| `min_qty` | Số lượng tối thiểu để được giá này |

---

### `product_price_history` + `product_cost_history`
Lịch sử thay đổi giá bán / giá vốn (audit trail).

---

### `media_assets`
Hình ảnh và file upload.

| Column | Giải thích |
|--------|------------|
| `asset_type` | `image` / `video` / `document` |
| `storage_url` | URL gốc trên cloud storage |
| `thumbnail_url` | URL thumbnail đã resize |
| `ref_type` / `ref_id` | Link đến entity nào (product, store...) |

---

## Module 3 — Inventory / Kho

### `stock_locations`
Vị trí kho trong store (kho chính, khu trưng bày, kho lạnh...).

| Column | Giải thích |
|--------|------------|
| `location_type` | `main` / `display` / `transit` / `damaged` |
| `is_sellable` | Kho này có được lấy hàng để bán không |

---

### `stock_balances`
**Tồn kho hiện tại** — record trung tâm, được trigger `trg_stock_txn_balance` cập nhật tự động.

| Column | Giải thích |
|--------|------------|
| `location_id` | Vị trí kho |
| `product_id` / `variant_id` | Sản phẩm / biến thể |
| `quantity` | Số lượng tồn thực tế |
| `reserved_qty` | Số lượng đang được giữ chỗ cho đơn hàng pending |
| `avg_cost` | Giá vốn bình quân (moving average) |
| `last_cost` | Giá vốn lần nhập cuối |

---

### `stock_transactions`
**Nhật ký mọi biến động kho** — nguồn dữ liệu cho trigger cập nhật `stock_balances`.

| Column | Giải thích |
|--------|------------|
| `txn_type` | `purchase_in` / `return_in` / `transfer_in` / `adjustment_in` / `production_in` / `opening_balance` / `sale_out` / `return_out` / `transfer_out` / `adjustment_out` / `production_out` |
| `ref_type` / `ref_id` | Chứng từ gốc (purchase_order / sales_order...) |
| `quantity` | Số lượng (dương = nhập, âm = xuất) |
| `unit_cost` | Giá vốn tại thời điểm giao dịch |
| `balance_after` | Tồn sau giao dịch (snapshot) |
| `lot_id` | Lô hàng liên quan |

---

### `stock_lot_balances`
Tồn kho theo từng lô (cho FEFO — First Expired First Out).

---

### `stock_transfers`
Lệnh chuyển kho giữa 2 vị trí (hoặc 2 store).

| Column | Giải thích |
|--------|------------|
| `from_location_id` / `to_location_id` | Kho đi / kho đến (2 giá trị phải khác nhau — có CHECK constraint) |
| `status` | `pending` / `approved` / `shipped` / `received` / `cancelled` |
| `requested_by` / `approved_by` | Ai yêu cầu / ai duyệt |

---

### `stock_transfer_items`
Chi tiết từng sản phẩm trong phiếu chuyển kho.

| Column | Giải thích |
|--------|------------|
| `requested_qty` | Số lượng yêu cầu |
| `shipped_qty` | Số lượng đã gửi |
| `received_qty` | Số lượng thực nhận (có thể chênh lệch) |

---

### `stock_reservations`
Giữ hàng tạm thời cho đơn hàng (giảm available, chưa trừ tồn thật).

| Column | Giải thích |
|--------|------------|
| `status` | `active` / `confirmed` / `cancelled` / `expired` |
| `expires_at` | Tự hủy giữ hàng nếu không confirm |

---

### `stock_rules`
Quy tắc đặt hàng lại tự động.

| Column | Giải thích |
|--------|------------|
| `min_stock` | Tồn tối thiểu |
| `max_stock` | Tồn tối đa |
| `reorder_point` | Khi tồn xuống đến mức này → tạo PO |
| `reorder_qty` | Số lượng mỗi lần đặt |

---

### `stocktakes` + `stocktake_items`
Kiểm kê kho.

| Column | Giải thích |
|--------|------------|
| `status` | `draft` / `in_progress` / `completed` |
| `system_qty` | Tồn theo hệ thống |
| `actual_qty` | Tồn thực tế đếm được |
| `variance_qty` | Chênh lệch = actual - system |

---

### `stock_valuation_snapshots`
Snapshot giá trị kho tại một thời điểm (dùng cho báo cáo kỳ).

---

### `inventory_cost_layers`
Các lớp giá vốn (FIFO costing — First In First Out).

| Column | Giải thích |
|--------|------------|
| `quantity_in` | Số lượng nhập vào lớp này |
| `quantity_remaining` | Số lượng còn lại chưa xuất |
| `unit_cost` | Giá vốn của lớp này |
| `source_ref_type/id` | Chứng từ nhập (PO, production...) |

---

### `inventory_cost_adjustments`
Điều chỉnh giá vốn (khi phát hiện sai giá nhập).

---

### `landed_costs` + `landed_cost_allocations`
Chi phí vận chuyển/nhập khẩu cộng thêm vào giá vốn hàng nhập.

| Column | Giải thích |
|--------|------------|
| `cost_type` | `freight` / `insurance` / `customs` / `handling` |
| `allocation_method` | `by_value` / `by_quantity` / `by_weight` |

---

### `waste_logs`
Nhật ký hàng hủy / hao hụt.

| Column | Giải thích |
|--------|------------|
| `waste_reason` | `expired` / `damaged` / `production_loss` / `theft` |
| `stock_transaction_id` | Giao dịch kho tương ứng (xuất kho waste) |

---

### `receiving_discrepancies`
Chênh lệch khi nhận hàng (PO 100 cái, thực nhận 98).

---

### `prep_batches`
Mẻ chế biến sẵn (F&B: nấu sẵn phở, pha sẵn cocktail).

| Column | Giải thích |
|--------|------------|
| `produced_qty` / `remaining_qty` | Số lượng sản xuất / còn lại |
| `expires_at` | HSD của mẻ này |

---

## Module 4 — Sales / Bán hàng

### `sales_orders`
**Đơn hàng** — trung tâm của module bán hàng.

| Column | Giải thích |
|--------|------------|
| `order_code` | Mã đơn: `HD240506-001` |
| `order_type` | `pos` / `online` / `delivery` / `table` |
| `status` | `pending` / `processing` / `completed` / `cancelled` |
| `cashier_id` | Thu ngân xử lý |
| `table_id` / `table_name` | Bàn (F&B) |
| `party_size` | Số khách |
| `sub_total` | Tiền hàng trước giảm giá |
| `discount_amount` | Tổng giảm giá |
| `tax_amount` | Thuế |
| `delivery_fee` | Phí giao hàng |
| `grand_total` | Tổng phải trả |
| `paid_amount` | Đã trả |
| `change_amount` | Tiền thối |
| `debt_amount` | Công nợ còn lại |
| `loyalty_points_used/earned` | Điểm dùng / tích trong đơn này |
| `payment_status` | `unpaid` / `partial` / `paid` |
| `fulfillment_status` | `unfulfilled` / `partial` / `fulfilled` |
| `inventory_status` | `not_deducted` / `deducted` — trừ kho chưa |
| `source_channel` | `pos` / `shopee` / `lazada` / `website` |
| `idempotency_key` | Tránh tạo đơn trùng khi retry |
| `rounding_amount` | Làm tròn (VND thường làm tròn 100đ) |
| `service_charge_amount` | Phí phục vụ (restaurant) |
| `tip_amount` | Tiền tip |

---

### `sales_order_lines`
Chi tiết từng món trong đơn hàng.

| Column | Giải thích |
|--------|------------|
| `product_name` | Snapshot tên sản phẩm tại thời điểm bán |
| `unit_price` | Giá tại thời điểm bán |
| `cost_price` | Giá vốn tại thời điểm bán |
| `modifiers` | JSON: `[{"name":"Extra cheese","price":5000}]` |
| `kitchen_status` | `pending` / `sent` / `preparing` / `done` |

---

### `sales_order_status_history`
Lịch sử thay đổi trạng thái đơn hàng (audit).

---

### `sales_order_adjustments`
Điều chỉnh giá đơn sau khi tạo (bồi thường, sửa giá...).

---

### `order_payments`
Các khoản thanh toán cho đơn (1 đơn có thể thanh toán nhiều phương thức).

| Column | Giải thích |
|--------|------------|
| `method_code` | `cash` / `card` / `momo` / `vnpay` / `gift_card` |
| `amount` | Số tiền thanh toán bằng method này |
| `tender_amount` | Tiền khách đưa (cash) |
| `change_amount` | Tiền thối |
| `transaction_ref` | Mã giao dịch ngân hàng/ví |

---

### `order_returns` + `order_return_lines`
Đổi trả hàng bán.

| Column | Giải thích |
|--------|------------|
| `original_order_id` | Đơn gốc bị trả |
| `return_reason` | Lý do |
| `refund_method` | Phương thức hoàn tiền |
| `return_to_stock` | Có nhập lại kho không |

---

### `sales_invoices` + `sales_invoice_lines` + `sales_invoice_taxes`
Hóa đơn VAT (xuất cho khách B2B).

| Column | Giải thích |
|--------|------------|
| `invoice_type` | `standard` / `vat` / `proforma` |
| `invoice_status` | `draft` / `issued` / `cancelled` |
| `buyer_tax_code` | MST của người mua |
| `external_invoice_id` | Mã hóa đơn điện tử (VNPT/VIETTEL) |
| `external_invoice_url` | Link tra cứu hóa đơn điện tử |

---

### `credit_notes` + `debit_notes`
Phiếu giảm/tăng nợ (thương mại).

---

### `payment_methods`
Phương thức thanh toán được kích hoạt tại store.

| Column | Giải thích |
|--------|------------|
| `method_type` | `cash` / `card` / `wallet` / `bank_transfer` / `gift_card` |
| `config` | JSON: cấu hình cổng thanh toán (merchant_id, secret...) |

---

### `payment_refunds`
Hoàn tiền.

| Column | Giải thích |
|--------|------------|
| `refund_method` | Phương thức hoàn (có thể khác lúc thanh toán) |
| `transaction_ref` | Mã giao dịch hoàn |

---

### `discounts`
Chương trình giảm giá.

| Column | Giải thích |
|--------|------------|
| `discount_type` | `percentage` (%) / `fixed` (số tiền cố định) |
| `discount_value` | Giá trị giảm |
| `min_order_value` | Điều kiện tối thiểu |
| `max_discount` | Trần giảm tối đa (cho loại %) |
| `apply_scope` | `order` (toàn đơn) / `line` (từng dòng) |
| `usage_limit` | Tổng số lần dùng tối đa |
| `used_count` | Đã dùng bao nhiêu lần |

---

### `sales_channels`
Kênh bán hàng (POS, website, Shopee, Lazada...).

| Column | Giải thích |
|--------|------------|
| `channel_type` | `pos` / `website` / `marketplace` / `call_center` |
| `config` | JSON: API credentials của kênh |

---

### `channel_order_mappings` + `channel_product_mappings`
Mapping đơn hàng / sản phẩm từ kênh ngoài → nội bộ.

---

## Module 5 — Purchasing / Nhập hàng

### `suppliers`
Nhà cung cấp.

| Column | Giải thích |
|--------|------------|
| `payment_terms` | Số ngày công nợ (30 = net 30) |
| `total_debt` | Tổng nợ hiện tại với NCC (trigger cập nhật) |
| `bank_master_id` | Ngân hàng của NCC |

---

### `purchase_orders`
Đơn đặt hàng nhập (PO).

| Column | Giải thích |
|--------|------------|
| `po_code` | Mã PO |
| `status` | `draft` / `confirmed` / `partial` / `received` / `cancelled` |
| `sub_total` / `discount_amount` / `tax_amount` / `grand_total` | Các khoản tiền |
| `paid_amount` | Đã thanh toán |
| `order_date` | Ngày tạo PO |
| `expected_date` | Ngày dự kiến nhận |
| `received_date` | Ngày thực tế nhận |

---

### `purchase_order_lines`
Chi tiết từng sản phẩm trong PO.

| Column | Giải thích |
|--------|------------|
| `ordered_qty` | Số lượng đặt |
| `received_qty` | Số lượng thực nhận |
| `unit_cost` | Giá nhập từng đơn vị |

---

### `supplier_payables`
Công nợ phải trả NCC.

| Column | Giải thích |
|--------|------------|
| `original_amount` | Tổng nợ ban đầu |
| `paid_amount` / `remaining_amount` | Đã trả / còn nợ |
| `due_date` | Hạn thanh toán |
| `status` | `open` / `partial` / `paid` / `overdue` |

---

### `supplier_payments` + `supplier_payment_allocations`
Thanh toán cho NCC và phân bổ cho từng khoản nợ.

---

### `supplier_returns` + `supplier_return_lines`
Trả hàng lại NCC.

---

### `supplier_credit_notes`
Phiếu NCC trả nợ cho mình (sau khi trả hàng).

---

## Module 6 — Finance / Kế toán

### `chart_of_accounts`
Hệ thống tài khoản kế toán (COA).

| Column | Giải thích |
|--------|------------|
| `parent_id` | Tài khoản cha (phân cấp cây) |
| `account_code` | Số tài khoản: `1111`, `5111` |
| `account_type` | `asset` / `liability` / `equity` / `revenue` / `expense` |
| `normal_balance` | `debit` / `credit` — số dư thông thường ở bên nào |
| `is_system` | Tài khoản hệ thống, không sửa |

---

### `journal_entries` + `journal_lines`
Bút toán kế toán (double-entry).

| Column | Giải thích |
|--------|------------|
| `entry_date` | Ngày ghi sổ |
| `entry_type` | `manual` / `auto_sales` / `auto_purchase` / `payroll` |
| `ref_type/id` | Chứng từ gốc |
| `total_debit` / `total_credit` | Tổng Nợ / Có (phải bằng nhau) |
| `status` | `draft` / `posted` |
| `debit_amount` / `credit_amount` | Số tiền Nợ / Có của từng dòng |

---

### `cash_accounts`
Tài khoản tiền mặt / ngân hàng.

| Column | Giải thích |
|--------|------------|
| `account_type` | `cash` / `bank` / `e_wallet` |
| `current_balance` | Số dư hiện tại |
| `bank_master_id` | Ngân hàng (nếu là tài khoản ngân hàng) |

---

### `cash_transactions`
Giao dịch tài khoản tiền. Trigger `trg_cash_txn_balance_before` cập nhật số dư.

| Column | Giải thích |
|--------|------------|
| `txn_type` | `receipt` / `payment` / `transfer_in` / `transfer_out` |
| `amount` | Số tiền |
| `balance_after` | Số dư sau giao dịch (snapshot) |

---

### `cash_drawer_movements`
Tiền vào/ra ngăn kéo trong ca (không qua đơn hàng).

| Column | Giải thích |
|--------|------------|
| `movement_type` | `cash_in` / `cash_out` / `float_add` |
| `reason` | Lý do (đổi tiền lẻ, rút quỹ...) |

---

### `cash_denominations`
Danh sách mệnh giá tiền mặt (200đ → 500,000đ).

---

### `bank_deposits`
Phiếu nộp tiền mặt vào ngân hàng.

---

### `bank_statement_imports` + `bank_transactions`
Import sao kê ngân hàng để đối soát.

| Column | Giải thích |
|--------|------------|
| `direction` | `credit` (tiền vào) / `debit` (tiền ra) |
| `match_status` | `unmatched` / `matched` / `ignored` |
| `matched_ref_type/id` | Đối soát với chứng từ nào |

---

### `payment_reconciliations` + `payment_reconciliation_items`
Đối soát thanh toán (VNPay, Momo vs đơn hàng thực tế).

| Column | Giải thích |
|--------|------------|
| `expected_amount` | Tiền kỳ vọng theo hệ thống |
| `actual_amount` | Tiền thực tế từ cổng thanh toán |
| `variance_amount` | Chênh lệch |

---

### `cod_reconciliations`
Đối soát COD (tiền mặt ship giao cho đơn vị vận chuyển).

---

### `cogs_allocations`
Phân bổ giá vốn (COGS) theo từng dòng đơn hàng. Trigger `trg_cogs_alloc_consume` xử lý.

---

### `tax_reports`
Báo cáo thuế kỳ (kê khai VAT).

| Column | Giải thích |
|--------|------------|
| `output_tax_amount` | Thuế đầu ra (từ bán hàng) |
| `input_tax_amount` | Thuế đầu vào (từ mua hàng) |
| `net_tax_amount` | Thuế phải nộp = output - input |

---

### `closing_runs` + `closing_run_items`
Quy trình đóng sổ cuối kỳ (automated tasks).

---

### `payroll_periods` + `payroll_items`
Bảng lương.

| Column | Giải thích |
|--------|------------|
| `worked_hours` / `worked_days` | Công thực tế |
| `base_pay` | Lương cơ bản |
| `allowances` | Phụ cấp |
| `bonuses` | Thưởng |
| `deductions` | Khấu trừ (BHXH, thuế TNCN...) |
| `net_pay` | Lương thực nhận |

---

## Module 7 — CRM / Khách hàng

### `customers`
Hồ sơ khách hàng.

| Column | Giải thích |
|--------|------------|
| `group_id` | Nhóm khách (VIP, thân thiết, mới...) |
| `customer_code` | Mã KH |
| `gender` | `male` / `female` / `other` |
| `date_of_birth` | Ngày sinh (gửi voucher sinh nhật) |
| `loyalty_points` | Điểm tích lũy hiện tại (trigger cập nhật) |
| `total_spent` | Tổng chi tiêu (trigger cập nhật) |
| `visit_count` | Số lần mua hàng |
| `last_visit_at` | Lần ghé thăm cuối |
| `source` | Kênh tiếp cận: `pos` / `online` / `referral` |

---

### `customer_groups`
Nhóm khách hàng với ưu đãi riêng.

| Column | Giải thích |
|--------|------------|
| `discount_rate` | % giảm giá mặc định cho nhóm |
| `point_multiplier` | Hệ số nhân điểm: 2.0 = nhân đôi điểm |
| `min_spend` | Chi tiêu tối thiểu để vào nhóm |

---

### `customer_tags` + `customer_tag_mappings`
Nhãn tùy chỉnh cho khách (VIP, chậm thanh toán, khách quen...).

---

### `customer_addresses`
Sổ địa chỉ giao hàng của khách.

---

### `customer_wallets` + `wallet_transactions`
Ví điện tử của khách. Trigger `trg_wallet_balance` tự động cập nhật số dư.

| Column | Giải thích |
|--------|------------|
| `balance` | Số dư ví |
| `txn_type` | `top_up` / `spend` / `refund` / `cashback` |

---

### `gift_cards` + `gift_card_transactions`
Thẻ quà tặng. Trigger `trg_giftcard_balance` cập nhật `current_balance`.

| Column | Giải thích |
|--------|------------|
| `initial_balance` | Mệnh giá ban đầu |
| `current_balance` | Số dư còn lại |
| `expires_at` | Hạn sử dụng |

---

### `loyalty_programs` + `loyalty_tiers`
Chương trình tích điểm và các hạng thành viên.

| Column | Giải thích |
|--------|------------|
| `earn_rule` | JSON: cách tính điểm (`{"rate": 1000, "per": 1}` = 1 điểm/1000đ) |
| `redeem_rule` | JSON: cách đổi điểm |
| `tier_code` | `bronze` / `silver` / `gold` / `platinum` |
| `min_spend` | Chi tiêu tích lũy để đạt tier |
| `point_multiplier` | Hệ số điểm của tier |
| `benefits` | JSON: quyền lợi của tier |

---

### `loyalty_point_transactions`
Nhật ký biến động điểm. Trigger `trg_loyalty_balance` cập nhật `customers.loyalty_points`.

| Column | Giải thích |
|--------|------------|
| `txn_type` | `earn` / `redeem` / `expire` / `adjust` |
| `points` | Số điểm (dương = cộng, âm = trừ) |
| `balance_after` | Điểm sau giao dịch |
| `expires_at` | Điểm này hết hạn vào ngày nào |

---

### `customer_receivables` + `customer_ledgers`
Công nợ phải thu từ khách và sổ cái theo dõi biến động.

| Column | Giải thích |
|--------|------------|
| `original_amount` | Tổng nợ ban đầu |
| `paid_amount` / `remaining_amount` | Đã trả / còn nợ |
| `due_date` | Hạn thanh toán |

---

### `customer_receivable_payments` + `customer_receivable_allocations`
Thu nợ khách và phân bổ cho từng khoản nợ.

---

### `customer_segments`
Phân khúc khách hàng tự động theo rule.

| Column | Giải thích |
|--------|------------|
| `segment_type` | `dynamic` (tự động theo rule) / `static` (chọn tay) |
| `rules` | JSON: điều kiện phân loại |

---

### `customer_credit_profiles`
Hạn mức tín dụng của khách.

| Column | Giải thích |
|--------|------------|
| `credit_limit` | Hạn mức tối đa |
| `current_debt` | Nợ hiện tại |
| `allow_credit` | Có được bán chịu không |
| `credit_status` | `normal` / `overdue` / `blocked` |

---

### `customer_consents`
Đồng ý nhận marketing (GDPR-style).

| Column | Giải thích |
|--------|------------|
| `consent_type` | `marketing` / `data_processing` |
| `channel` | `sms` / `email` / `zalo` / `push` |
| `status` | `granted` / `revoked` |

---

### `customer_contact_preferences`
Tùy chọn liên hệ của khách.

| Column | Giải thích |
|--------|------------|
| `quiet_hours_start/end` | Giờ không gửi tin (22:00 - 08:00) |

---

### `customer_merge_requests`
Gộp 2 hồ sơ khách trùng — cần approval.

---

### `customer_interactions`
Lịch sử tương tác với khách (gọi điện, gặp mặt, chat...).

---

### `customer_vouchers` + `voucher_batches`
Voucher phát cho khách.

| Column | Giải thích |
|--------|------------|
| `voucher_type` | `fixed` / `percentage` / `free_item` |
| `quantity` | Số voucher trong batch |
| `used_order_id` | Đơn đã dùng voucher này |

---

## Module 8 — Marketing

### `campaigns` + `campaign_messages`
Chiến dịch marketing (SMS, Email, Zalo blast).

| Column | Giải thích |
|--------|------------|
| `campaign_type` | `sms` / `email` / `zalo` / `push` |
| `target_config` | JSON: điều kiện chọn đối tượng gửi |
| `status` | `draft` / `scheduled` / `running` / `completed` |
| `message_payload` | JSON: nội dung message (template + data) |

---

### `appointments` + `appointment_lines`
Đặt lịch hẹn (spa, clinic, salon...).

| Column | Giải thích |
|--------|------------|
| `appt_date` | Ngày hẹn |
| `start_time` / `end_time` | Giờ hẹn |
| `status` | `scheduled` / `confirmed` / `arrived` / `completed` / `no_show` |
| `deposit_amount` | Tiền đặt cọc giữ lịch |
| `duration_mins` | Thời gian dự kiến làm dịch vụ |

---

## Module 9 — F&B / Nhà hàng

### `floor_plans`
Tầng / khu vực trong nhà hàng.

---

### `dining_tables`
Bàn ăn.

| Column | Giải thích |
|--------|------------|
| `capacity` | Sức chứa (số ghế) |
| `status` | `available` / `occupied` / `reserved` / `cleaning` |
| `pos_x` / `pos_y` | Tọa độ hiển thị trên sơ đồ |
| `shape` | `rectangle` / `circle` / `square` |

---

### `table_sessions`
Phiên sử dụng bàn (mở bàn → đóng bàn).

---

### `kitchen_stations`
Khu vực chế biến (bếp chính, bar, bếp phụ...).

| Column | Giải thích |
|--------|------------|
| `station_type` | `kitchen` / `bar` / `prep` |

---

### `kitchen_tickets` + `kitchen_ticket_lines`
Phiếu gọi món gửi xuống bếp/bar.

| Column | Giải thích |
|--------|------------|
| `ticket_type` | `new` / `update` / `cancel` |
| `status` | `pending` / `preparing` / `done` |
| `modifiers` | JSON: yêu cầu đặc biệt (ít đường, không đá...) |

---

### `menu_availability`
Trạng thái có sẵn của món theo thời gian thực.

| Column | Giải thích |
|--------|------------|
| `available_status` | `available` / `out_of_stock` / `hidden` |

---

### `production_orders` + `production_order_lines`
Lệnh sản xuất / chế biến (nấu 50 phần cơm từ nguyên liệu).

| Column | Giải thích |
|--------|------------|
| `planned_qty` / `produced_qty` | Kế hoạch / thực tế |
| `required_qty` / `consumed_qty` | Nguyên liệu cần / thực dùng |

---

### `ingredient_consumptions`
Nhật ký tiêu hao nguyên liệu theo đơn hàng.

---

### `shift_cash_counts`
Đếm tiền mặt cuối ca (từng mệnh giá).

---

### `shift_payment_summaries`
Tổng kết thanh toán theo phương thức trong ca.

---

## Module 10 — Shipping / Vận chuyển

### `shipping_carriers`
Đơn vị vận chuyển (GHTK, GHN, nội bộ...).

| Column | Giải thích |
|--------|------------|
| `carrier_type` | `internal` / `3pl` (third-party logistics) |
| `config` | JSON: API credentials |

---

### `shipments`
Lô hàng vận chuyển cho đơn.

| Column | Giải thích |
|--------|------------|
| `tracking_number` | Mã tracking của ĐVVC |
| `shipment_status` | `pending` / `picked_up` / `in_transit` / `delivered` / `failed` / `returned` |
| `cod_amount` | Tiền COD cần thu hộ |

---

### `shipment_items` + `shipment_packages`
Chi tiết sản phẩm và kiện hàng trong lô.

---

### `shipment_tracking_events`
Timeline trạng thái giao hàng (webhook từ ĐVVC).

---

### `delivery_orders`
Đơn giao hàng nội bộ (shipper nội bộ).

---

### `delivery_attempts`
Ghi nhận từng lần thử giao (lần 1 không có nhà, lần 2...).

---

## Module 11 — Service / Dịch vụ & Bảo hành

### `service_orders` + `service_order_lines`
Đơn dịch vụ / sửa chữa (tiệm điện thoại, đồng hồ, ô tô...).

| Column | Giải thích |
|--------|------------|
| `priority` | `low` / `normal` / `high` / `urgent` |
| `received_at` | Nhận hàng |
| `promised_at` | Hứa trả hàng |
| `problem_description` | Mô tả lỗi |

---

### `service_packages` + `package_usages`
Gói dịch vụ trả trước (mua 10 buổi, dùng dần).

| Column | Giải thích |
|--------|------------|
| `total_sessions` | Tổng số buổi |
| `used_sessions` / `remaining_sessions` | Đã dùng / còn lại |
| `valid_days` | Hạn sử dụng gói (ngày) |

---

### `warranty_policies`
Chính sách bảo hành theo sản phẩm.

| Column | Giải thích |
|--------|------------|
| `warranty_months` | Thời gian bảo hành (tháng) |
| `terms` | Điều khoản |

---

### `warranty_claims`
Yêu cầu bảo hành.

| Column | Giải thích |
|--------|------------|
| `status` | `submitted` / `approved` / `in_repair` / `resolved` / `rejected` |
| `serial_id` | Serial number sản phẩm bảo hành |
| `issue_description` | Mô tả lỗi |
| `resolution` | Cách xử lý |

---

## Module 12 — HR / Nhân sự

### `staff_members`
Nhân viên.

| Column | Giải thích |
|--------|------------|
| `staff_code` | Mã NV |
| `pin_hash` | Mã PIN 4-6 số để đăng nhập POS nhanh |
| `position` | Chức vụ: `cashier` / `manager` / `chef` |
| `contract_type` | `full_time` / `part_time` / `contract` |
| `hire_date` / `termination_date` | Ngày vào / nghỉ |
| `base_salary` | Lương cơ bản tháng |
| `hourly_rate` | Lương theo giờ |
| `national_id` | CCCD |
| `bank_account` | Số tài khoản ngân hàng |
| `employment_status` | `active` / `on_leave` / `terminated` |

---

### `staff_account_links`
Liên kết nhân viên ↔ tài khoản platform.

---

### `staff_role_bindings`
Gán role cho nhân viên theo store.

| Column | Giải thích |
|--------|------------|
| `expires_at` | Quyền tạm thời (hết hạn tự thu hồi) |

---

### `roles` + `role_permissions` + `permissions`
RBAC cấp business (trong schema của từng cửa hàng).

---

### `permission_definitions`
Định nghĩa chi tiết permission theo module/màn hình/nút.

| Column | Giải thích |
|--------|------------|
| `screen_key` | Màn hình: `pos.checkout` / `inventory.stock_in` |
| `button_key` | Nút cụ thể: `apply_discount` / `void_order` |
| `action_key` | Hành động: `read` / `write` / `delete` / `approve` |
| `risk_level` | `low` / `medium` / `high` |
| `require_reason` | Phải nhập lý do khi thực hiện |
| `require_mfa` | Phải xác thực MFA |

---

### `temporary_permission_grants`
Cấp quyền tạm thời (manager override cho nhân viên).

---

### `permission_change_history` + `role_change_history`
Audit log thay đổi phân quyền.

---

### `timekeeping_logs`
Chấm công.

| Column | Giải thích |
|--------|------------|
| `event_type` | `check_in` / `check_out` / `break_start` / `break_end` |
| `method` | `manual` / `qr` / `face_id` / `fingerprint` |
| `latitude` / `longitude` | GPS (chống chấm hộ) |
| `photo_url` | Ảnh selfie chấm công |

---

## Module 13 — System / Hạ tầng

### `event_outbox`
Outbox pattern — ghi event trước khi publish ra message queue (đảm bảo at-least-once delivery).

| Column | Giải thích |
|--------|------------|
| `event_type` | Loại sự kiện: `order.completed` / `stock.low` |
| `aggregate_type` / `aggregate_id` | Entity gốc phát sinh event |
| `status` | `pending` / `sent` / `failed` |
| `retry_count` | Số lần retry |

---

### `webhook_inbox`
Nhận webhook từ bên ngoài (Shopee, ĐVVC, cổng thanh toán).

| Column | Giải thích |
|--------|------------|
| `source_type` | `shopee` / `ghn` / `vnpay` |
| `signature` | HMAC signature để verify |
| `processing_status` | `pending` / `processed` / `failed` |

---

### `realtime_events`
Events đẩy xuống client qua WebSocket/SSE.

| Column | Giải thích |
|--------|------------|
| `topic` | Topic subscribe: `store.{id}.orders` |
| `payload` | Dữ liệu gửi xuống |

---

### `external_event_logs`
Log mọi giao tiếp với hệ thống ngoài (gửi/nhận).

---

### `sync_jobs` + `sync_job_logs`
Công việc đồng bộ dữ liệu với kênh ngoài (Shopee, Lazada).

---

### `offline_sync_batches`
Batch dữ liệu từ POS offline khi có mạng trở lại.

---

### `idempotency_keys`
Ngăn duplicate request (đơn hàng tạo 2 lần khi mạng chập chờn).

| Column | Giải thích |
|--------|------------|
| `idempotency_key` | Key do client sinh (UUID hoặc hash) |
| `request_hash` | Hash của request body |
| `response_payload` | Response cũ để trả lại khi retry |
| `status` | `processing` / `completed` / `failed` |

---

### `activity_logs`
Audit log mọi hành động của user trong business.

| Column | Giải thích |
|--------|------------|
| `action` | `create` / `update` / `delete` / `approve` |
| `entity_type` / `entity_id` | Đối tượng bị tác động |
| `old_data` / `new_data` | Dữ liệu trước/sau (JSON) |

---

### `app_notifications`
Thông báo trong app cho user.

| Column | Giải thích |
|--------|------------|
| `notif_type` | `order_new` / `stock_low` / `payment_received` |
| `ref_type` / `ref_id` | Link đến entity liên quan |
| `is_read` / `read_at` | Trạng thái đọc |

---

### `push_tokens`
FCM/APNs token để gửi push notification.

---

### `device_bindings`
Liên kết thiết bị với store/register.

| Column | Giải thích |
|--------|------------|
| `binding_type` | `pos` / `kiosk` / `kds` (Kitchen Display System) |

---

### `printer_devices`
Máy in hóa đơn/bếp.

| Column | Giải thích |
|--------|------------|
| `printer_type` | `receipt` / `kitchen` / `label` |
| `connection_type` | `network` / `usb` / `bluetooth` |
| `paper_width` | Khổ giấy: `58` hoặc `80` mm |

---

### `approval_requests`
Yêu cầu phê duyệt (discount lớn, void đơn, điều chỉnh giá...).

| Column | Giải thích |
|--------|------------|
| `request_type` | `discount_override` / `void_order` / `cost_adjustment` |
| `payload` | JSON: chi tiết yêu cầu |

---

## Module 14 — Reporting

### `report_daily_sales_snapshots`
Snapshot báo cáo doanh thu hàng ngày (pre-aggregated).

| Column | Giải thích |
|--------|------------|
| `gross_sales` | Doanh thu gộp |
| `discount_amount` | Tổng giảm giá |
| `refund_amount` | Tổng hoàn trả |
| `net_sales` | Doanh thu thuần = gross - discount - refund |
| `cogs_amount` | Giá vốn |
| `gross_profit` | Lợi nhuận gộp = net_sales - cogs |
| `cash_collected` | Tiền mặt thực thu |
| `receivable_amount` | Bán chịu |
| `order_count` | Số đơn trong ngày |
