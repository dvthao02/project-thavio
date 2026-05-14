'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, KeyRound, Search, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

interface Permission {
  id: string;
  permissionKey: string;
  permissionName: string;
  moduleKey: string;
  description: string | null;
  roleCount: number;
}

interface PermissionsResponse {
  total: number;
  modules: { moduleKey: string; count: number; permissions: Permission[] }[];
}

type Scope = 'platform' | 'business';

export default function PermissionsPage() {
  const [scope, setScope] = useState<Scope>('platform');
  const [search, setSearch] = useState('');
  const [onlyUnused, setOnlyUnused] = useState(false);

  const { data, isLoading, isError } = useQuery<PermissionsResponse>({
    queryKey: ['rbac-permissions-view', scope],
    queryFn: () => api.get('/platform/rbac/permissions', { params: { scope } }).then((r) => r.data),
  });

  const modules = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.modules
      .map((m) => ({
        ...m,
        permissions: m.permissions.filter((p) => {
          const matchSearch = !q || p.permissionKey.toLowerCase().includes(q) || p.permissionName.toLowerCase().includes(q);
          const matchUnused = !onlyUnused || p.roleCount === 0;
          return matchSearch && matchUnused;
        }),
      }))
      .filter((m) => m.permissions.length > 0);
  }, [data, search, onlyUnused]);

  const totalShown = modules.reduce((s, m) => s + m.permissions.length, 0);
  const unusedCount = data?.modules.reduce((s, m) => s + m.permissions.filter((p) => p.roleCount === 0).length, 0) ?? 0;

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

        <div className="flex items-center gap-3">
          {scope === 'platform' && unusedCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlyUnused((v) => !v)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                onlyUnused
                  ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              Chưa gán role ({unusedCount})
            </button>
          )}
          <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-center min-w-[64px]">
            <p className="text-2xl font-bold text-foreground">{isLoading ? '—' : (search || onlyUnused ? totalShown : (data?.total ?? 0))}</p>
            <p className="text-xs text-muted-foreground">{search || onlyUnused ? 'kết quả' : 'tổng quyền'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => { setScope('platform'); setSearch(''); setOnlyUnused(false); }}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition ${
              scope === 'platform' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <ShieldCheck size={13} /> Platform
          </button>
          <button
            type="button"
            onClick={() => { setScope('business'); setSearch(''); setOnlyUnused(false); }}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition ${
              scope === 'business' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Building2 size={13} /> Business
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm quyền theo tên hoặc key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được danh sách quyền.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className="h-9 animate-pulse rounded bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <KeyRound size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search || onlyUnused ? 'Không tìm thấy quyền phù hợp.' : 'Chưa có quyền nào.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod) => (
            <div key={mod.moduleKey} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {mod.moduleKey}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {mod.permissions.length}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-border">
                {mod.permissions.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.permissionName}</p>
                      <code className="text-[11px] text-muted-foreground">{p.permissionKey}</code>
                    </div>
                    {scope === 'platform' && (
                      <div className="shrink-0">
                        {p.roleCount > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {p.roleCount} vai trò
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
                            Chưa gán
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
