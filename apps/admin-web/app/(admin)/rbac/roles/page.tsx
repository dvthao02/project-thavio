'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Building2, ChevronRight, Crown, KeyRound, Loader2, Plus, Search, ShieldCheck, Users, X } from 'lucide-react';
import { api } from '@/lib/api';

interface Role {
  id: string;
  roleKey: string;
  roleName: string;
  description: string | null;
  roleScope: 'platform' | 'business';
  isSystem: boolean;
  sortOrder: number;
  permissionCount: number;
  accountCount: number;
  createdAt: string;
}

interface Permission {
  id: string;
  permissionKey: string;
  permissionName: string;
  moduleKey: string;
  description: string | null;
}

interface PermModule {
  moduleKey: string;
  count: number;
  permissions: Permission[];
}

const SCOPE_META: Record<string, { label: string; cls: string }> = {
  platform: { label: 'Platform', cls: 'bg-violet-500/10 text-violet-700' },
  business: { label: 'Business', cls: 'bg-sky-500/10 text-sky-700' },
};

const INPUT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function CompactStat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-bold leading-none text-foreground">{value}</p>
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

const DEFAULT_FORM = { roleKey: '', roleName: '', description: '', roleScope: 'platform' as 'platform' | 'business' };

export default function RolesPage() {
  const [scope, setScope] = useState<'all' | 'platform' | 'business'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');
  const qc = useQueryClient();

  useEffect(() => {
    if (!createOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCreate(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [createOpen]);

  const { data: roles = [], isLoading, isError } = useQuery<Role[]>({
    queryKey: ['rbac-roles'],
    queryFn: () => api.get('/platform/rbac/roles').then((r) => r.data),
  });

  const { data: allPermsData, isLoading: permsLoading } = useQuery<{ total: number; modules: PermModule[] }>({
    queryKey: ['rbac-permissions', form.roleScope],
    queryFn: () => api.get('/platform/rbac/permissions', { params: { scope: form.roleScope } }).then((r) => r.data),
    enabled: createOpen,
  });

  const createMut = useMutation({
    mutationFn: async (payload: { form: typeof form; permIds: string[] }) => {
      const created = await api.post('/platform/rbac/roles', payload.form).then((r) => r.data);
      if (payload.permIds.length > 0) {
        await Promise.all(
          payload.permIds.map((permissionId) =>
            api.post(`/platform/rbac/roles/${created.id}/permissions`, { permissionId })
          )
        );
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
      closeCreate();
    },
  });

  const closeCreate = () => {
    setCreateOpen(false);
    setForm(DEFAULT_FORM);
    setSelectedPerms(new Set());
    setPermSearch('');
  };

  const filtered = scope === 'all' ? roles : roles.filter((r) => r.roleScope === scope);
  const platformCount = roles.filter((r) => r.roleScope === 'platform').length;
  const businessCount = roles.filter((r) => r.roleScope === 'business').length;
  const systemCount = roles.filter((r) => r.isSystem).length;
  const customCount = roles.length - systemCount;
  const permissionBindings = roles.reduce((sum, role) => sum + role.permissionCount, 0);
  const accountBindings = roles.reduce((sum, role) => sum + role.accountCount, 0);

  const visibleModules = (allPermsData?.modules ?? [])
    .map((m) => ({
      ...m,
      permissions: permSearch
        ? m.permissions.filter(
            (p) =>
              p.permissionName.toLowerCase().includes(permSearch.toLowerCase()) ||
              p.permissionKey.toLowerCase().includes(permSearch.toLowerCase())
          )
        : m.permissions,
    }))
    .filter((m) => m.permissions.length > 0);

  const toggleModule = (modulePerms: Permission[]) => {
    const allSelected = modulePerms.every((p) => selectedPerms.has(p.id));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (allSelected) modulePerms.forEach((p) => next.delete(p.id));
      else modulePerms.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const togglePerm = (id: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Vai trò</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý các vai trò và phân quyền trong hệ thống.
          </p>
        </div>
        <button
          onClick={() => {
            setForm((f) => ({ ...f, roleScope: scope === 'business' ? 'business' : 'platform' }));
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          <Plus size={16} /> Tạo vai trò
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <CompactStat
          label="Tổng vai trò"
          value={roles.length}
          sub={`${platformCount} nền tảng, ${businessCount} cửa hàng`}
          icon={ShieldCheck}
          tone="bg-primary/10 text-primary"
        />
        <CompactStat
          label="Vai trò hệ thống"
          value={systemCount}
          sub={`${customCount} vai trò tùy chỉnh`}
          icon={Crown}
          tone="bg-amber-500/10 text-amber-700"
        />
        <CompactStat
          label="Quyền đã gán"
          value={permissionBindings}
          sub="Tổng role-permission"
          icon={KeyRound}
          tone="bg-violet-500/10 text-violet-700"
        />
        <CompactStat
          label="Tài khoản dùng role"
          value={accountBindings}
          sub="Tổng role binding"
          icon={Users}
          tone="bg-emerald-500/10 text-emerald-700"
        />
        <CompactStat
          label="Đang lọc"
          value={filtered.length}
          sub={scope === 'all' ? 'Tất cả phạm vi' : scope === 'platform' ? 'Phạm vi platform' : 'Phạm vi business'}
          icon={Building2}
          tone="bg-sky-500/10 text-sky-700"
        />
      </div>

      <div className="inline-flex rounded-md border border-border bg-card p-1">
        {(['all', 'platform', 'business'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setScope(key)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              scope === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {key === 'all' ? 'Tất cả' : key === 'platform' ? 'Platform' : 'Business'}
          </button>
        ))}
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được danh sách vai trò.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Vai trò</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Phạm vi</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Số quyền</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tài khoản</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <ShieldCheck size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Không có vai trò nào.</p>
                </td>
              </tr>
            ) : (
              filtered.map((role) => {
                const scopeMeta = SCOPE_META[role.roleScope] ?? SCOPE_META.platform;
                return (
                  <tr key={role.id} className="transition hover:bg-muted/20">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{role.roleName}</p>
                        {role.isSystem && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Hệ thống
                          </span>
                        )}
                      </div>
                      <code className="mt-1 block text-xs text-muted-foreground">{role.roleKey}</code>
                      {role.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{role.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scopeMeta.cls}`}>
                        {scopeMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="group/tip relative inline-flex items-center gap-1.5 text-sm">
                        <ShieldCheck size={14} className="text-muted-foreground" />
                        <span className="font-medium">{role.permissionCount}</span>
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 hidden group-hover/tip:block whitespace-nowrap rounded-md bg-popover border border-border px-2.5 py-1.5 text-xs text-popover-foreground shadow-md z-10">
                          {role.permissionCount} quyền được gán
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="group/tip relative inline-flex items-center gap-1.5 text-sm">
                        <Users size={14} className="text-muted-foreground" />
                        <span className="font-medium">{role.accountCount}</span>
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 hidden group-hover/tip:block whitespace-nowrap rounded-md bg-popover border border-border px-2.5 py-1.5 text-xs text-popover-foreground shadow-md z-10">
                          {role.accountCount} tài khoản được gán vai trò này
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/rbac/roles/${role.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted"
                      >
                        Chi tiết
                        <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-3xl flex-col rounded-lg border border-border bg-background shadow-xl" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">Tạo vai trò mới</h3>
              <button onClick={closeCreate} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Left: role info */}
              <div className="w-80 shrink-0 overflow-y-auto border-r border-border p-6">
                <div className="space-y-4">
                  <Field label="Tên vai trò *">
                    <input
                      className={INPUT}
                      value={form.roleName}
                      onChange={(e) => setForm((f) => ({ ...f, roleName: e.target.value }))}
                      placeholder="Quản trị viên"
                    />
                  </Field>
                  <Field label="Role Key *">
                    <input
                      className={INPUT}
                      value={form.roleKey}
                      onChange={(e) => setForm((f) => ({ ...f, roleKey: e.target.value.toLowerCase() }))}
                      placeholder="platform.admin"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Chỉ chữ thường, số, dấu chấm, gạch ngang, gạch dưới</p>
                  </Field>
                  <Field label="Phạm vi *">
                    <select
                      className={INPUT}
                      value={form.roleScope}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, roleScope: e.target.value as 'platform' | 'business' }));
                        setSelectedPerms(new Set());
                      }}
                    >
                      <option value="platform">Platform</option>
                      <option value="business">Business</option>
                    </select>
                  </Field>
                  <Field label="Mô tả">
                    <textarea
                      className={INPUT}
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Mô tả vai trò..."
                    />
                  </Field>
                </div>
              </div>

              {/* Right: permission picker */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    Quyền hạn
                    {selectedPerms.size > 0 && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {selectedPerms.size} đã chọn
                      </span>
                    )}
                  </p>
                  {selectedPerms.size > 0 && (
                    <button
                      onClick={() => setSelectedPerms(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>
                <div className="border-b border-border px-4 py-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm quyền..."
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {permsLoading ? (
                    <div className="flex h-24 items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : visibleModules.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {permSearch ? 'Không tìm thấy quyền phù hợp.' : 'Không có quyền nào.'}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {visibleModules.map((m) => {
                        const allChecked = m.permissions.every((p) => selectedPerms.has(p.id));
                        const someChecked = !allChecked && m.permissions.some((p) => selectedPerms.has(p.id));
                        return (
                          <div key={m.moduleKey}>
                            <label className="flex cursor-pointer items-center gap-2.5 rounded-md bg-muted/50 px-2.5 py-2">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(el) => { if (el) el.indeterminate = someChecked; }}
                                onChange={() => toggleModule(m.permissions)}
                                className="rounded"
                              />
                              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                {m.moduleKey}
                              </span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {m.permissions.filter((p) => selectedPerms.has(p.id)).length}/{m.permissions.length}
                              </span>
                            </label>
                            <div className="ml-4 mt-1 space-y-0.5">
                              {m.permissions.map((p) => (
                                <label
                                  key={p.id}
                                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/40"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPerms.has(p.id)}
                                    onChange={() => togglePerm(p.id)}
                                    className="rounded"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm text-foreground">{p.permissionName}</p>
                                    <code className="text-xs text-muted-foreground">{p.permissionKey}</code>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              {createMut.isError ? (
                <p className="text-xs text-destructive">
                  {(createMut.error as any)?.response?.data?.message ?? 'Lỗi khi tạo vai trò.'}
                </p>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  onClick={closeCreate}
                  className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition"
                >
                  Hủy
                </button>
                <button
                  onClick={() => createMut.mutate({ form, permIds: Array.from(selectedPerms) })}
                  disabled={createMut.isPending || !form.roleKey || !form.roleName}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
                >
                  {createMut.isPending ? 'Đang tạo...' : 'Tạo vai trò'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
