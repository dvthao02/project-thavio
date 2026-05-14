import { UserCheck } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function AssigneesPage() {
  return (
    <ModulePlaceholder
      title="Nhân viên phụ trách"
      description="Phân công platform staff chăm sóc doanh nghiệp, trial sắp hết hạn và ticket mở."
      permission="platform.business.view"
      icon={UserCheck}
      items={['Workload', 'Trial follow-up', 'SLA theo nhân viên']}
    />
  );
}
