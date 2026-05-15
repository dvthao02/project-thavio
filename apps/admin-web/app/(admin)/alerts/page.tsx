'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock3,
  CreditCard,
  Eye,
  Info,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api';

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertFilter = 'all' | AlertSeverity;

interface AlertItem {
  id: string;
  name: string;
  detail: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface PlatformAlert {
  type: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  count: number;
  items: AlertItem[];
}

interface AlertsResponse {
  alerts: PlatformAlert[];
  totalCritical: number;
  totalWarning: number;
  totalInfo: number;
}

const FILTERS: { key: AlertFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'critical', label: 'Nghiêm trọng' },
  { key: 'warning', label: 'Cảnh báo' },
  { key: 'info', label: 'Theo dõi' },
];

const ALERT_META: Record<
  string,
  {
    title: string;
    description: string;
    icon: React.ElementType;
    href: (item: AlertItem) => string;
  }
> = {
  subscription_overdue: {
    title: 'Gói dịch vụ quá hạn',
    description: 'Doanh nghiệp có gói dịch vụ đã hết hạn nhưng chưa được gia hạn.',
    icon: CreditCard,
    href: (item) => `/businesses/${item.id}`,
  },
  trial_expired: {
    title: 'Dùng thử đã hết hạn',
    description: 'Doanh nghiệp đã hết 10 ngày dùng thử nhưng vẫn chưa chuyển sang gói trả phí.',
    icon: ShieldAlert,
    href: (item) => `/businesses/${item.id}`,
  },
  trial_expiring: {
    title: 'Dùng thử sắp hết hạn',
    description: 'Doanh nghiệp còn tối đa 2 ngày dùng thử, cần được chăm sóc.',
    icon: Clock3,
    href: (item) => `/businesses/${item.id}`,
  },
  account_locked: {
    title: 'Tài khoản bị khóa',
    description: 'Tài khoản quản trị đang bị khóa, cần kiểm tra nếu ảnh hưởng vận hành.',
    icon: LockKeyhole,
    href: () => `/accounts`,
  },
  business_suspended: {
    title: 'Doanh nghiệp bị tạm khóa',
    description: 'Doanh nghiệp đang ở trạng thái tạm khóa.',
    icon: Building2,
    href: (item) => `/businesses/${item.id}`,
  },
};

const SEVERITY_META: Record<AlertSeverity, { label: string; card: string; badge: string; icon: string }> = {
  critical: {
    label: 'Nghiêm trọng',
    card: 'border-red-200 bg-red-50/70',
    badge: 'bg-red-500/10 text-red-700',
    icon: 'bg-red-500/10 text-red-700',
  },
  warning: {
    label: 'Cảnh báo',
    card: 'border-orange-200 bg-orange-50/70',
    badge: 'bg-orange-500/10 text-orange-700',
    icon: 'bg-orange-500/10 text-orange-700',
  },
  info: {
    label: 'Theo dõi',
    card: 'border-sky-200 bg-sky-50/70',
    badge: 'bg-sky-500/10 text-sky-700',
    icon: 'bg-sky-500/10 text-sky-700',
  },
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function alertTitle(alert: PlatformAlert) {
  return ALERT_META[alert.type]?.title ?? alert.title;
}

function alertDescription(alert: PlatformAlert) {
  return ALERT_META[alert.type]?.description ?? alert.description;
}

function alertIcon(alert: PlatformAlert) {
  return ALERT_META[alert.type]?.icon ?? AlertTriangle;
}

function alertHref(alert: PlatformAlert, item: AlertItem) {
  return ALERT_META[alert.type]?.href(item) ?? '#';
}

function CompactStat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: string;
  icon: React.ElementType;
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
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [filter, setFilter] = useState<AlertFilter>('all');

  const { data, isLoading, isError, isFetching, refetch } = useQuery<AlertsResponse>({
    queryKey: ['platform-alerts'],
    queryFn: () => api.get('/platform/alerts').then((res) => res.data),
    placeholderData: (previous) => previous,
  });

  const alerts = data?.alerts ?? [];
  const filteredAlerts = useMemo(() => {
    const rows = filter === 'all' ? alerts : alerts.filter((alert) => alert.severity === filter);
    return [...rows].sort((a, b) => {
      const weight: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
      return weight[a.severity] - weight[b.severity] || b.count - a.count;
    });
  }, [alerts, filter]);

  const total = (data?.totalCritical ?? 0) + (data?.totalWarning ?? 0) + (data?.totalInfo ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Cảnh báo & SLA</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi các cảnh báo cần xử lý: dùng thử, gói dịch vụ, tài khoản và doanh nghiệp.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <CompactStat label="Tổng cảnh báo" value={total} icon={AlertTriangle} tone="bg-primary/10 text-primary" />
        <CompactStat label="Nghiêm trọng" value={data?.totalCritical ?? 0} icon={ShieldAlert} tone="bg-red-500/10 text-red-700" />
        <CompactStat label="Cảnh báo" value={data?.totalWarning ?? 0} icon={Clock3} tone="bg-orange-500/10 text-orange-700" />
        <CompactStat label="Theo dõi" value={data?.totalInfo ?? 0} icon={Info} tone="bg-sky-500/10 text-sky-700" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-card p-1">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                filter === item.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Cảnh báo quá hạn xử lý yêu cầu hỗ trợ sẽ hiển thị khi backend bổ sung dữ liệu SLA.
        </p>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được cảnh báo. Kiểm tra quyền xem tổng quan và dịch vụ cảnh báo.
        </div>
      ) : null}

      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Đang tải cảnh báo...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            {filter === 'all' && total === 0 ? (
              <>
                <CheckCircle size={34} className="mx-auto mb-2 text-green-500" />
                <p className="text-sm font-medium text-foreground">Không có cảnh báo nào</p>
                <p className="mt-1 text-xs text-muted-foreground">Hệ thống đang hoạt động bình thường.</p>
              </>
            ) : (
              <>
                <AlertTriangle size={34} className="mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Không có cảnh báo phù hợp bộ lọc.</p>
              </>
            )}
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const severity = SEVERITY_META[alert.severity];
            const Icon = alertIcon(alert);
            return (
              <section key={alert.type} className={`rounded-lg border p-4 ${severity.card}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${severity.icon}`}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-foreground">{alertTitle(alert)}</h2>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severity.badge}`}>
                          {severity.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{alertDescription(alert)}</p>
                    </div>
                  </div>
                  <div className="rounded-md bg-background/80 px-3 py-1.5 text-sm font-semibold text-foreground">
                    {alert.count} mục
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto overflow-hidden rounded-lg border border-border bg-card">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Đối tượng</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Chi tiết</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thời điểm</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {alert.items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                            Không có dữ liệu chi tiết.
                          </td>
                        </tr>
                      ) : (
                        alert.items.map((item) => (
                          <tr key={`${alert.type}-${item.id}`} className="transition hover:bg-muted/20">
                            <td className="px-4 py-3.5">
                              <p className="font-medium text-foreground">{item.name}</p>
                              <code className="mt-1 block text-xs text-muted-foreground">{item.id}</code>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-muted-foreground">{item.detail}</td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">
                              {formatDate(item.updatedAt ?? item.createdAt) || '-'}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <Link
                                href={alertHref(alert, item)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted"
                              >
                                <Eye size={14} />
                                Xem
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
