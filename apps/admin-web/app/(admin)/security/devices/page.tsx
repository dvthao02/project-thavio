import { Smartphone } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function DevicesPage() {
  return (
    <ModulePlaceholder
      title="MFA & thiết bị"
      description="Quản lý phương thức MFA, trusted device và thiết bị bị block."
      permission="platform.account.view"
      icon={Smartphone}
      items={['TOTP/SMS/Email', 'Trusted devices', 'Blocked devices']}
    />
  );
}
