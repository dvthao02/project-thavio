import { Tags } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function CatalogsPage() {
  return (
    <ModulePlaceholder
      title="Danh mục"
      description="Quản lý danh mục platform dùng chung như ngân hàng, cấu hình gói và tham số hệ thống."
      permission="platform.system_setting.view"
      icon={Tags}
      items={['Bank master', 'System settings', 'Lookup values']}
    />
  );
}
