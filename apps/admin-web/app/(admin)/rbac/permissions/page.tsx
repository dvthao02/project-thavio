import { KeyRound } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function PermissionsPage() {
  return (
    <ModulePlaceholder
      title="Phân quyền"
      description="Ma trận permission key cho platform admin, subscription, billing, support và audit."
      permission="platform.account.view"
      icon={KeyRound}
      items={['Permission keys', 'Ma trận quyền', 'Quyền rủi ro cao']}
    />
  );
}
