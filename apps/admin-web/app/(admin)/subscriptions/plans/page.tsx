import { Package } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function PlansPage() {
  return (
    <ModulePlaceholder
      title="Gói dịch vụ"
      description="Cấu hình starter, standard, professional, enterprise và giới hạn sử dụng."
      permission="platform.subscription.view"
      icon={Package}
      items={['Giá gói', 'Giới hạn cửa hàng', 'Giới hạn thiết bị']}
    />
  );
}
