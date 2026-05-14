import { AlertTriangle } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function AlertsPage() {
  return (
    <ModulePlaceholder
      title="Cảnh báo & SLA"
      description="Theo dõi trial sắp hết hạn, tenant bị khóa, ticket quá SLA và lỗi thanh toán."
      permission="platform.dashboard.view"
      icon={AlertTriangle}
      items={['Trial còn dưới 2 ngày', 'Ticket quá SLA', 'Thanh toán quá hạn']}
    />
  );
}
