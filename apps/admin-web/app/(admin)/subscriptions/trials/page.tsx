'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertTriangle, Building2, CheckCircle, Clock3, Eye, RotateCcw, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';

const TRIAL_DAYS = 10;

type TrialTab = 'all' | 'trialing' | 'expiring' | 'expired';

interface Business {
  id: string;
  businessCode: string;
  legalName: string;
  brandName: string | null;
  status: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  createdAt: string;
  assignedAccount: { id: string; fullName: string; email: string | null } | null;
  firstStore: { storeCode: string; storeName: string } | null;
}

interface ListResponse {
  data: Business[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const TAB_CONFIG: { key: TrialTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'trialing', label: 'Đang dùng thử' },
  { key: 'expiring', label: 'Sắp hết hạn ≤2 ngày' },
  { key: 'expired', label: 'Đã hết hạn' },
];

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function trialTone(b: Business) {
  if (b.subscriptionStatus === 'trial_expired') {
    return { bar: 'bg-red-500', badge: 'bg-red-500/10 text-red-700' };
  }
  const left = b.trialDaysLeft ?? 0;
  if (left <= 2) return { bar: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-700' };
  if (left > 5) return { bar: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-700' };
  return { bar: 'bg-sky-500', badge: 'bg-sky-500/10 text-sky-700' };
}

function progressPct(b: Business) {
  if (b.subscriptionStatus === 'trial_expired') return 100;
  const left = b.trialDaysLeft ?? 0;
  return Math.min(100, Math.max(0, ((TRIAL_DAYS - left) / TRIAL_DAYS) * 100));
}

function daysLabel(b: Business) {
  if (b.subscriptionStatus === 'trial_expired') {
    if (!b.trialEndsAt) return 'Đã hết hạn';
    const overdue = Math.floor((Date.now() - new Date(b.trialEndsAt).getTime()) / 86_400_000);
    return `Hết hạn ${overdue} ngày trước`;
  }
  const left = b.trialDaysLeft ?? 0;
  return left === 0 ? 'Hôm nay hết hạn' : `Còn ${left} ngày`;
}

function StatCard({ label, value, sub, tone, icon: Icon }: {
  label: string; value: number; sub: string; tone: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-md ${tone}`}>
        <Icon size={17} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

const EMPTY_MESSAGES: Record<TrialTab, { title: string; sub: string; good?: boolean }> = {
  all: { title: 'Chưa có doanh nghiệp dùng thử nào.', sub: 'Doanh nghiệp mới tạo sẽ xuất hiện ở đây.' },
  trialing: { title: 'Không có doanh nghiệp đang dùng thử.', sub: '' },
  expiring: { title: 'Không có doanh nghiệp sắp hết hạn.', sub: 'Tốt lắm — không cần chăm sóc khẩn.', good: true },
  expired: { title: 'Không có doanh nghiệp đã hết hạn dùng thử.', sub: 'Tất cả đều đã chuyển đổi hoặc đang trong thời hạn.', good: true },
};

export default function TrialsPage() {
  const [tab, setTab] = useState<TrialTab>('all');

  const { data, isLoading, isError, refetch, isFetching } = useQuery<ListResponse>({
    queryKey: ['subscription-trials'],
    queryFn: () => api.get('/platform/businesses', { params: { limit: 100 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const rows = useMemo(() => {
    const all = (data?.data ?? []).filter(
      (b) => b.subscriptionStatus === 'trialing' || b.subscriptionStatus === 'trial_expired',
    );
    return all.sort((a, b) => {
      if (a.subscriptionStatus !== b.subscriptionStatus) {
        return a.subscriptionStatus === 'trial_expired' ? -1 : 1;
      }
      return (a.trialDaysLeft ?? 0) - (b.trialDaysLeft ?? 0);
    });
  }, [data]);

  const stats = useMemo(() => ({
    trialing: rows.filter((b) => b.subscriptionStatus === 'trialing').length,
    expiring: rows.filter((b) => b.subscriptionStatus === 'trialing' && (b.trialDaysLeft ?? 0) <= 2).length,
    expired: rows.filter((b) => b.subscriptionStatus === 'trial_expired').length,
  }), [rows]);

  const filtered = useMemo(() => {
    if (tab === 'trialing') return rows.filter((b) => b.subscriptionStatus === 'trialing');
    if (tab === 'expiring') return rows.filter((b) => b.subscriptionStatus === 'trialing' && (b.trialDaysLeft ?? 0) <= 2);
    if (tab === 'expired') return rows.filter((b) => b.subscriptionStatus === 'trial_expired');
    return rows;
  }, [rows, tab]);

  const empty = EMPTY_MESSAGES[tab];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw size={20} className="text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Dùng thử & gia hạn</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi vòng đời dùng thử 10 ngày và ưu tiên các doanh nghiệp cần chăm sóc.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <RotateCcw size={16} className={isFetching ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Đang dùng thử" value={stats.trialing} sub={`Trong ${TRIAL_DAYS} ngày dùng thử`} icon={Clock3} tone="bg-sky-500/10 text-sky-700" />
        <StatCard label="Sắp hết hạn" value={stats.expiring} sub="Còn tối đa 2 ngày" icon={AlertTriangle} tone="bg-orange-500/10 text-orange-700" />
        <StatCard label="Đã hết hạn" value={stats.expired} sub="Chưa chuyển sang gói trả phí" icon={Building2} tone="bg-red-500/10 text-red-700" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-card p-1">
          {TAB_CONFIG.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                tab === item.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} / {data?.meta?.total ?? 0} doanh nghiệp
        </p>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được danh sách dùng thử. Kiểm tra kết nối dịch vụ.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Doanh nghiệp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Ngày tạo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground min-w-[200px]">Thời hạn trial</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Nhân viên phụ trách</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  {empty.good ? (
                    <CheckCircle size={34} className="mx-auto mb-2 text-emerald-500" />
                  ) : (
                    <RotateCcw size={34} className="mx-auto mb-2 text-muted-foreground/40" />
                  )}
                  <p className="text-sm font-medium text-foreground">{empty.title}</p>
                  {empty.sub && <p className="mt-1 text-xs text-muted-foreground">{empty.sub}</p>}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const tone = trialTone(row);
                const pct = progressPct(row);
                return (
                  <tr key={row.id} className="transition hover:bg-muted/20">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground">{row.legalName || row.brandName || '—'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{row.businessCode}</code>
                        {row.firstStore && (
                          <span className="text-xs text-muted-foreground">{row.firstStore.storeName}</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone.badge}`}>
                          {daysLabel(row)}
                        </span>
                        <span className="text-xs text-muted-foreground">hết {formatDate(row.trialEndsAt)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {row.assignedAccount ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {row.assignedAccount.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{row.assignedAccount.fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">{row.assignedAccount.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserCheck size={14} />
                          Chưa phân công
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {row.subscriptionStatus === 'trial_expired' ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700">Hết hạn</span>
                      ) : (row.trialDaysLeft ?? 0) <= 2 ? (
                        <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-700">Sắp hết hạn</span>
                      ) : (
                        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700">Đang dùng thử</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/businesses/${row.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted"
                      >
                        <Eye size={14} />
                        Xem
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
