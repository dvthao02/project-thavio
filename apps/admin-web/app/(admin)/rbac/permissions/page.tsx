'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, Search } from 'lucide-react';
import { api } from '@/lib/api';

interface Permission {
  id: string;
  permissionKey: string;
  permissionName: string;
  moduleKey: string;
  description: string | null;
}

interface PermissionsResponse {
  total: number;
  modules: { moduleKey: string; count: number; permissions: Permission[] }[];
}

export default function PermissionsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery<PermissionsResponse>({
    queryKey: ['rbac-permissions'],
    queryFn: () => api.get('/platform/rbac/permissions').then((r) => r.data),
  });

  const modules = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    if (!q) return data.modules;
    return data.modules
      .map((m) => ({
        ...m,
        permissions: m.permissions.filter(
          (p) =>
            p.permissionKey.toLowerCase().includes(q) ||
            p.permissionName.toLowerCase().includes(q),
        ),
      }))
      .filter((m) => m.permissions.length > 0);
  }, [data, search]);

  const totalShown = modules.reduce((s, m) => s + m.permissions.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound size={20} className="text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Phân quyền</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Toàn bộ quyền hạn hệ thống, được nhóm theo module.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-center">
          <p className="text-2xl font-bold text-foreground">{data?.total ?? 0}</p>
          <p className="text-xs text-muted-foreground">Tổng quyền</p>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Tìm quyền theo tên hoặc key..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-sm"
        />
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được danh sách quyền.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-5">
              <div className="mb-3 h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((__, j) => (
                  <div key={j} className="h-7 w-28 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <KeyRound size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search ? 'Không tìm thấy quyền phù hợp.' : 'Chưa có quyền nào trong hệ thống.'}
          </p>
        </div>
      ) : (
        <>
          {search && (
            <p className="text-xs text-muted-foreground">
              Tìm thấy {totalShown} quyền trong {modules.length} module.
            </p>
          )}
          <div className="space-y-3">
            {modules.map((mod) => (
              <div key={mod.moduleKey} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {mod.moduleKey}
                    </p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {mod.permissions.length}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mod.permissions.map((p) => (
                    <div key={p.id} className="group relative">
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-1.5 cursor-default hover:border-primary/40 hover:bg-muted transition">
                        <p className="text-xs font-medium text-foreground">{p.permissionName}</p>
                        <code className="mt-0.5 block text-[10px] text-muted-foreground">{p.permissionKey}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
