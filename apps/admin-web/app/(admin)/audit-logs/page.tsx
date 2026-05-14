import { FileClock } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function AuditLogsPage() {
  return (
    <ModulePlaceholder
      title="Nhật ký hoạt động"
      description="Tra cứu audit log cho thao tác platform, quyền rủi ro cao và hành động impersonate."
      permission="platform.audit.view"
      icon={FileClock}
      items={['Lọc theo actor', 'Lọc theo business', 'Export audit']}
    />
  );
}
