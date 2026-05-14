-- Migration 15: Update platform permission descriptions with meaningful content
-- Run: psql $DATABASE_URL -f database/migrations/15_update_platform_permission_descriptions.sql

UPDATE platform.permissions SET description = v.description, updated_at = NOW()
FROM (VALUES
  -- DASHBOARD
  ('platform.dashboard.view',           'Xem tổng quan thống kê platform: số business, tài khoản, biểu đồ tăng trưởng theo kỳ.'),

  -- BUSINESS
  ('platform.business.view',            'Xem danh sách và chi tiết các business: thông tin pháp lý, trạng thái, gói đăng ký.'),
  ('platform.business.create',          'Tạo mới business trên platform và provision schema database riêng cho business đó.'),
  ('platform.business.update',          'Chỉnh sửa thông tin business: tên thương hiệu, địa chỉ, người phụ trách.'),
  ('platform.business.suspend',         'Tạm khóa business — business không thể đăng nhập hoặc sử dụng dịch vụ cho đến khi được mở lại.'),
  ('platform.business.activate',        'Kích hoạt lại business đang bị khóa hoặc chờ duyệt.'),
  ('platform.business.close',           'Đóng vĩnh viễn business. Thao tác không thể hoàn tác.'),
  ('platform.business.export',          'Xuất danh sách business ra file CSV/Excel.'),
  ('platform.business.impersonate',     'Đăng nhập hỗ trợ vào business dưới danh nghĩa admin nội bộ để xử lý sự cố — mọi hành động được ghi audit log.'),

  -- ACCOUNT
  ('platform.account.view',             'Xem danh sách và chi tiết tài khoản quản trị platform.'),
  ('platform.account.create',           'Tạo tài khoản nhân viên quản trị mới, gán vai trò và phân công business phụ trách.'),
  ('platform.account.update',           'Chỉnh sửa thông tin cá nhân tài khoản: họ tên, email, số điện thoại.'),
  ('platform.account.lock',             'Khóa hoặc mở khóa tài khoản — tài khoản bị khóa không thể đăng nhập.'),
  ('platform.account.reset_password',   'Đặt lại mật khẩu tài khoản. Người dùng nhận link đổi mật khẩu qua email.'),
  ('platform.account.reset_mfa',        'Xóa thiết bị MFA đã đăng ký, bắt buộc người dùng thiết lập lại xác thực 2 bước.'),

  -- RBAC
  ('platform.role.view',                'Xem danh sách vai trò, quyền hạn trong từng vai trò, và tài khoản được gán.'),
  ('platform.role.create',              'Tạo mới vai trò tùy chỉnh với bộ quyền hạn riêng.'),
  ('platform.role.update',              'Chỉnh sửa tên và mô tả của vai trò hiện có. Không thể sửa vai trò hệ thống.'),
  ('platform.role.delete',              'Xóa vai trò không còn sử dụng. Không thể xóa vai trò hệ thống.'),
  ('platform.role.assign_permission',   'Thêm hoặc bỏ quyền hạn trong một vai trò.'),

  -- SUBSCRIPTION
  ('platform.subscription.view',        'Xem thông tin gói đăng ký hiện tại, lịch sử thay đổi gói của business.'),
  ('platform.subscription.change_plan', 'Nâng cấp hoặc hạ gói đăng ký cho business.'),
  ('platform.subscription.renew',       'Gia hạn gói đăng ký sắp hết hạn cho business.'),
  ('platform.subscription.cancel',      'Hủy gói đăng ký. Business chuyển về trạng thái inactive sau khi hết hạn.'),
  ('platform.subscription.suspend',     'Tạm đình chỉ subscription do vi phạm điều khoản hoặc chưa thanh toán.'),

  -- BILLING
  ('platform.billing.view',             'Xem lịch sử thanh toán, hóa đơn và số dư của tất cả business.'),
  ('platform.billing.export',           'Xuất báo cáo doanh thu và lịch sử thanh toán ra file CSV/Excel.'),
  ('platform.renewal_key.view',         'Xem danh sách mã gia hạn (coupon/key) đã tạo và trạng thái đã dùng hay chưa.'),
  ('platform.renewal_key.create',       'Tạo mã gia hạn để cấp cho business kích hoạt gia hạn hoặc nâng cấp gói.'),
  ('platform.renewal_key.revoke',       'Thu hồi mã gia hạn chưa được sử dụng, vô hiệu hóa ngay lập tức.'),

  -- MODULE
  ('platform.module.view',              'Xem trạng thái bật/tắt từng module tính năng (POS, CRM, Kho...) của business.'),
  ('platform.module.update',            'Bật hoặc tắt module tính năng cho business theo yêu cầu hoặc gói đăng ký.'),

  -- DEVICE
  ('platform.device.view',              'Xem danh sách thiết bị đã đăng nhập vào các tài khoản platform.'),
  ('platform.device.trust',             'Đánh dấu thiết bị là đáng tin cậy, bỏ qua yêu cầu xác minh 2 bước cho thiết bị đó.'),
  ('platform.device.block',             'Chặn thiết bị lạ — buộc đăng xuất và không cho đăng nhập lại từ thiết bị đó.'),

  -- INTEGRATION
  ('platform.api_client.view',          'Xem danh sách API client (ứng dụng bên thứ ba) đã được cấp quyền truy cập API.'),
  ('platform.api_client.create',        'Tạo mới API client, cấp client_id và client_secret cho ứng dụng bên ngoài.'),
  ('platform.api_client.update',        'Chỉnh sửa thông tin và phạm vi quyền hạn của API client hiện có.'),
  ('platform.api_client.revoke',        'Thu hồi quyền truy cập của API client, vô hiệu hóa toàn bộ token đang hoạt động.'),
  ('platform.webhook.view',             'Xem danh sách webhook endpoint đã đăng ký nhận sự kiện từ platform.'),
  ('platform.webhook.create',           'Đăng ký URL endpoint nhận sự kiện webhook (tạo business, thay đổi gói...).'),
  ('platform.webhook.update',           'Chỉnh sửa URL, secret key và danh sách sự kiện của webhook.'),
  ('platform.webhook.delete',           'Xóa webhook endpoint, dừng gửi sự kiện đến URL đó.'),

  -- SUPPORT
  ('platform.support_ticket.view',      'Xem danh sách ticket yêu cầu hỗ trợ từ business.'),
  ('platform.support_ticket.update',    'Cập nhật nội dung phản hồi và trạng thái xử lý của ticket.'),
  ('platform.support_ticket.assign',    'Gán ticket cho nhân viên hỗ trợ cụ thể phụ trách.'),
  ('platform.support_ticket.close',     'Đóng ticket đã được giải quyết xong.'),
  ('platform.impersonation.view',       'Xem lịch sử các phiên đăng nhập hỗ trợ vào business, bao gồm ai thực hiện và thời gian.'),
  ('platform.impersonation.start',      'Bắt đầu phiên hỗ trợ — đăng nhập vào business với quyền admin nội bộ. Mọi hành động được ghi audit log đầy đủ.'),
  ('platform.impersonation.end',        'Kết thúc phiên hỗ trợ, trả lại quyền điều khiển cho business.'),

  -- AUDIT
  ('platform.audit.view',               'Xem nhật ký hoạt động toàn hệ thống: ai làm gì, khi nào, trên đối tượng nào.'),
  ('platform.audit.export',             'Xuất nhật ký hoạt động ra file để lưu trữ lâu dài hoặc phục vụ điều tra.'),

  -- SETTING
  ('platform.system_setting.view',      'Xem cấu hình vận hành platform: giới hạn tài nguyên, tham số hệ thống.'),
  ('platform.system_setting.update',    'Chỉnh sửa cấu hình hệ thống. Chỉ dành cho quản trị viên cấp cao — tác động toàn platform.'),

  -- USAGE
  ('platform.usage.view',               'Xem số liệu sử dụng tài nguyên theo business: storage, lượt API call, số giao dịch.'),

  -- PLATFORM BILLING / INVOICE
  ('platform.invoice.view',             'Xem hóa đơn dịch vụ platform gửi cho business.'),
  ('platform.invoice.create',           'Tạo hóa đơn mới cho business.'),
  ('platform.invoice.mark_paid',        'Xác nhận đã nhận thanh toán, chuyển trạng thái hóa đơn sang đã thanh toán.'),
  ('platform.invoice.cancel',           'Hủy hóa đơn chưa thanh toán.'),

  -- ANNOUNCEMENT
  ('platform.announcement.view',        'Xem danh sách thông báo hệ thống đã và đang gửi đến business.'),
  ('platform.announcement.create',      'Tạo thông báo hệ thống mới gửi đến tất cả hoặc nhóm business (bảo trì, cập nhật tính năng...).'),
  ('platform.announcement.update',      'Chỉnh sửa nội dung thông báo chưa được gửi hoặc đang trong trạng thái nháp.'),
  ('platform.announcement.delete',      'Xóa thông báo hệ thống.'),

  -- TENANT MODULE
  ('platform.tenant_module.view',       'Xem danh sách và trạng thái các module tính năng của từng business.'),
  ('platform.tenant_module.toggle',     'Bật hoặc tắt module tính năng cho business theo yêu cầu hoặc điều kiện gói đăng ký.')

) AS v(permission_key, description)
WHERE platform.permissions.permission_key = v.permission_key;
