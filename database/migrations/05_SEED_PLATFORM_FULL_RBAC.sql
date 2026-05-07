\set ON_ERROR_STOP on
BEGIN;

SET client_encoding TO 'UTF8';

-- =====================================================================
-- FULL PLATFORM RBAC SEED FOR NEW DATABASE
-- =====================================================================
SET search_path TO platform, public;

-- Policy:
-- - role_name/permission_name: UTF-8 display text (Vietnamese allowed)
-- - role_key/permission_key: English machine key (ASCII)

INSERT INTO platform.roles(role_key, role_name, role_scope, is_system, sort_order) VALUES
  ('PLATFORM_OWNER', 'Chủ hệ thống', 'platform', TRUE, 1),
  ('PLATFORM_ADMIN', 'Quản trị hệ thống', 'platform', TRUE, 2),
  ('BILLING_ADMIN', 'Quản trị billing', 'platform', TRUE, 3),
  ('SUPPORT_ADMIN', 'Hỗ trợ khách hàng', 'platform', TRUE, 4),
  ('TECH_OPS', 'Kỹ thuật vận hành', 'platform', TRUE, 5),
  ('AUDITOR', 'Kiểm toán / chỉ xem', 'platform', TRUE, 6),
  ('SALES_CSKH', 'Sales / CSKH', 'platform', TRUE, 7)
