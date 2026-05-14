'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Activity,
  Building2,
  CheckCircle,
  FlaskConical,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';

type Period = '7d' | '30d' | '3m' | '6m' | '1y';

interface DashboardStats {
  businesses: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    inactive: number;
    trial: number;
    newInPeriod: number;
    byPlan: { plan: string; total: number }[];
    byPeriod: { label: string; total: number }[];
  };
  accounts: { total: number; locked: number; newInPeriod: number };
  recentBusinesses: Array<{
    id: string;
    businessCode: string;
    legalName: string;
    brandName: string | null;
    status: string;
    subscriptionPlan: string;
    createdAt: string;
  }>;
  recentAccounts: Array<{
    id: string;
    username: string;
    fullName: string | null;
    email: string | null;
    status: string;
    isPlatformAdmin: boolean;
    createdAt: string;
  }>;
  period: Period;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: '3m', label: '3 tháng' },
  { key: '6m', label: '6 tháng' },
  { key: '1y', label: '1 năm' },
];

const ASSIGNEES = [
  { id: '', label: 'Tất cả phụ trách' },
  { id: 'minh-anh', label: 'Nguyễn Minh Anh' },
  { id: 'quoc-bao', label: 'Trần Quốc Bảo' },
  { id: 'thu-ha', label: 'Phạm Thu Hà' },
  { id: 'hoai-nam', label: 'Lê Hoài Nam' },
];

const STATUS_CFG: Record<string, { label: string; cls: string; color: string; dot: string }> = {
  active: { label: 'Hoạt động', cls: 'bg-emerald-500/10 text-emerald-600', color: '#10b981', dot: 'bg-emerald-500' },
  trial: { label: 'Dùng thử', cls: 'bg-sky-500/10 text-sky-600', color: '#0ea5e9', dot: 'bg-sky-500' },
  pending: { label: 'Chờ kích hoạt', cls: 'bg-amber-500/10 text-amber-600', color: '#f59e0b', dot: 'bg-amber-500' },
  suspended: { label: 'Tạm khóa', cls: 'bg-red-500/10 text-red-600', color: '#ef4444', dot: 'bg-red-500' },
  inactive: { label: 'Ngừng HĐ', cls: 'bg-muted text-muted-foreground', color: '#94a3b8', dot: 'bg-slate-400' },
};

const PLAN_COLOR: Record<string, string> = {
  starter: '#64748b',
  standard: '#1A7AE8',
  professional: '#0891b2',
  enterprise: '#0f172a',
  pro: '#0891b2',
};

