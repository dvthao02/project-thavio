-- Migration 16: Rename remaining 'tenant' references in platform.permissions
-- Fixes module_key = 'tenant' and permission_name containing 'tenant'

UPDATE platform.permissions SET
  module_key      = 'business',
  permission_name = 'Xem business',
  updated_at      = NOW()
WHERE permission_key = 'platform.business.view';

UPDATE platform.permissions SET
  module_key      = 'business',
  permission_name = 'Tạo business',
  updated_at      = NOW()
WHERE permission_key = 'platform.business.create';

UPDATE platform.permissions SET
  module_key      = 'business',
  permission_name = 'Sửa business',
  updated_at      = NOW()
WHERE permission_key = 'platform.business.update';

UPDATE platform.permissions SET
  module_key      = 'business',
  permission_name = 'Khóa business',
  updated_at      = NOW()
WHERE permission_key = 'platform.business.suspend';

UPDATE platform.permissions SET
  module_key      = 'business',
  permission_name = 'Mở business',
  updated_at      = NOW()
WHERE permission_key = 'platform.business.activate';

UPDATE platform.permissions SET
  module_key      = 'business',
  permission_name = 'Đóng business',
  updated_at      = NOW()
WHERE permission_key = 'platform.business.close';

UPDATE platform.permissions SET
  module_key      = 'business',
  permission_name = 'Xuất business',
  updated_at      = NOW()
WHERE permission_key = 'platform.business.export';

UPDATE platform.permissions SET
  module_key      = 'business',
  permission_name = 'Vào hỗ trợ business',
  updated_at      = NOW()
WHERE permission_key = 'platform.business.impersonate';

UPDATE platform.permissions SET
  permission_name = 'Bắt đầu hỗ trợ business',
  updated_at      = NOW()
WHERE permission_key = 'platform.impersonation.start';

UPDATE platform.permissions SET
  permission_name = 'Kết thúc hỗ trợ business',
  updated_at      = NOW()
WHERE permission_key = 'platform.impersonation.end';

UPDATE platform.permissions SET
  permission_name = 'Xem module business',
  updated_at      = NOW()
WHERE permission_key = 'platform.module.view';

UPDATE platform.permissions SET
  permission_name = 'Bật/tắt module business',
  updated_at      = NOW()
WHERE permission_key = 'platform.module.update';
