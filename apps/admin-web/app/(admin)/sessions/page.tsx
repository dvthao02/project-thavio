import { Monitor } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function SessionsPage() {
  return (
    <ModulePlaceholder
      title="Phiên đăng nhập"
      description="Quản lý phiên xác thực, thu hồi phiên và theo dõi thiết bị đăng nhập nền tảng."
      permission="platform.account.view"
      icon={Monitor}
      items={['Phiên đang hoạt động', 'Phiên đã thu hồi', 'IP và trình duyệt']}
    />
  );
}
