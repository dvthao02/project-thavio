'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Eye, Plus, Search, Shield, ShieldCheck, Users, X } from 'lucide-react';
import { api } from '@/lib/api';

interface Account {
  id: string;
  email: string | null;
  username: string;
  fullName: string | null;
  status: string;
  isPlatformAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface ListResponse {
  data: Account[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Hoạt động',    cls: 'bg-emerald-500/10 text-emerald-700' },
  locked:   { label: 'Đã khóa',      cls: 'bg-red-500/10 text-red-700' },
  disabled: { label: 'Vô hiệu hóa',  cls: 'bg-muted text-muted-foreground' },
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

const DEFAULT_FORM = { username: '', password: '', fullName: '', email: '', phone: '', isPlatformAdmin: false };

export default function AccountsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['accounts', { search, page }],
    queryFn: () =>
      api.get('/platform/accounts', { params: { search: search || undefined, page, limit: 20 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/platform/accounts/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api.post('/platform/accounts', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setCreateOpen(false);
      setForm(DEFAULT_FORM);
    },
  });

  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tài khoản</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {data ? `${total} tài khoản nền tảng` : 'Quản lý tài khoản nền tảng'}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          <Plus size={16} /> Tạo tài khoản
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Tìm email hoặc tên đăng nhập…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Tài khoản</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tên đăng nhập</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Vai trò</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Đăng nhập cuối</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-muted" /></td>
                  ))}
                </tr>
              ))
            ) : !data?.data.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center">
                  <Users size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Không tìm thấy tài khoản</p>
                </td>
              </tr>
            ) : (
              data.data.map((a) => {
                const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.disabled;
                return (
                  <tr key={a.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                          {(a.fullName ?? a.username).slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{a.fullName ?? a.username}</p>
                          <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{a.username}</code>
                    </td>
                    <td className="px-4 py-3.5">
                      {a.isPlatformAdmin ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          <ShieldCheck size={13} /> Quản trị nền tảng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Shield size={13} /> Tài khoản thường
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sc.cls}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/accounts/${a.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-muted transition"
                        >
                          <Eye size={12} /> Chi tiết
                        </Link>
                        {a.status === 'active' ? (
                          <button onClick={() => updateStatus.mutate({ id: a.id, status: 'locked' })} className="text-xs text-red-600 hover:underline">
                            Khóa
                          </button>
                        ) : (
                          <button onClick={() => updateStatus.mutate({ id: a.id, status: 'active' })} className="text-xs text-emerald-600 hover:underline">
                            Kích hoạt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {total > 20 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} / {total}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-input px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-muted transition">Trước</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= (data?.meta.totalPages ?? 1)} className="rounded-md border border-input px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-muted transition">Sau</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Tạo tài khoản */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Tạo tài khoản mới</h3>
              <button onClick={() => setCreateOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <Field label="Họ tên *">
                <input className={INPUT} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Nguyễn Văn A" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tên đăng nhập *">
                  <input className={INPUT} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="nguyenvana" />
                </Field>
                <Field label="Mật khẩu *">
                  <input type="password" className={INPUT} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="≥ 8 ký tự" />
                </Field>
              </div>
              <Field label="Email">
                <input type="email" className={INPUT} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </Field>
              <Field label="Số điện thoại">
                <input className={INPUT} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0901234567" />
              </Field>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="rounded" checked={form.isPlatformAdmin} onChange={(e) => setForm((f) => ({ ...f, isPlatformAdmin: e.target.checked }))} />
                <span className="text-sm text-foreground">Là Platform Admin</span>
              </label>
            </div>
            {createMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                {(createMut.error as any)?.response?.data?.message ?? 'Lỗi khi tạo tài khoản.'}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setCreateOpen(false)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition">Hủy</button>
              <button
                onClick={() => createMut.mutate(form)}
                disabled={createMut.isPending || !form.username || !form.password || !form.fullName}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {createMut.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
