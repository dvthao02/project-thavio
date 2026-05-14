import { Landmark } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function ReconciliationPage() {
  return (
    <ModulePlaceholder
      title="Đối soát thanh toán"
      description="Đối soát invoice, payment reference, renewal key và trạng thái quá hạn."
      permission="platform.billing.view"
      icon={Landmark}
      items={['Bank transfer', 'Renewal key', 'Past due']}
    />
  );
}
