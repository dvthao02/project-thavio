import { LifeBuoy } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function TicketsPage() {
  return (
    <ModulePlaceholder
      title="Yêu cầu hỗ trợ"
      description="Tiếp nhận, phân công và xử lý yêu cầu hỗ trợ theo doanh nghiệp và thời hạn SLA."
      permission="platform.support_ticket.view"
      icon={LifeBuoy}
      items={['Yêu cầu đang mở', 'Người phụ trách', 'Quá hạn SLA']}
    />
  );
}
