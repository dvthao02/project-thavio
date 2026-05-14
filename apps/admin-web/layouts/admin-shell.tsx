'use client';

import { useCallback, useState } from 'react';
import { Sidebar } from '@/layouts/sidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const handleToggle = useCallback(() => setSidebarCollapsed((v) => !v), []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggle} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
