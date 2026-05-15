import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  permission?: string;
  icon?: LucideIcon;
  items?: string[];
}

export function ModulePlaceholder({
  title,
  description,
  permission,
  icon: Icon = Construction,
  items = [],
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Chức năng đang được thiết kế</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Màn hình đã được đặt trong khung quản trị để giao diện và API cùng bám theo tài liệu nghiệp vụ.
            </p>
            {permission && (
              <p className="text-xs text-muted-foreground mt-3">
                Quyền dự kiến: <code className="bg-muted px-1.5 py-0.5 rounded">{permission}</code>
              </p>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
            {items.map((item) => (
              <div key={item} className="border border-border rounded-md px-3 py-2 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
