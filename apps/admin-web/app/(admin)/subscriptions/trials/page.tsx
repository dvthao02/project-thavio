import { RotateCcw } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function TrialsPage() {
  return (
    <ModulePlaceholder
      title="Trial & gia hạn"
      description="Quản lý vòng đời dùng thử 10 ngày, nhắc gia hạn và chuyển sang gói trả phí."
      permission="platform.subscription.view"
      icon={RotateCcw}
      items={['Trial đang chạy', 'Sắp hết hạn', 'Đã suspended']}
    />
  );
}
