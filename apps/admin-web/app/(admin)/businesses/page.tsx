'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Building2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Business {
  id: string;
  businessCode: string;
  legalName: string;
  brandName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  subscriptionPlan: string;
  createdAt: string;
}

interface ListResponse {
  data: Business[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Hoạt động',  cls: 'bg-success/10 text-success' },
  trial:    { label: 'Dùng thử',   cls: 'bg-warning/10 text-warning' },
  suspended:{ label: 'Tạm khóa',   cls: 'bg-destructive/10 text-destructive' },
  inactive: { label: 'Ngừng HĐ',   cls: 'bg-muted text-muted-foreground' },
};

const PLAN_CLS: Record<string, string> = {
  STARTER:      'bg-muted text-muted-foreground',
  STANDARD:     'bg-primary/10 text-primary',
  PROFESSIONAL: 'bg-accent text-primary',
  ENTERPRISE:   'bg-primary text-primary-foreground',
};

export default function BusinessesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['businesses', { search, status, page }],
    queryFn: () =>
      api
        .get('/platform/businesses', {
          params: { search: search || undefined, status: status || undefined, page, limit: 20 },
        })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Doanh nghiệp</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${total} doanh nghiệp đã đăng ký` : 'Quản lý tất cả doanh nghiệp'}
          </p>
        </div>
        <Link
          href="/businesses/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-600 transition"
        >
          <Plus size={16} />
          Thêm doanh nghiệp
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm tên hoặc mã…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="text-sm border border-input rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="trial">Dùng thử</option>
          <option value="suspended">Tạm khóa</option>
          <option value="inactive">Ngừng hoạt động</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Doanh nghiệp</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Mã</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Liên hệ</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Gói</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Ngày tạo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Đang tải…</td>
              </tr>
            ) : !data?.data.length ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center">
                  <Building2 size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Không tìm thấy doanh nghiệp</p>
                </td>
              </tr>
            ) : (
              data.data.map((b) => {
                const sc = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.inactive;
                return (
                  <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase shrink-0">
                          {b.businessCode.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{b.legalName}</p>
                          {b.brandName && b.brandName !== b.legalName && (
                            <p className="text-xs text-muted-foreground truncate">{b.brandName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{b.businessCode}</code>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">
                      {b.email || b.phone || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_CLS[b.subscriptionPlan] ?? 'bg-muted text-muted-foreground'}`}>
                        {b.subscriptionPlan}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/businesses/${b.id}`} className="text-xs text-primary hover:underline">
                        Xem
                      </Link>
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
