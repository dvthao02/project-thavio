import { Landmark } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function ReconciliationPage() {
  return (
    <ModulePlaceholder
      title="Đối soát thanh toán"
      description="Đối soát hóa đơn, mã tham chiếu thanh toán, mã gia hạn và trạng thái quá hạn."
      permission="platform.billing.view"
      icon={Landmark}
      items={['Chuyển khoản ngân hàng', 'Mã gia hạn', 'Quá hạn thanh toán']}
    />
  );
}
