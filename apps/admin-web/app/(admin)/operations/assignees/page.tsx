import { UserCheck } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function AssigneesPage() {
  return (
    <ModulePlaceholder
      title="Nhân viên phụ trách"
      description="Phân công nhân viên nền tảng chăm sóc doanh nghiệp, theo dõi dùng thử sắp hết hạn và xử lý yêu cầu hỗ trợ."
      permission="platform.usage.view"
      icon={UserCheck}
      items={['Tải công việc', 'Theo dõi dùng thử', 'SLA theo nhân viên']}
    />
  );
}
