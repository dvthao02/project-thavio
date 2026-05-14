import { ShieldCheck } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function RolesPage() {
  return (
    <ModulePlaceholder
      title="Vai trò platform"
      description="Quản lý platform_owner, platform_admin, platform_support, platform_billing và platform_auditor."
      permission="platform.account.view"
      icon={ShieldCheck}
      items={['System roles', 'Role bindings', 'Scope platform/tenant/store']}
    />
  );
}
