import { LifeBuoy } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function TicketsPage() {
  return (
    <ModulePlaceholder
      title="Ticket hỗ trợ"
      description="Tiếp nhận, phân công và xử lý ticket support theo business và SLA."
      permission="platform.support_ticket.view"
      icon={LifeBuoy}
      items={['Open tickets', 'Assigned to', 'SLA breach']}
    />
  );
}
