'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Users, ShieldCheck, Shield } from 'lucide-react';
import { api } from '@/lib/api';

interface Account {
  id: string;
  email: string;
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
  active:    { label: 'Hoạt động', cls: 'bg-success/10 text-success' },
  suspended: { label: 'Tạm khóa', cls: 'bg-destructive/10 text-destructive' },
  inactive:  { label: 'Ngừng HĐ', cls: 'bg-muted text-muted-foreground' },
};

export default function AccountsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['accounts', { search, page }],
    queryFn: () =>
      api
        .get('/platform/accounts', {
          params: { search: search || undefined, page, limit: 20 },
        })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/platform/accounts/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tài khoản</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${total} tài khoản nền tảng` : 'Quản lý tài khoản nền tảng'}
          </p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Tìm email hoặc tên đăng nhập…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Tài khoản</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tên đăng nhập</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Vai trò</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Đăng nhập lần cuối</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Đang tải…</td>
              </tr>
            ) : !data?.data.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center">
                  <Users size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Không tìm thấy tài khoản</p>
                </td>
              </tr>
            ) : (
              data.data.map((a) => {
                const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.inactive;
                return (
                  <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold uppercase">
                          {(a.fullName ?? a.username).slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{a.fullName ?? a.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{a.username}</code>
                    </td>
                    <td className="px-4 py-3.5">
                      {a.isPlatformAdmin ? (
                        <span className="flex items-center gap-1 text-xs text-primary font-medium">
                          <ShieldCheck size={13} /> Platform Admin
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Shield size={13} /> Standard
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {a.lastLoginAt
                        ? new Date(a.lastLoginAt).toLocaleString('vi-VN')
                        : 'Chưa đăng nhập'}
                    </td>
                    <td className="px-4 py-3.5">
                      {a.status === 'active' ? (
                        <button
                          onClick={() => updateStatus.mutate({ id: a.id, status: 'suspended' })}
                          className="text-xs text-destructive hover:underline"
                        >
                          Tạm khóa
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus.mutate({ id: a.id, status: 'active' })}
                          className="text-xs text-success hover:underline"
                        >
                          Kích hoạt
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {total > 20 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Hiển thị {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} / {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs px-3 py-1.5 border border-input rounded-md disabled:opacity-40 hover:bg-muted transition"
              >
                Trước
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= (data?.meta.totalPages ?? 1)}
                className="text-xs px-3 py-1.5 border border-input rounded-md disabled:opacity-40 hover:bg-muted transition"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
