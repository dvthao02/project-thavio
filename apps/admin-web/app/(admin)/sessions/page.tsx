import { Monitor } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function SessionsPage() {
  return (
    <ModulePlaceholder
      title="Phiên đăng nhập"
      description="Quản lý auth sessions, revoke phiên và theo dõi thiết bị đăng nhập platform."
      permission="platform.account.view"
      icon={Monitor}
      items={['Active sessions', 'Revoked sessions', 'IP/User agent']}
    />
  );
}
