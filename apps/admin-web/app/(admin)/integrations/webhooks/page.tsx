import { Webhook } from 'lucide-react';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';

export default function WebhooksPage() {
  return (
    <ModulePlaceholder
      title="Webhook/API"
      description="Quản lý API clients, webhook endpoints, retry logs và scope tích hợp."
      permission="platform.system_setting.view"
      icon={Webhook}
      items={['API clients', 'Webhook endpoints', 'Delivery logs']}
    />
  );
}
