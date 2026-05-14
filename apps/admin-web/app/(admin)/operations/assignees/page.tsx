import { UserCheck } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function AssigneesPage() {
  return (
    <ModulePlaceholder
      title="Nhân viên phụ trách"
      description="Phân công nhân viên nền tảng chăm sóc doanh nghiệp, dùng thử sắp hết hạn và yêu cầu hỗ trợ đang mở."
      permission="platform.business.view"
      icon={UserCheck}
      items={['Tải công việc', 'Theo dõi dùng thử', 'SLA theo nhân viên']}
    />
  );
}
