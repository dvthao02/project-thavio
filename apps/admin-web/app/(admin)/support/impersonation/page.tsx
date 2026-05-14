import { UserCog } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function ImpersonationPage() {
  return (
    <ModulePlaceholder
      title="Hỗ trợ truy cập"
      description="Cấp quyền hỗ trợ doanh nghiệp có thời hạn, yêu cầu lý do và ghi nhật ký đầy đủ."
      permission="platform.business.impersonate"
      icon={UserCog}
      items={['Cấp quyền 30 phút', 'Bắt buộc nhập lý do', 'Ghi nhật ký nghiêm ngặt']}
    />
  );
}
