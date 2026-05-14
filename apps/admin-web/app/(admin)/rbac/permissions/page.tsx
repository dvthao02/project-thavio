'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, KeyRound, Search, ShieldCheck, X, Crown, Info } from 'lucide-react';
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

interface RoleItem {
  id: string;
  roleKey: string;
  roleName: string;
  roleScope: string;
  isSystem: boolean;
}

type Scope = 'platform' | 'business';

function PermissionRolesModal({ permission, onClose }: { permission: Permission; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const { data, isLoading } = useQuery<{ roles: RoleItem[] }>({
    queryKey: ['permission-roles', permission.id],
    queryFn: () => api.get(`/platform/rbac/permissions/${permission.id}/roles`).then((r) => r.data),
    enabled: !!permission.id,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1 pr-4">
            <p className="text-sm font-semibold text-foreground">{permission.permissionName}</p>
            <code className="text-[11px] text-muted-foreground">{permission.permissionKey}</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        {permission.description && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5">
            <Info size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground leading-relaxed">{permission.description}</p>
          </div>
        )}

        {/* Roles list */}
        <div className="px-5 py-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Vai trò đang có quyền này
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : !data || data.roles.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/20 py-8 text-center">
              <ShieldCheck size={28} className="mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Chưa có vai trò nào được gán quyền này.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {data.roles.map((role) => (
                <li key={role.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{role.roleName}</p>
                    <code className="text-[11px] text-muted-foreground">{role.roleKey}</code>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {role.isSystem && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                        <Crown size={10} /> System
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      role.roleScope === 'platform'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-violet-500/10 text-violet-600'
                    }`}>
                      {role.roleScope === 'platform' ? 'Platform' : 'Business'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PermissionsPage() {
  const [scope, setScope] = useState<Scope>('platform');
  const [search, setSearch] = useState('');
  const [onlyUnused, setOnlyUnused] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

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
          const matchSearch =
            !q ||
            p.permissionKey.toLowerCase().includes(q) ||
            p.permissionName.toLowerCase().includes(q) ||
            (p.description?.toLowerCase().includes(q) ?? false);
          const matchUnused = !onlyUnused || p.roleCount === 0;
          return matchSearch && matchUnused;
        }),
      }))
      .filter((m) => m.permissions.length > 0);
  }, [data, search, onlyUnused]);

  const totalShown = modules.reduce((s, m) => s + m.permissions.length, 0);
  const unusedCount =
    data?.modules.reduce((s, m) => s + m.permissions.filter((p) => p.roleCount === 0).length, 0) ?? 0;

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
            <p className="text-2xl font-bold text-foreground">
              {isLoading ? '—' : search || onlyUnused ? totalShown : (data?.total ?? 0)}
            </p>
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
            placeholder="Tìm theo tên, key hoặc mô tả..."
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
                  <div key={j} className="h-12 animate-pulse rounded bg-muted" />
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
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => (scope === 'platform' ? setSelectedPermission(p) : undefined)}
                    className={`flex w-full items-start gap-4 px-4 py-3 text-left transition-colors ${
                      scope === 'platform' ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.permissionName}</p>
                      <code className="text-[11px] text-muted-foreground">{p.permissionKey}</code>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground/70 line-clamp-1">{p.description}</p>
                      )}
                    </div>
                    {scope === 'platform' && (
                      <div className="shrink-0 mt-0.5 group/badge relative">
                        {p.roleCount > 0 ? (
                          <>
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary cursor-default">
                              {p.roleCount} vai trò
                            </span>
                            <div className="pointer-events-none absolute right-0 top-full mt-1.5 z-10 hidden group-hover/badge:block w-max max-w-[200px] rounded-md bg-popover border border-border px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
                              {p.roleCount} role đang được gán quyền này
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 cursor-default">
                              Chưa gán
                            </span>
                            <div className="pointer-events-none absolute right-0 top-full mt-1.5 z-10 hidden group-hover/badge:block w-max max-w-[200px] rounded-md bg-popover border border-border px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
                              Chưa có role nào được gán quyền này
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPermission && (
        <PermissionRolesModal
          permission={selectedPermission}
          onClose={() => setSelectedPermission(null)}
        />
      )}
    </div>
  );
}