function norm(s: string) {
  return (s ?? 'starter').toLowerCase();
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconCls,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconCls: string;
  trend?: number;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${iconCls}`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {(sub !== undefined || trend !== undefined) && (
        <div className="mt-2">
          {trend !== undefined && trend > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium">
              <TrendingUp size={11} /> +{trend} trong kỳ
            </span>
          )}
          {trend === 0 && <span className="text-xs text-muted-foreground">Không đổi trong kỳ</span>}
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [assigneeId, setAssigneeId] = useState('');

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', period, assigneeId],
    queryFn: () =>
      api
        .get('/platform/dashboard/stats', {
          params: { period, assignedAccountId: assigneeId || undefined },
        })
        .then((r) => r.data),
    refetchInterval: 60_000,
  });

  const total = data?.businesses.total ?? 0;
  const donutData = [
    { name: 'Hoạt động', value: data?.businesses.active ?? 0, fill: '#10b981' },
    { name: 'Dùng thử', value: data?.businesses.trial ?? 0, fill: '#0ea5e9' },
    { name: 'Chờ kích hoạt', value: data?.businesses.pending ?? 0, fill: '#f59e0b' },
    { name: 'Tạm khóa', value: data?.businesses.suspended ?? 0, fill: '#ef4444' },
    { name: 'Ngừng HĐ', value: data?.businesses.inactive ?? 0, fill: '#94a3b8' },
  ].filter((d) => d.value > 0);

  const planData = (data?.businesses.byPlan ?? []).map((p) => ({
    name: p.plan.charAt(0).toUpperCase() + p.plan.slice(1).toLowerCase(),
    total: p.total,
    fill: PLAN_COLOR[norm(p.plan)] ?? '#94a3b8',
  }));

  const areaData = (data?.businesses.byPeriod ?? []).map((p) => ({
    label: p.label,
    'Doanh nghiệp': p.total,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tổng quan nền tảng</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Thống kê và hoạt động Thavio Platform</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <UserCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="h-9 min-w-48 rounded-lg border border-input bg-card pl-8 pr-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ASSIGNEES.map((item) => (
                <option key={item.id || 'all'} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard label="Tổng doanh nghiệp" value={total} icon={Building2} iconCls="bg-primary/10 text-primary" trend={data?.businesses.newInPeriod} />
            <StatCard label="Hoạt động" value={data?.businesses.active ?? 0} icon={CheckCircle} iconCls="bg-emerald-500/10 text-emerald-600" sub={total > 0 ? `${Math.round(((data?.businesses.active ?? 0) / total) * 100)}%` : undefined} />
            <StatCard label="Dùng thử" value={data?.businesses.trial ?? 0} icon={FlaskConical} iconCls="bg-sky-500/10 text-sky-600" sub={total > 0 ? `${Math.round(((data?.businesses.trial ?? 0) / total) * 100)}%` : undefined} />
            <StatCard label="Chờ kích hoạt" value={data?.businesses.pending ?? 0} icon={Activity} iconCls="bg-amber-500/10 text-amber-600" />
            <StatCard label="Ngừng / Khóa" value={`${data?.businesses.inactive ?? 0} / ${data?.businesses.suspended ?? 0}`} icon={Building2} iconCls="bg-slate-500/10 text-slate-500" />
            <StatCard label="Tài khoản" value={data?.accounts.total ?? 0} icon={Users} iconCls="bg-violet-500/10 text-violet-600" trend={data?.accounts.newInPeriod} />
          </>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tăng trưởng doanh nghiệp</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Số doanh nghiệp tạo mới trong kỳ</p>
            </div>
            <Activity size={15} className="text-muted-foreground" />
          </div>
          {isLoading ? <Skeleton className="h-56" /> : areaData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <TrendingUp size={28} className="opacity-20" />
              <p className="text-sm">Chưa có doanh nghiệp nào trong kỳ này</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--border))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--border))" allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="Doanh nghiệp" stroke="#1A7AE8" strokeWidth={2} fill="#1A7AE820" dot={{ r: 4, fill: '#1A7AE8', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="col-span-4 bg-card border border-border rounded-xl p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-foreground">Phân bổ trạng thái</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Tỉ lệ theo trạng thái doanh nghiệp</p>
          </div>
          {isLoading ? <Skeleton className="h-56" /> : total === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Building2 size={28} className="opacity-20" />
              <p className="text-sm">Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                      {donutData.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-foreground">{total}</span>
                  <span className="text-xs text-muted-foreground">tổng</span>
                </div>
              </div>
              <div className="w-full space-y-2">
                {(['active', 'trial', 'pending', 'suspended', 'inactive'] as const).map((key) => {
                  const val = data?.businesses[key as keyof typeof data.businesses] as number ?? 0;
                  const cfg = STATUS_CFG[key];
                  return (
                    <div key={key} className="flex items-center gap-2 px-1 py-0.5">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                      <span className="text-xs text-muted-foreground flex-1">{cfg.label}</span>
                      <span className="text-xs font-semibold text-foreground">{val}</span>
                      <span className="text-xs text-muted-foreground w-8 text-right">{total > 0 ? `${Math.round((val / total) * 100)}%` : '0%'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 bg-card border border-border rounded-xl p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-foreground">Phân bổ gói dịch vụ</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Số doanh nghiệp theo gói đăng ký</p>
          </div>
          {isLoading ? <Skeleton className="h-44" /> : planData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={planData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--border))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--border))" allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="total" name="Doanh nghiệp" radius={[4, 4, 0, 0]}>
                  {planData.map((p, i) => <Cell key={i} fill={p.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="col-span-4 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Doanh nghiệp mới nhất</h2>
            <Link href="/businesses" className="text-xs text-primary hover:underline">Xem tất cả</Link>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : !data?.recentBusinesses?.length ? (
              <div className="px-5 py-8 text-center">
                <Building2 size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Chưa có doanh nghiệp</p>
              </div>
            ) : (
              data.recentBusinesses.map((b) => {
                const sc = STATUS_CFG[b.status] ?? STATUS_CFG.inactive;
                return (
                  <Link key={b.id} href={`/businesses/${b.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase shrink-0">
                      {b.businessCode.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{b.legalName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${sc.cls}`}>{sc.label}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="col-span-4 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Tài khoản mới nhất</h2>
            <Link href="/accounts" className="text-xs text-primary hover:underline">Xem tất cả</Link>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : !data?.recentAccounts?.length ? (
              <div className="px-5 py-8 text-center">
                <Users size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Chưa có tài khoản</p>
              </div>
            ) : (
              data.recentAccounts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600 text-xs font-bold uppercase shrink-0">
                    {(a.fullName ?? a.username).slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{a.fullName ?? a.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.email ?? a.username}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    a.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                    a.status === 'locked' ? 'bg-red-500/10 text-red-600' : 'bg-muted text-muted-foreground'
                  }`}>{a.status === 'active' ? 'Active' : a.status === 'locked' ? 'Khóa' : a.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
