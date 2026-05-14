import { UserCog } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function ImpersonationPage() {
  return (
    <ModulePlaceholder
      title="Impersonate hỗ trợ"
      description="Cấp quyền hỗ trợ tenant có thời hạn, yêu cầu lý do và ghi audit đầy đủ."
      permission="platform.business.impersonate"
      icon={UserCog}
      items={['Grant 30 phút', 'Lý do bắt buộc', 'Audit critical']}
    />
  );
}
