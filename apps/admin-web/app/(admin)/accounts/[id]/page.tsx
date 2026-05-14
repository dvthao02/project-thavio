'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, ChevronLeft, KeyRound, Lock, LockOpen, Loader2, Pencil, RotateCcw, Search, ShieldCheck, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface RoleBinding {
  bindingId: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  roleScope: string;
  scopeType: string;
}

interface BusinessBinding {
  id: string;
  businessId: string;
  businessCode: string;
  legalName: string;
  accessLevel: string;
  status: string;
}

interface AccountDetail {
  id: string;
  username: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  isPlatformAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  roles: RoleBinding[];
  businesses: BusinessBinding[];
}

interface Role { id: string; roleKey: string; roleName: string; roleScope: string; isSystem: boolean; }

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Hoạt động',   cls: 'bg-emerald-500/10 text-emerald-700' },
  locked:   { label: 'Đã khóa',     cls: 'bg-red-500/10 text-red-700' },
  disabled: { label: 'Vô hiệu hóa', cls: 'bg-muted text-muted-foreground' },
};

const SCOPE_META: Record<string, { label: string; cls: string }> = {
  platform: { label: 'Platform', cls: 'bg-violet-500/10 text-violet-700' },
  business: { label: 'Business', cls: 'bg-sky-500/10 text-sky-700' },
  store:    { label: 'Store',    cls: 'bg-orange-500/10 text-orange-700' },
};

