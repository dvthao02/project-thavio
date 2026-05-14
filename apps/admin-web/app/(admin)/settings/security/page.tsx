import { LockKeyhole } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function SecuritySettingsPage() {
  return (
    <ModulePlaceholder
      title="Bảo mật"
      description="Chính sách MFA, session limit, quyền critical và cấu hình audit."
      permission="platform.system_setting.view"
      icon={LockKeyhole}
      items={['MFA policy', 'Session limit', 'Critical permission']}
    />
  );
}
