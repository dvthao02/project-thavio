'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Building2,
  Users,
  CheckCircle,
  PauseCircle,
  XCircle,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardStats {
  businesses: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    inactive: number;
  };
  accounts: {
    total: number;
  };
  recentBusinesses: Array<{
    id: string;
    businessCode: string;
    legalName: string;
    brandName: string | null;
    status: string;
    subscriptionPlan: string;
    createdAt: string;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Hoạt động',     cls: 'bg-success/10 text-success' },
  pending:   { label: 'Chờ duyệt',     cls: 'bg-warning/10 text-warning' },
  suspended: { label: 'Tạm khóa',      cls: 'bg-destructive/10 text-destructive' },
  inactive:  { label: 'Ngừng HĐ',      cls: 'bg-muted text-muted-foreground' },
};

const PLAN_CONFIG: Record<string, string> = {
  STARTER:      'bg-muted text-muted-foreground',
  STANDARD:     'bg-primary/10 text-primary',
  PROFESSIONAL: 'bg-accent text-primary',
  ENTERPRISE:   'bg-primary text-primary-foreground',
  starter:      'bg-muted text-muted-foreground',
  standard:     'bg-primary/10 text-primary',
  professional: 'bg-accent text-primary',
  enterprise:   'bg-primary text-primary-foreground',
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon size={18} className={color} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-muted rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/platform/dashboard/stats').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const total = data?.businesses.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tổng quan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Thống kê nền tảng Thavio</p>
        </div>
        <Link
          href="/businesses/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-600 transition"
        >
          <Plus size={15} />
          Thêm doanh nghiệp
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng doanh nghiệp"
          value={isLoading ? '—' : total}
          icon={Building2}
          color="text-primary"
          bg="bg-primary/10"
          sub={total > 0 ? `${data?.businesses.active ?? 0} đang hoạt động` : undefined}
        />
        <StatCard
          label="Đang hoạt động"
          value={isLoading ? '—' : (data?.businesses.active ?? 0)}
          icon={CheckCircle}
          color="text-success"
          bg="bg-success/10"
          sub={total > 0 ? `${Math.round(((data?.businesses.active ?? 0) / total) * 100)}% tổng số` : undefined}
        />
        <StatCard
          label="Chờ duyệt"
          value={isLoading ? '—' : (data?.businesses.pending ?? 0)}
          icon={PauseCircle}
          color="text-warning"
          bg="bg-warning/10"
          sub={total > 0 ? `${Math.round(((data?.businesses.pending ?? 0) / total) * 100)}% tổng số` : undefined}
        />
        <StatCard
          label="Tài khoản nền tảng"
          value={isLoading ? '—' : (data?.accounts.total ?? 0)}
          icon={Users}
          color="text-primary"
          bg="bg-primary/10"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Phân bổ trạng thái */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Phân bổ trạng thái</h2>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : total === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có doanh nghiệp</p>
          ) : (
            <div className="space-y-3">
              {[
                { key: 'active',    label: 'Hoạt động', val: data?.businesses.active ?? 0,    dot: 'bg-success' },
                { key: 'pending',   label: 'Chờ duyệt', val: data?.businesses.pending ?? 0,   dot: 'bg-warning' },
                { key: 'suspended', label: 'Tạm khóa',  val: data?.businesses.suspended ?? 0, dot: 'bg-destructive' },
                { key: 'inactive',  label: 'Ngừng HĐ',  val: data?.businesses.inactive ?? 0,  dot: 'bg-muted-foreground' },
              ].map(({ key, label, val, dot }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${dot}`} />
                      <span className="text-muted-foreground">{label}</span>
                    </div>
                    <span className="font-medium text-foreground">{val}</span>
                  </div>
                  <ProgressBar value={val} total={total} color={dot} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Doanh nghiệp mới nhất */}
        <div className="col-span-2 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Doanh nghiệp mới nhất</h2>
            <Link href="/businesses" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Đang tải…</div>
            ) : !data?.recentBusinesses?.length ? (
              <div className="px-5 py-8 text-center">
                <Building2 size={28} className="mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Chưa có doanh nghiệp nào</p>
                <Link href="/businesses/new" className="mt-2 inline-block text-xs text-primary hover:underline">
                  Tạo doanh nghiệp đầu tiên
                </Link>
              </div>
            ) : (
              data.recentBusinesses.map((b) => {
                const sc = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.inactive;
                return (
                  <Link
                    key={b.id}
                    href={`/businesses/${b.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase shrink-0">
                      {b.businessCode.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {b.legalName}
                      </p>
                      <p className="text-xs text-muted-foreground">{b.businessCode}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${PLAN_CONFIG[b.subscriptionPlan] ?? 'bg-muted text-muted-foreground'}`}>
                      {b.subscriptionPlan}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${sc.cls}`}>
                      {sc.label}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            href: '/businesses/new',
            icon: Building2,
            title: 'Thêm doanh nghiệp',
            desc: 'Khởi tạo tenant mới trên nền tảng',
            color: 'text-primary',
            bg: 'bg-primary/10',
          },
          {
            href: '/businesses',
            icon: PauseCircle,
            title: 'Quản lý doanh nghiệp',
            desc: 'Xem, tìm kiếm và cập nhật trạng thái',
            color: 'text-warning',
            bg: 'bg-warning/10',
          },
          {
            href: '/accounts',
            icon: Users,
            title: 'Quản lý tài khoản',
            desc: 'Tài khoản nền tảng và phân quyền',
            color: 'text-success',
            bg: 'bg-success/10',
          },
        ].map(({ href, icon: Icon, title, desc, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 bg-card border border-border rounded-lg p-5 hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
              <Icon size={18} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