ON CONFLICT (role_key) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  role_scope = EXCLUDED.role_scope,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO platform.permissions(permission_key, permission_name, module_key, description) VALUES
  ('platform.dashboard.view', 'Xem dashboard platform', 'dashboard', 'Full new DB platform permission'),
  ('platform.business.view', 'Xem business', 'business', 'Full new DB platform permission'),
  ('platform.business.create', 'Tạo business', 'business', 'Full new DB platform permission'),
  ('platform.business.update', 'Sửa business', 'business', 'Full new DB platform permission'),
  ('platform.business.suspend', 'Khóa business', 'business', 'Full new DB platform permission'),
  ('platform.business.activate', 'Mở business', 'business', 'Full new DB platform permission'),
  ('platform.business.close', 'Đóng business', 'business', 'Full new DB platform permission'),
  ('platform.business.export', 'Xuất business', 'business', 'Full new DB platform permission'),
  ('platform.business.impersonate', 'Vào hỗ trợ business', 'business', 'Full new DB platform permission'),
  ('platform.account.view', 'Xem tài khoản', 'account', 'Full new DB platform permission'),
  ('platform.account.create', 'Tạo tài khoản', 'account', 'Full new DB platform permission'),
  ('platform.account.update', 'Sửa tài khoản', 'account', 'Full new DB platform permission'),
  ('platform.account.lock', 'Khóa tài khoản', 'account', 'Full new DB platform permission'),
  ('platform.account.reset_password', 'Reset mật khẩu', 'account', 'Full new DB platform permission'),
  ('platform.account.reset_mfa', 'Reset MFA', 'account', 'Full new DB platform permission'),
  ('platform.role.view', 'Xem role', 'rbac', 'Full new DB platform permission'),
  ('platform.role.create', 'Tạo role', 'rbac', 'Full new DB platform permission'),
  ('platform.role.update', 'Sửa role', 'rbac', 'Full new DB platform permission'),
  ('platform.role.delete', 'Xóa role', 'rbac', 'Full new DB platform permission'),
  ('platform.role.assign_permission', 'Gán quyền role', 'rbac', 'Full new DB platform permission'),
  ('platform.subscription.view', 'Xem subscription', 'subscription', 'Full new DB platform permission'),
  ('platform.subscription.change_plan', 'Đổi gói', 'subscription', 'Full new DB platform permission'),
  ('platform.subscription.renew', 'Gia hạn', 'subscription', 'Full new DB platform permission'),
  ('platform.subscription.cancel', 'Hủy gói', 'subscription', 'Full new DB platform permission'),
  ('platform.subscription.suspend', 'Tạm khóa subscription', 'subscription', 'Full new DB platform permission'),
  ('platform.billing.view', 'Xem billing', 'billing', 'Full new DB platform permission'),
  ('platform.billing.export', 'Xuất billing', 'billing', 'Full new DB platform permission'),
  ('platform.renewal_key.view', 'Xem mã gia hạn', 'billing', 'Full new DB platform permission'),
  ('platform.renewal_key.create', 'Tạo mã gia hạn', 'billing', 'Full new DB platform permission'),
  ('platform.renewal_key.revoke', 'Thu hồi mã gia hạn', 'billing', 'Full new DB platform permission'),
  ('platform.module.view', 'Xem module business', 'module', 'Full new DB platform permission'),
  ('platform.module.update', 'Bật/tắt module business', 'module', 'Full new DB platform permission'),
  ('platform.device.view', 'Xem thiết bị', 'device', 'Full new DB platform permission'),
  ('platform.device.trust', 'Tin cậy thiết bị', 'device', 'Full new DB platform permission'),
  ('platform.device.block', 'Chặn thiết bị', 'device', 'Full new DB platform permission'),
  ('platform.api_client.view', 'Xem API client', 'integration', 'Full new DB platform permission'),
  ('platform.api_client.create', 'Tạo API client', 'integration', 'Full new DB platform permission'),
  ('platform.api_client.update', 'Sửa API client', 'integration', 'Full new DB platform permission'),
  ('platform.api_client.revoke', 'Thu hồi API client', 'integration', 'Full new DB platform permission'),
  ('platform.webhook.view', 'Xem webhook', 'integration', 'Full new DB platform permission'),
  ('platform.webhook.create', 'Tạo webhook', 'integration', 'Full new DB platform permission'),
  ('platform.webhook.update', 'Sửa webhook', 'integration', 'Full new DB platform permission'),
  ('platform.webhook.delete', 'Xóa webhook', 'integration', 'Full new DB platform permission'),
  ('platform.support_ticket.view', 'Xem ticket', 'support', 'Full new DB platform permission'),
  ('platform.support_ticket.update', 'Cập nhật ticket', 'support', 'Full new DB platform permission'),
  ('platform.support_ticket.assign', 'Gán ticket', 'support', 'Full new DB platform permission'),
  ('platform.support_ticket.close', 'Đóng ticket', 'support', 'Full new DB platform permission'),
  ('platform.impersonation.view', 'Xem phiên hỗ trợ', 'support', 'Full new DB platform permission'),
  ('platform.impersonation.start', 'Bắt đầu hỗ trợ business', 'support', 'Full new DB platform permission'),
  ('platform.impersonation.end', 'Kết thúc hỗ trợ business', 'support', 'Full new DB platform permission'),
  ('platform.audit.view', 'Xem audit', 'audit', 'Full new DB platform permission'),
  ('platform.audit.export', 'Xuất audit', 'audit', 'Full new DB platform permission'),
  ('platform.system_setting.view', 'Xem cấu hình hệ thống', 'setting', 'Full new DB platform permission'),
  ('platform.system_setting.update', 'Sửa cấu hình hệ thống', 'setting', 'Full new DB platform permission'),
  ('platform.usage.view', 'Xem usage', 'usage', 'Full new DB platform permission'),
  ('platform.invoice.view', 'Xem hóa đơn platform', 'platform_billing', 'Full new DB platform permission'),
  ('platform.invoice.create', 'Tạo hóa đơn platform', 'platform_billing', 'Full new DB platform permission'),
  ('platform.invoice.mark_paid', 'Đánh dấu đã thanh toán', 'platform_billing', 'Full new DB platform permission'),
  ('platform.invoice.cancel', 'Hủy hóa đơn platform', 'platform_billing', 'Full new DB platform permission')
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  module_key = EXCLUDED.module_key,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ══════════════════════════════════════════
-- PLATFORM_OWNER: toàn quyền
-- ══════════════════════════════════════════
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r
JOIN platform.permissions p ON TRUE
WHERE r.role_key = 'PLATFORM_OWNER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ══════════════════════════════════════════
-- PLATFORM_ADMIN: toàn quyền trừ 5 quyền phá hủy
-- ══════════════════════════════════════════
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r
JOIN platform.permissions p ON p.permission_key NOT IN (
  'platform.business.close',        -- đóng business vĩnh viễn
  'platform.system_setting.update',-- config toàn hệ thống
  'platform.role.delete',          -- xóa role hệ thống
  'platform.role.assign_permission',-- privilege escalation
  'platform.invoice.cancel'        -- hủy hóa đơn
)
WHERE r.role_key = 'PLATFORM_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ══════════════════════════════════════════
-- BILLING_ADMIN: billing + subscription (bỏ invoice.cancel)
-- ══════════════════════════════════════════
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r
JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view',
  'platform.business.view',
  'platform.subscription.view','platform.subscription.change_plan',
  'platform.subscription.renew','platform.subscription.cancel',
  'platform.subscription.suspend',
  'platform.billing.view','platform.billing.export',
  'platform.renewal_key.view','platform.renewal_key.create','platform.renewal_key.revoke',
  'platform.usage.view',
  'platform.invoice.view','platform.invoice.create','platform.invoice.mark_paid',
  'platform.audit.view'
]) WHERE r.role_key = 'BILLING_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ══════════════════════════════════════════
-- SUPPORT_ADMIN: hỗ trợ business + impersonation
-- ══════════════════════════════════════════
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r
JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view',
  'platform.business.view','platform.business.impersonate',
  'platform.account.view','platform.account.reset_password',
  'platform.device.view',
  'platform.module.view',
  'platform.support_ticket.view','platform.support_ticket.update',
  'platform.support_ticket.assign','platform.support_ticket.close',
  'platform.impersonation.view','platform.impersonation.start','platform.impersonation.end',
  'platform.audit.view','platform.audit.export'
]) WHERE r.role_key = 'SUPPORT_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ══════════════════════════════════════════
-- TECH_OPS: hạ tầng + integration + module
-- ══════════════════════════════════════════
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r
JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view',
  'platform.business.view',
  'platform.module.view','platform.module.update',
  'platform.device.view','platform.device.trust','platform.device.block',
  'platform.api_client.view','platform.api_client.create',
  'platform.api_client.update','platform.api_client.revoke',
  'platform.webhook.view','platform.webhook.create',
  'platform.webhook.update','platform.webhook.delete',
  'platform.system_setting.view','platform.system_setting.update',
  'platform.audit.view','platform.audit.export'
]) WHERE r.role_key = 'TECH_OPS'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ══════════════════════════════════════════
-- AUDITOR: chỉ xem + xuất (liệt kê rõ, không dùng LIKE)
-- ══════════════════════════════════════════
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r
JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view',
  'platform.business.view','platform.business.export',
  'platform.account.view',
  'platform.role.view',
  'platform.subscription.view',
  'platform.billing.view','platform.billing.export',
  'platform.renewal_key.view',
  'platform.module.view',
  'platform.device.view',
  'platform.api_client.view',
  'platform.webhook.view',
  'platform.support_ticket.view',
  'platform.impersonation.view',
  'platform.audit.view','platform.audit.export',
  'platform.system_setting.view',
  'platform.usage.view',
  'platform.invoice.view'
]) WHERE r.role_key = 'AUDITOR'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ══════════════════════════════════════════
-- SALES_CSKH: bán hàng + chăm sóc khách
-- ══════════════════════════════════════════
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r
JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view',
  'platform.business.view','platform.business.update',
  'platform.business.activate',
  'platform.account.view',
  'platform.subscription.view','platform.subscription.renew',
  'platform.billing.view',
  'platform.renewal_key.view',
  'platform.usage.view',
  'platform.support_ticket.view','platform.support_ticket.update',
  'platform.support_ticket.assign','platform.support_ticket.close'
]) WHERE r.role_key = 'SALES_CSKH'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ══════════════════════════════════════════
-- ONBOARDING: setup business mới (role mới thêm)
-- ══════════════════════════════════════════
INSERT INTO platform.roles(role_key, role_name, role_scope, is_system, sort_order)
VALUES ('ONBOARDING', 'Nhân viên onboarding', 'platform', TRUE, 8)
ON CONFLICT (role_key) DO UPDATE SET
  role_name = EXCLUDED.role_name, updated_at = NOW();

INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r
JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view',
  'platform.business.view','platform.business.create','platform.business.update',
  'platform.account.view','platform.account.create',
  'platform.subscription.view','platform.subscription.change_plan',
  'platform.billing.view',
  'platform.renewal_key.view','platform.renewal_key.create',
  'platform.module.view','platform.module.update',
  'platform.support_ticket.view','platform.support_ticket.update'
]) WHERE r.role_key = 'ONBOARDING'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Billing role
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view','platform.business.view','platform.subscription.view','platform.subscription.change_plan','platform.subscription.renew','platform.subscription.cancel','platform.subscription.suspend','platform.billing.view','platform.billing.export','platform.renewal_key.view','platform.renewal_key.create','platform.renewal_key.revoke','platform.usage.view','platform.invoice.view','platform.invoice.create','platform.invoice.mark_paid','platform.invoice.cancel','platform.audit.view'
]) WHERE r.role_key = 'BILLING_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Support role
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view','platform.business.view','platform.account.view','platform.device.view','platform.support_ticket.view','platform.support_ticket.update','platform.support_ticket.assign','platform.support_ticket.close','platform.impersonation.view','platform.impersonation.start','platform.impersonation.end','platform.audit.view'
]) WHERE r.role_key = 'SUPPORT_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Tech ops role
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view','platform.business.view','platform.device.view','platform.device.trust','platform.device.block','platform.api_client.view','platform.api_client.create','platform.api_client.update','platform.api_client.revoke','platform.webhook.view','platform.webhook.create','platform.webhook.update','platform.webhook.delete','platform.audit.view','platform.system_setting.view'
]) WHERE r.role_key = 'TECH_OPS'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Auditor role
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r JOIN platform.permissions p ON p.permission_key LIKE '%.view' OR p.permission_key LIKE '%.export'
WHERE r.role_key = 'AUDITOR'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Sales/CSKH role
INSERT INTO platform.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM platform.roles r JOIN platform.permissions p ON p.permission_key = ANY(ARRAY[
  'platform.dashboard.view','platform.business.view','platform.account.view','platform.subscription.view','platform.billing.view','platform.support_ticket.view','platform.support_ticket.update'
]) WHERE r.role_key = 'SALES_CSKH'
ON CONFLICT (role_id, permission_id) DO NOTHING;
COMMIT;