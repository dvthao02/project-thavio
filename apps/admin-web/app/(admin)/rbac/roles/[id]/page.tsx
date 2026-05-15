'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Crown, Edit2, KeyRound, Layers3, Loader2, Plus, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { api } from '@/lib/api';

interface Permission {
  id: string;
  permissionKey: string;
  permissionName: string;
  moduleKey: string;
  description: string | null;
}

interface AccountRow {
  id: string;
  fullName: string;
  email: string | null;
  scopeType: string;
}

interface RoleDetail {
  id: string;
  roleKey: string;
  roleName: string;
  description: string | null;
  roleScope: string;
  isSystem: boolean;
  createdAt: string;
  permissions: Permission[];
  accounts: AccountRow[];
}

interface AllPermsModule {
  moduleKey: string;
  count: number;
  permissions: Permission[];
}

const SCOPE_META: Record<string, { label: string; cls: string }> = {
  platform: { label: 'Platform', cls: 'bg-violet-500/10 text-violet-700' },
  business: { label: 'Business', cls: 'bg-sky-500/10 text-sky-700' },
};

const SCOPE_TYPE_LABEL: Record<string, string> = {
  platform: 'Platform',
  business: 'Business',
  store: 'Store',
};

const INPUT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

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

function useEscapeKey(active: boolean, handler: () => void) {
  useEffect(() => {
    if (!active) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handler(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [active, handler]);
}

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ roleName: '', description: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [addPermOpen, setAddPermOpen] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');

  useEscapeKey(editOpen, () => setEditOpen(false));
  useEscapeKey(deleteConfirm, () => setDeleteConfirm(false));
  useEscapeKey(addPermOpen, () => { setAddPermOpen(false); setSelectedPerms(new Set()); setPermSearch(''); });

  const { data: role, isLoading, isError } = useQuery<RoleDetail>({
    queryKey: ['rbac-role', id],
    queryFn: () => api.get(`/platform/rbac/roles/${id}`).then((r) => r.data),
  });

  const { data: allPermsData } = useQuery<{ total: number; modules: AllPermsModule[] }>({
    queryKey: ['rbac-permissions', role?.roleScope ?? 'platform'],
    queryFn: () =>
      api.get('/platform/rbac/permissions', { params: { scope: role?.roleScope ?? 'platform' } }).then((r) => r.data),
    enabled: addPermOpen && !!role,
  });

  const updateMut = useMutation({
    mutationFn: (body: { roleName?: string; description?: string }) =>
      api.patch(`/platform/rbac/roles/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rbac-role', id] });
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
      setEditOpen(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/platform/rbac/roles/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
      router.push('/rbac/roles');
    },
  });

  const addPermMut = useMutation({
    mutationFn: (permissionIds: string[]) =>
      Promise.all(
        permissionIds.map((permissionId) =>
          api.post(`/platform/rbac/roles/${id}/permissions`, { permissionId })
        )
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rbac-role', id] });
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
      setAddPermOpen(false);
      setSelectedPerms(new Set());
      setPermSearch('');
    },
  });

  const removePermMut = useMutation({
    mutationFn: (permissionId: string) =>
      api.delete(`/platform/rbac/roles/${id}/permissions/${permissionId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rbac-role', id] });
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !role) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <ShieldCheck size={32} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Không tìm thấy vai trò.</p>
        <Link href="/rbac/roles" className="text-sm text-primary hover:underline">Quay lại</Link>
      </div>
    );
  }

  const scopeMeta = SCOPE_META[role.roleScope] ?? SCOPE_META.platform;

  const byModule: Record<string, Permission[]> = {};
  for (const p of role.permissions) {
    if (!byModule[p.moduleKey]) byModule[p.moduleKey] = [];
    byModule[p.moduleKey].push(p);
  }
  const moduleCount = Object.keys(byModule).length;

  const assignedIds = new Set(role.permissions.map((p) => p.id));

  const availableModules = (allPermsData?.modules ?? [])
    .map((m) => ({
      ...m,
      permissions: m.permissions.filter(
        (p) =>
          !assignedIds.has(p.id) &&
          (permSearch === '' ||
            p.permissionName.toLowerCase().includes(permSearch.toLowerCase()) ||
            p.permissionKey.toLowerCase().includes(permSearch.toLowerCase()))
      ),
    }))
    .filter((m) => m.permissions.length > 0);

  const openEdit = () => {
    setEditForm({ roleName: role.roleName, description: role.description ?? '' });
    setEditOpen(true);
  };

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/rbac/roles" className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{role.roleName}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scopeMeta.cls}`}>
              {scopeMeta.label}
            </span>
            {role.isSystem && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Hệ thống</span>
            )}
          </div>
          <code className="mt-1 block text-xs text-muted-foreground">{role.roleKey}</code>
          {role.description && (
            <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={openEdit}
            disabled={role.isSystem}
            title={role.isSystem ? 'Không thể sửa vai trò hệ thống' : 'Sửa vai trò'}
            className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Edit2 size={13} /> Sửa
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            disabled={role.isSystem}
            title={role.isSystem ? 'Không thể xóa vai trò hệ thống' : 'Xóa vai trò'}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={13} /> Xóa
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CompactStat
          label="Quyền"
          value={role.permissions.length}
          sub="Permission được gán"
          icon={KeyRound}
          tone="bg-primary/10 text-primary"
        />
        <CompactStat
          label="Module"
          value={moduleCount}
          sub="Nhóm nghiệp vụ"
          icon={Layers3}
          tone="bg-sky-500/10 text-sky-700"
        />
        <CompactStat
          label="Tài khoản"
          value={role.accounts.length}
          sub="Đang dùng vai trò"
          icon={Users}
          tone="bg-emerald-500/10 text-emerald-700"
        />
        <CompactStat
          label="Loại vai trò"
          value={role.isSystem ? 'Hệ thống' : 'Tùy chỉnh'}
          sub={scopeMeta.label}
          icon={role.isSystem ? Crown : ShieldCheck}
          tone={role.isSystem ? 'bg-amber-500/10 text-amber-700' : 'bg-violet-500/10 text-violet-700'}
        />
      </div>

      {/* Permissions */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Quyền hạn ({role.permissions.length})
            </h2>
          </div>
          {!role.isSystem && (
            <button
              onClick={() => setAddPermOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition"
            >
              <Plus size={13} /> Thêm quyền
            </button>
          )}
        </div>

        {role.permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Vai trò này chưa có quyền nào.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(byModule).sort().map(([moduleKey, perms]) => (
              <div key={moduleKey}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {moduleKey}
                </p>
                <div className="flex flex-wrap gap-2">
                  {perms.map((p) => (
                    <div key={p.id} className="group relative flex items-center gap-1">
                      <span className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                        {p.permissionName}
                      </span>
                      {!role.isSystem && (
                        <button
                          onClick={() => removePermMut.mutate(p.id)}
                          disabled={removePermMut.isPending}
                          title={`Xóa quyền ${p.permissionKey}`}
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:pointer-events-none"
                        >
                          <X size={10} />
                        </button>
                      )}
                      <div className="pointer-events-none absolute bottom-full left-0 mb-1 hidden rounded bg-foreground px-2 py-1 text-xs text-background whitespace-nowrap group-hover:block z-10">
                        {p.permissionKey}
                        {p.description && <span className="block text-background/70">{p.description}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned accounts */}
      {role.accounts.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Tài khoản được gán ({role.accounts.length})
            </h2>
          </div>
          <div className="space-y-2">
            {role.accounts.map((acct) => (
              <div key={acct.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {acct.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{acct.fullName}</p>
                  <p className="text-xs text-muted-foreground">{acct.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  acct.scopeType === 'platform'
                    ? 'bg-violet-500/10 text-violet-700'
                    : acct.scopeType === 'business'
                    ? 'bg-sky-500/10 text-sky-700'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {SCOPE_TYPE_LABEL[acct.scopeType] ?? acct.scopeType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Sửa vai trò</h3>
              <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Tên vai trò *</label>
                <input
                  className={INPUT}
                  value={editForm.roleName}
                  onChange={(e) => setEditForm((f) => ({ ...f, roleName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Mô tả</label>
                <textarea
                  className={INPUT}
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            {updateMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                {(updateMut.error as any)?.response?.data?.message ?? 'Lỗi khi cập nhật.'}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditOpen(false)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition">
                Hủy
              </button>
              <button
                onClick={() => updateMut.mutate({ roleName: editForm.roleName, description: editForm.description })}
                disabled={updateMut.isPending || !editForm.roleName}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {updateMut.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">Xóa vai trò?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Vai trò <strong>{role.roleName}</strong> sẽ bị xóa vĩnh viễn, bao gồm tất cả các quyền và gán tài khoản liên quan. Hành động này không thể hoàn tác.
            </p>
            {deleteMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                {(deleteMut.error as any)?.response?.data?.message ?? 'Lỗi khi xóa.'}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(false)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition">
                Hủy
              </button>
              <button
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-60 transition"
              >
                {deleteMut.isPending ? 'Đang xóa...' : 'Xóa vai trò'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add permission modal */}
      {addPermOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-lg border border-border bg-background shadow-xl" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <h3 className="text-base font-semibold text-foreground">Thêm quyền</h3>
              <button
                onClick={() => { setAddPermOpen(false); setSelectedPerms(new Set()); setPermSearch(''); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-border p-4">
              <input
                type="text"
                placeholder="Tìm kiếm quyền..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!allPermsData ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : availableModules.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {permSearch ? 'Không tìm thấy quyền phù hợp.' : 'Tất cả quyền đã được gán.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {availableModules.map((m) => (
                    <div key={m.moduleKey}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {m.moduleKey}
                      </p>
                      <div className="space-y-1">
                        {m.permissions.map((p) => (
                          <label
                            key={p.id}
                            className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPerms.has(p.id)}
                              onChange={(e) => {
                                setSelectedPerms((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(p.id);
                                  else next.delete(p.id);
                                  return next;
                                });
                              }}
                              className="mt-0.5 rounded"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{p.permissionName}</p>
                              <code className="text-xs text-muted-foreground">{p.permissionKey}</code>
                              {p.description && (
                                <p className="mt-0.5 text-xs text-muted-foreground/70 line-clamp-1">{p.description}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border p-4">
              <p className="text-xs text-muted-foreground">
                {selectedPerms.size > 0 ? `Đã chọn ${selectedPerms.size} quyền` : 'Chưa chọn quyền nào'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setAddPermOpen(false); setSelectedPerms(new Set()); setPermSearch(''); }}
                  className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition"
                >
                  Hủy
                </button>
                <button
                  onClick={() => addPermMut.mutate(Array.from(selectedPerms))}
                  disabled={addPermMut.isPending || selectedPerms.size === 0}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
                >
                  {addPermMut.isPending ? 'Đang thêm...' : `Thêm ${selectedPerms.size > 0 ? `(${selectedPerms.size})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
