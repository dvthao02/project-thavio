'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertTriangle, Building2, CheckCircle, Clock3, Eye, RotateCcw, Store, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';

const TRIAL_DAYS = 10;

type SubscriptionStatus = 'trialing' | 'trial_expired' | 'active' | 'past_due' | 'suspended' | 'cancelled';
type TrialTab = 'all' | 'trialing' | 'expiring' | 'expired';

interface Business {
  id: string;
  businessCode: string;
  legalName: string;
  brandName: string | null;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  subscriptionPlan: string;
  subscriptionStatus: SubscriptionStatus;
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
  { key: 'trialing', label: 'Đang trial' },
  { key: 'expiring', label: 'Sắp hết hạn (≤2 ngày)' },
  { key: 'expired', label: 'Đã hết hạn' },
];

const EMPTY_MESSAGES: Record<TrialTab, { title: string; description: string; good?: boolean }> = {
  all: {
    title: 'Chưa có doanh nghiệp nào đang trong giai đoạn dùng thử',
    description: 'Doanh nghiệp mới tạo với gói dùng thử sẽ xuất hiện tại đây.',
  },
  trialing: {
    title: 'Không có doanh nghiệp nào đang dùng thử',
    description: 'Các doanh nghiệp đã chuyển sang trả phí hoặc chưa có dữ liệu dùng thử.',
  },
  expiring: {
    title: 'Không có doanh nghiệp nào sắp hết hạn',
    description: 'Chưa có doanh nghiệp nào còn từ 1 đến 2 ngày dùng thử.',
    good: true,
  },
  expired: {
    title: 'Không có doanh nghiệp nào hết trial - tốt lắm!',
    description: 'Không có doanh nghiệp cần xử lý hết hạn dùng thử.',
    good: true,
  },
};

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function expiredDays(trialEndsAt: string | null) {
  if (!trialEndsAt) return 0;
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - end.getTime()) / 86_400_000));
}

function trialProgress(row: Business) {
  if (row.subscriptionStatus === 'trial_expired') return 100;
  const daysUsed = TRIAL_DAYS - (row.trialDaysLeft ?? 0);
  return Math.min(100, Math.max(0, (daysUsed / TRIAL_DAYS) * 100));
}

