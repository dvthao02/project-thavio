import { ReceiptText } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function InvoicesPage() {
  return (
    <ModulePlaceholder
      title="Hợp đồng & hóa đơn"
      description="Theo dõi hóa đơn SaaS, kỳ thanh toán, trạng thái paid/overdue và lịch sử billing."
      permission="platform.billing.view"
      icon={ReceiptText}
      items={['Hóa đơn phát hành', 'Thanh toán', 'Billing events']}
    />
  );
}