const INPUT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start border-b border-border py-3 last:border-0">
      <p className="w-44 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function useEscape(active: boolean, fn: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') fn(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active, fn]);
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { permissions } = useAuthStore();
  const canUpdate = permissions.includes('platform.account.update');
  const canLock = permissions.includes('platform.account.lock');
  const canResetPwd = permissions.includes('platform.account.reset_password');
  const canManageRoles = permissions.includes('platform.role.assign_permission');

  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [lockConfirm, setLockConfirm] = useState<'lock' | 'unlock' | null>(null);

  const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '' });
  const [newPassword, setNewPassword] = useState('');
  const [roleSearch, setRoleSearch] = useState('');

  useEscape(editOpen, () => setEditOpen(false));
  useEscape(resetOpen, () => { setResetOpen(false); setNewPassword(''); });
  useEscape(assignOpen, () => { setAssignOpen(false); setRoleSearch(''); });
  useEscape(!!lockConfirm, () => setLockConfirm(null));

  const { data: account, isLoading } = useQuery<AccountDetail>({
    queryKey: ['account', id],
    queryFn: () => api.get(`/platform/accounts/${id}`).then((r) => r.data),
  });

  const { data: allRoles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['rbac-roles'],
    queryFn: () => api.get('/platform/rbac/roles').then((r) => r.data),
    enabled: assignOpen,
  });

  const updateMut = useMutation({
    mutationFn: (body: object) => api.patch(`/platform/accounts/${id}`, body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['account', id] }); setEditOpen(false); },
  });

  const resetMut = useMutation({
    mutationFn: (pwd: string) => api.post(`/platform/accounts/${id}/reset-password`, { newPassword: pwd }),
    onSuccess: () => { setResetOpen(false); setNewPassword(''); },
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => api.patch(`/platform/accounts/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', id] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setLockConfirm(null);
    },
  });

  const assignMut = useMutation({
    mutationFn: (roleId: string) =>
      api.post(`/platform/accounts/${id}/roles`, { roleId, scopeType: 'platform' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', id] });
      setAssignOpen(false);
      setRoleSearch('');
    },
  });

  const removeMut = useMutation({
    mutationFn: (bindingId: string) => api.delete(`/platform/accounts/${id}/roles/${bindingId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account', id] }),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-muted-foreground">Không tìm thấy tài khoản.</p>
        <Link href="/accounts" className="text-sm text-primary hover:underline">Quay lại</Link>
      </div>
    );
  }

  const sc = STATUS_CFG[account.status] ?? STATUS_CFG.disabled;
  const assignedRoleIds = new Set(account.roles.map((r) => r.roleId));

  const availableRoles = allRoles.filter((r) => {
    if (assignedRoleIds.has(r.id)) return false;
    if (roleSearch) {
      const q = roleSearch.toLowerCase();
      return r.roleName.toLowerCase().includes(q) || r.roleKey.toLowerCase().includes(q);
    }
    return true;
  });

  function openEdit() {
    setEditForm({ fullName: account!.fullName ?? '', email: account!.email ?? '', phone: account!.phone ?? '' });
    setEditOpen(true);
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/accounts" className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold uppercase tracking-wide text-foreground">
              {account.fullName ?? account.username}
            </h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.cls}`}>{sc.label}</span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">@{account.username}</p>
        </div>
        {canLock && (
          account.status === 'active' ? (
            <button
              onClick={() => setLockConfirm('lock')}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
            >
              <Lock size={13} /> Khóa tài khoản
            </button>
          ) : (
            <button
              onClick={() => setLockConfirm('unlock')}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition"
            >
              <LockOpen size={13} /> Kích hoạt
            </button>
          )
        )}
      </div>

      {/* Thông tin */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Thông tin tài khoản</h2>
          <div className="flex gap-2">
            {canUpdate && (
              <button
                onClick={openEdit}
                className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition"
              >
                <Pencil size={13} /> Sửa
              </button>
            )}
            {canResetPwd && (
              <button
                onClick={() => setResetOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition"
              >
                <RotateCcw size={13} /> Đặt lại mật khẩu
              </button>
            )}
          </div>
        </div>
        <InfoRow label="Họ tên" value={account.fullName} />
        <InfoRow label="Email" value={account.email} />
        <InfoRow label="Số điện thoại" value={account.phone} />
        <InfoRow label="Tên đăng nhập" value={<code className="rounded bg-muted px-1.5 py-0.5 text-xs">{account.username}</code>} />
        <InfoRow
          label="Platform Admin"
          value={
            account.isPlatformAdmin
              ? <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><ShieldCheck size={13} /> Có</span>
              : 'Không'
          }
        />
        <InfoRow
          label="Đăng nhập cuối"
          value={account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
        />
        <InfoRow label="Ngày tạo" value={new Date(account.createdAt).toLocaleString('vi-VN')} />
      </div>

      {/* Vai trò */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Vai trò ({account.roles.length})</h2>
          </div>
          {canManageRoles && (
            <button
              onClick={() => setAssignOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition"
            >
              + Gán vai trò
            </button>
          )}
        </div>
        {account.roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có vai trò nào được gán.</p>
        ) : (
          <div className="space-y-2">
            {account.roles.map((r) => {
              const scopeMeta = SCOPE_META[r.scopeType] ?? SCOPE_META.platform;
              return (
                <div key={r.bindingId} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.roleName}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{r.roleKey}</code>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scopeMeta.cls}`}>
                        {scopeMeta.label}
                      </span>
                    </div>
                  </div>
                  {canManageRoles && (
                    <button
                      onClick={() => removeMut.mutate(r.bindingId)}
                      disabled={removeMut.isPending}
                      title="Gỡ vai trò"
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition disabled:opacity-50"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Doanh nghiệp phụ trách */}
      {account.businesses.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Doanh nghiệp phụ trách ({account.businesses.length})
            </h2>
          </div>
          <div className="space-y-2">
            {account.businesses.map((b) => (
              <Link
                key={b.id}
                href={`/businesses/${b.businessId}`}
                className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/30 transition"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{b.legalName}</p>
                  <code className="mt-0.5 block text-xs text-muted-foreground">{b.businessCode}</code>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  b.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'
                }`}>
                  {b.accessLevel}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Sửa thông tin */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Sửa thông tin tài khoản</h3>
              <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <Field label="Họ tên">
                <input className={INPUT} value={editForm.fullName} onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} />
              </Field>
              <Field label="Email">
                <input type="email" className={INPUT} value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Số điện thoại">
                <input className={INPUT} value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </Field>
            </div>
            {updateMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                {(updateMut.error as any)?.response?.data?.message ?? 'Lỗi khi cập nhật. Thử lại.'}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditOpen(false)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition">Hủy</button>
              <button
                onClick={() => updateMut.mutate(editForm)}
                disabled={updateMut.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {updateMut.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Đặt lại mật khẩu */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Đặt lại mật khẩu</h3>
              <button onClick={() => { setResetOpen(false); setNewPassword(''); }} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <Field label="Mật khẩu mới (tối thiểu 8 ký tự)">
              <input
                type="password"
                className={INPUT}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
            </Field>
            {resetMut.isError && <p className="mt-3 text-xs text-destructive">Lỗi. Thử lại.</p>}
            {resetMut.isSuccess && <p className="mt-3 text-xs text-emerald-600">Đã đặt lại mật khẩu thành công.</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setResetOpen(false); setNewPassword(''); }} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition">Hủy</button>
              <button
                onClick={() => resetMut.mutate(newPassword)}
                disabled={resetMut.isPending || newPassword.length < 8}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {resetMut.isPending ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Khóa / Kích hoạt confirm */}
      {lockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">
              {lockConfirm === 'lock' ? 'Khóa tài khoản?' : 'Kích hoạt tài khoản?'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {lockConfirm === 'lock'
                ? `Tài khoản ${account.fullName ?? account.username} sẽ bị khóa và không thể đăng nhập.`
                : `Tài khoản ${account.fullName ?? account.username} sẽ được kích hoạt trở lại.`}
            </p>
            {statusMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                {(statusMut.error as any)?.response?.data?.message ?? 'Lỗi. Thử lại.'}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setLockConfirm(null)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition">Hủy</button>
              <button
                onClick={() => statusMut.mutate(lockConfirm === 'lock' ? 'locked' : 'active')}
                disabled={statusMut.isPending}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition ${
                  lockConfirm === 'lock' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {statusMut.isPending ? 'Đang xử lý...' : lockConfirm === 'lock' ? 'Khóa' : 'Kích hoạt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gán vai trò */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-sm flex-col rounded-lg border border-border bg-background shadow-xl" style={{ maxHeight: '70vh' }}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold text-foreground">Gán vai trò</h3>
              <button onClick={() => { setAssignOpen(false); setRoleSearch(''); }} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-border p-4">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm vai trò..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {rolesLoading ? (
                <div className="flex h-20 items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
              ) : availableRoles.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {roleSearch ? 'Không tìm thấy vai trò.' : 'Tất cả vai trò đã được gán.'}
                </p>
              ) : (
                availableRoles.map((r) => {
                  const meta = SCOPE_META[r.roleScope] ?? SCOPE_META.platform;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => assignMut.mutate(r.id)}
                      disabled={assignMut.isPending}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-muted/50 transition disabled:opacity-60"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{r.roleName}</p>
                        <code className="text-xs text-muted-foreground">{r.roleKey}</code>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {assignMut.isError && (
              <div className="border-t border-border px-5 py-3">
                <p className="text-xs text-destructive">
                  {(assignMut.error as any)?.response?.data?.message ?? 'Vai trò có thể đã được gán.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