function trialTone(row: Business) {
  if (row.subscriptionStatus === 'trial_expired') {
    return { bar: 'bg-red-500', badge: 'bg-red-500/10 text-red-700' };
  }

  const left = row.trialDaysLeft ?? 0;
  if (left <= 2 && left > 0) return { bar: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-700' };
  if (left > 5) return { bar: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-700' };
  return { bar: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-700' };
}

function trialLabel(row: Business) {
  if (row.subscriptionStatus === 'trial_expired') {
    const days = expiredDays(row.trialEndsAt);
    return days > 0 ? `Đã hết hạn ${days} ngày` : 'Đã hết hạn';
  }

  const left = row.trialDaysLeft ?? 0;
  if (left <= 0) return 'Hết hạn hôm nay';
  return `Còn ${left} ngày`;
}

function statusBadge(row: Business) {
  if (row.subscriptionStatus === 'trial_expired') {
    return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700">Đã hết hạn</span>;
  }

  if ((row.trialDaysLeft ?? 0) <= 2) {
    return (
      <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-700">
        Sắp hết hạn
      </span>
    );
  }

  return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700">Đang dùng thử</span>;
}

function CompactStat({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  description: string;
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
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: 7 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-4 py-4">
              <div className="h-4 animate-pulse rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function TrialsPage() {
  const [tab, setTab] = useState<TrialTab>('all');

  const { data, isLoading, isError, isFetching, refetch } = useQuery<ListResponse>({
    queryKey: ['subscription-trials'],
    queryFn: () => api.get('/platform/businesses', { params: { limit: 100 } }).then((res) => res.data),
    placeholderData: (previous) => previous,
  });

  const rows = useMemo(() => {
    const trialRows = (data?.data ?? []).filter(
      (row) => row.subscriptionStatus === 'trialing' || row.subscriptionStatus === 'trial_expired',
    );

    return [...trialRows].sort((a, b) => {
      if (a.subscriptionStatus !== b.subscriptionStatus) {
        return a.subscriptionStatus === 'trial_expired' ? -1 : 1;
      }

      if (a.subscriptionStatus === 'trial_expired') {
        return expiredDays(b.trialEndsAt) - expiredDays(a.trialEndsAt);
      }

      return (a.trialDaysLeft ?? TRIAL_DAYS) - (b.trialDaysLeft ?? TRIAL_DAYS);
    });
  }, [data?.data]);

  const stats = useMemo(
    () => ({
      trialing: rows.filter((row) => row.subscriptionStatus === 'trialing').length,
      expiring: rows.filter(
        (row) => row.subscriptionStatus === 'trialing' && (row.trialDaysLeft ?? TRIAL_DAYS) <= 2,
      ).length,
      expired: rows.filter((row) => row.subscriptionStatus === 'trial_expired').length,
    }),
    [rows],
  );

  const filteredRows = useMemo(() => {
    if (tab === 'trialing') return rows.filter((row) => row.subscriptionStatus === 'trialing');
    if (tab === 'expiring') {
      return rows.filter((row) => row.subscriptionStatus === 'trialing' && (row.trialDaysLeft ?? TRIAL_DAYS) <= 2);
    }
    if (tab === 'expired') return rows.filter((row) => row.subscriptionStatus === 'trial_expired');
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
            Theo dõi doanh nghiệp đang trong 10 ngày dùng thử và ưu tiên xử lý các trường hợp sắp hết hạn.
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

      <div className="grid gap-2 md:grid-cols-3">
        <CompactStat
          label="Đang dùng thử"
          value={stats.trialing}
          description={`Trong thời hạn ${TRIAL_DAYS} ngày`}
          icon={Clock3}
          tone="bg-blue-500/10 text-blue-700"
        />
        <CompactStat
          label="Sắp hết hạn"
          value={stats.expiring}
          description="Còn tối đa 2 ngày"
          icon={AlertTriangle}
          tone="bg-orange-500/10 text-orange-700"
        />
        <CompactStat
          label="Đã hết hạn"
          value={stats.expired}
          description="Cần gia hạn hoặc khóa truy cập"
          icon={Building2}
          tone="bg-red-500/10 text-red-700"
        />
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
          {filteredRows.length} / {rows.length} doanh nghiệp dùng thử
        </p>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được danh sách dùng thử. Kiểm tra API doanh nghiệp và quyền xem gói dịch vụ.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full min-w-[1120px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Doanh nghiệp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cửa hàng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Ngày tạo</th>
              <th className="min-w-[230px] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Thời hạn dùng thử
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Nhân viên phụ trách</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <SkeletonRows />
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  {empty.good ? (
                    <CheckCircle size={34} className="mx-auto mb-2 text-emerald-500" />
                  ) : (
                    <RotateCcw size={34} className="mx-auto mb-2 text-muted-foreground/40" />
                  )}
                  <p className="text-sm font-medium text-foreground">{empty.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{empty.description}</p>
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const tone = trialTone(row);
                const percentage = trialProgress(row);

                return (
                  <tr key={row.id} className="transition hover:bg-muted/20">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground">{row.legalName}</p>
                      <code className="mt-1 inline-flex rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {row.businessCode}
                      </code>
                    </td>
                    <td className="px-4 py-3.5">
                      {row.firstStore ? (
                        <div className="flex items-center gap-2">
                          <Store size={15} className="text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{row.firstStore.storeName}</p>
                            <code className="text-xs text-muted-foreground">{row.firstStore.storeCode}</code>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Chưa có</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone.badge}`}>
                          {trialLabel(row)}
                        </span>
                        <span className="text-xs text-muted-foreground">hết ngày {formatDate(row.trialEndsAt)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${percentage}%` }} />
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
                    <td className="px-4 py-3.5">{statusBadge(row)}</td>
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
