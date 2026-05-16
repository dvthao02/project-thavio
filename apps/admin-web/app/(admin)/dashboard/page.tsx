'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle,
  FlaskConical,
  Info,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
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

type Period = '7d' | '30d' | 'thisMonth' | '3m' | '6m' | '1y';

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

interface AlertItem {
  id: string;
  name: string;
  detail: string;
}

interface PlatformAlert {
  type: string;
  severity: 'critical' | 'warning' | 'info';
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

// ──────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: 'thisMonth', label: 'Tháng này' },
  { key: '3m', label: '3 tháng' },
  { key: '6m', label: '6 tháng' },
  { key: '1y', label: '1 năm' },
];

// business.status — access dimension only (no trial here)
const ACCESS_CFG: Record<string, { label: string; color: string; dot: string; cls: string }> = {
  active:   { label: 'Hoạt động',       color: '#10b981', dot: 'bg-emerald-500', cls: 'bg-emerald-500/10 text-emerald-600' },
  pending:  { label: 'Chờ xác thực',    color: '#f59e0b', dot: 'bg-amber-500',   cls: 'bg-amber-500/10 text-amber-600' },
  suspended:{ label: 'Tạm khóa',        color: '#ef4444', dot: 'bg-red-500',     cls: 'bg-red-500/10 text-red-600' },
  inactive: { label: 'Ngừng HĐ',        color: '#94a3b8', dot: 'bg-slate-400',   cls: 'bg-muted text-muted-foreground' },
};

// subscription lifecycle — billing dimension
const SUB_CFG: Record<string, { label: string; color: string; dot: string }> = {
  trialing: { label: 'Đang dùng thử',   color: '#0ea5e9', dot: 'bg-sky-500' },
  paid:     { label: 'Đã kích hoạt',    color: '#10b981', dot: 'bg-emerald-500' },
};

const PLAN_COLOR: Record<string, string> = {
  starter:      '#64748b',
  standard:     '#1A7AE8',
  professional: '#0891b2',
  enterprise:   '#0f172a',
  pro:          '#0891b2',
};

const PERIOD_DAYS: Record<Period, number> = {
  '7d': 7, '30d': 30, 'thisMonth': 31, '3m': 90, '6m': 180, '1y': 365,
};

const ALERT_SEVERITY: Record<string, { icon: typeof AlertTriangle; border: string; bg: string; text: string; badge: string }> = {
  critical: { icon: XCircle,       border: 'border-red-200',    bg: 'bg-red-50',    text: 'text-red-700',    badge: 'bg-red-500/10 text-red-700' },
  warning:  { icon: AlertTriangle, border: 'border-amber-200',  bg: 'bg-amber-50',  text: 'text-amber-700',  badge: 'bg-amber-500/10 text-amber-700' },
  info:     { icon: Info,          border: 'border-blue-200',   bg: 'bg-blue-50',   text: 'text-blue-700',   badge: 'bg-blue-500/10 text-blue-700' },
};

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function norm(s: string) { return (s ?? 'starter').toLowerCase(); }

function formatDayMonth(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildDailySeries(raw: { label: string; total: number }[], days: number) {
  const dateMap = new Map(raw.map((p) => [p.label, p.total]));
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1 - i));
    const label = formatDayMonth(d);
    return { date: d, label, value: dateMap.get(label) ?? 0 };
  });
}

function buildAreaData(raw: { label: string; total: number }[], period: Period) {
  if (period === '1y') {
    const monthMap = new Map(raw.map((r) => [r.label, r.total]));
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      return { label, 'Doanh nghiệp': monthMap.get(label) ?? 0 };
    });
  }
  const daily = buildDailySeries(raw, PERIOD_DAYS[period]);
  if (period === '7d' || period === '30d') {
    return daily.map((d) => ({ label: d.label, 'Doanh nghiệp': d.value }));
  }
  if (period === 'thisMonth') {
    const days = new Date().getDate();
    return buildDailySeries(raw, days).map((d) => ({ label: d.label, 'Doanh nghiệp': d.value }));
  }
  if (period === '3m' || period === '6m') {
    const grouped: { label: string; 'Doanh nghiệp': number }[] = [];
    for (let i = 0; i < daily.length; i += 7) {
      const slice = daily.slice(i, i + 7);
      grouped.push({ label: `${slice[0].label} - ${slice[slice.length - 1].label}`, 'Doanh nghiệp': slice.reduce((s, d) => s + d.value, 0) });
    }
    return grouped;
  }
  return daily.map((d) => ({ label: d.label, 'Doanh nghiệp': d.value }));
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────

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
  label, value, sub, icon: Icon, iconCls, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconCls: string; trend?: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${iconCls}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-bold leading-none text-foreground">{value}</p>
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        <div className="mt-1">
          {trend !== undefined && trend > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-emerald-600 font-medium">
              <TrendingUp size={10} /> +{trend} trong kỳ
            </span>
          )}
          {trend === 0 && <span className="text-[11px] text-muted-foreground">Không đổi trong kỳ</span>}
          {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

function MiniDonut({
  title,
  subtitle,
  data,
  legend,
  total,
  centerLabel,
}: {
  title: string;
  subtitle: string;
  data: { name: string; value: number; fill: string }[];
  legend: { key: string; label: string; dot: string; value: number }[];
  total: number;
  centerLabel?: string;
}) {
  const filled = data.filter((d) => d.value > 0);
  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">{subtitle}</p>
      {total === 0 ? (
        <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">Chưa có dữ liệu</div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <ResponsiveContainer width={90} height={90}>
              <PieChart>
                <Pie data={filled.length ? filled : [{ name: '', value: 1, fill: 'hsl(var(--muted))' }]}
                  cx="50%" cy="50%" innerRadius={26} outerRadius={40}
                  dataKey="value" paddingAngle={filled.length > 1 ? 3 : 0} startAngle={90} endAngle={-270}>
                  {(filled.length ? filled : [{ fill: 'hsl(var(--muted))' }]).map((d, i) => (
                    <Cell key={i} fill={d.fill} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-bold text-foreground leading-none">{total}</span>
              <span className="text-[9px] text-muted-foreground">{centerLabel ?? 'tổng'}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            {legend.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${item.dot}`} />
                <span className="text-[11px] text-muted-foreground flex-1 truncate">{item.label}</span>
                <span className="text-[11px] font-semibold text-foreground">{item.value}</span>
                <span className="text-[11px] text-muted-foreground w-7 text-right">
                  {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertStrip({ alerts }: { alerts: PlatformAlert[] }) {
  const visible = alerts.filter((a) => a.count > 0 && (a.severity === 'critical' || a.severity === 'warning'));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {visible.map((alert) => {
        const cfg = ALERT_SEVERITY[alert.severity];
        const Icon = cfg.icon;
        return (
          <div key={alert.type} className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 ${cfg.border} ${cfg.bg} flex-1 min-w-[240px]`}>
            <Icon size={15} className={`shrink-0 mt-0.5 ${cfg.text}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-xs font-semibold ${cfg.text}`}>{alert.title}</p>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${cfg.badge}`}>{alert.count}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{alert.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [assigneeId, setAssigneeId] = useState('');

  const { data: assigneeAccounts } = useQuery<Array<{ id: string; username: string; fullName: string | null; email: string | null; assignedBusinesses: number }>>({
    queryKey: ['dashboard-assignee-options'],
    queryFn: () => api.get('/platform/dashboard/assignees').then((r) => r.data.data),
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!assigneeId) return;
    const exists = (assigneeAccounts ?? []).some((a) => a.id === assigneeId);
    if (!exists) setAssigneeId('');
  }, [assigneeAccounts, assigneeId]);

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', period, assigneeId],
    queryFn: () =>
      api.get('/platform/dashboard/stats', { params: { period, assignedAccountId: assigneeId || undefined } })
        .then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: alertsData } = useQuery<AlertsResponse>({
    queryKey: ['platform-alerts'],
    queryFn: () => api.get('/platform/alerts').then((r) => r.data),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const biz = data?.businesses;
  const total = biz?.total ?? 0;

  // Donut 1: business.status — access dimension only (no trial overlap)
  const accessDonutData = [
    { name: 'Hoạt động',    value: biz?.active    ?? 0, fill: '#10b981' },
    { name: 'Chờ xác thực', value: biz?.pending   ?? 0, fill: '#f59e0b' },
    { name: 'Tạm khóa',     value: biz?.suspended ?? 0, fill: '#ef4444' },
    { name: 'Ngừng HĐ',     value: biz?.inactive  ?? 0, fill: '#94a3b8' },
  ].filter((d) => d.value > 0);

  const accessLegend = [
    { key: 'active',    label: 'Hoạt động',    dot: 'bg-emerald-500', value: biz?.active    ?? 0 },
    { key: 'pending',   label: 'Chờ xác thực', dot: 'bg-amber-500',   value: biz?.pending   ?? 0 },
    { key: 'suspended', label: 'Tạm khóa',     dot: 'bg-red-500',     value: biz?.suspended ?? 0 },
    { key: 'inactive',  label: 'Ngừng HĐ',     dot: 'bg-slate-400',   value: biz?.inactive  ?? 0 },
  ];

  // Donut 2: subscription lifecycle — billing dimension
  const trialing = biz?.trial ?? 0;
  const paidActive = Math.max(0, (biz?.active ?? 0) - trialing);
  const subDonutData = [
    { name: 'Dùng thử',     value: trialing,   fill: '#0ea5e9' },
    { name: 'Đã kích hoạt', value: paidActive, fill: '#10b981' },
  ].filter((d) => d.value > 0);

  const subLegend = [
    { key: 'trialing', label: 'Dùng thử',     dot: 'bg-sky-500',     value: trialing },
    { key: 'paid',     label: 'Đã kích hoạt', dot: 'bg-emerald-500', value: paidActive },
  ];

  const ALL_PLANS = ['starter', 'standard', 'professional', 'enterprise'];
  const planMap = new Map((biz?.byPlan ?? []).map((p) => [p.plan.toLowerCase(), p.total]));
  const planData = ALL_PLANS.map((plan) => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    total: planMap.get(plan) ?? 0,
    fill: PLAN_COLOR[plan] ?? '#94a3b8',
  }));

  const areaData = buildAreaData(biz?.byPeriod ?? [], period);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">Tổng quan nền tảng</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Thống kê và hoạt động Thavio Platform</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="h-10 w-[160px] rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {PERIODS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <div className="relative">
            <UserCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="h-10 w-[230px] rounded-md border border-input bg-background pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Tất cả phụ trách</option>
              {(assigneeAccounts ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {`${a.fullName || a.username || a.email || a.id} (${a.assignedBusinesses})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alert strip — chỉ hiện khi có cảnh báo critical / warning */}
      {alertsData && (alertsData.totalCritical > 0 || alertsData.totalWarning > 0) && (
        <AlertStrip alerts={alertsData.alerts} />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)
        ) : (
          <>
            <StatCard label="Tổng doanh nghiệp" value={total} icon={Building2} iconCls="bg-primary/10 text-primary" trend={biz?.newInPeriod} />
            <StatCard label="Hoạt động" value={biz?.active ?? 0} icon={CheckCircle} iconCls="bg-emerald-500/10 text-emerald-600"
              sub={total > 0 ? `${Math.round(((biz?.active ?? 0) / total) * 100)}%` : undefined} />
            <StatCard label="Dùng thử" value={trialing} icon={FlaskConical} iconCls="bg-sky-500/10 text-sky-600"
              sub={total > 0 ? `${Math.round((trialing / total) * 100)}% tổng DN` : undefined} />
            <StatCard label="Chờ xác thực" value={biz?.pending ?? 0} icon={Activity} iconCls="bg-amber-500/10 text-amber-600"
              sub={(biz?.pending ?? 0) > 0 ? 'Cần xác minh OTP' : 'Không có'} />
            <StatCard
              label="Ngừng / Khóa"
              value={`${biz?.inactive ?? 0} / ${biz?.suspended ?? 0}`}
              icon={Building2} iconCls="bg-slate-500/10 text-slate-500"
            />
            <StatCard label="Tài khoản" value={data?.accounts?.total ?? 0} icon={Users} iconCls="bg-violet-500/10 text-violet-600"
              trend={data?.accounts?.newInPeriod} />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-12 gap-4">
        {/* Area chart */}
        <div className="col-span-12 lg:col-span-8 flex flex-col rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tăng trưởng doanh nghiệp</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Số doanh nghiệp tạo mới trong kỳ</p>
            </div>
            <Activity size={15} className="text-muted-foreground" />
          </div>
          {isLoading ? <Skeleton className="flex-1 min-h-[180px]" /> : areaData.length === 0 ? (
            <div className="flex flex-1 min-h-[180px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <TrendingUp size={28} className="opacity-20" />
              <p className="text-sm">Chưa có doanh nghiệp nào trong kỳ này</p>
            </div>
          ) : (
            <div className="relative flex-1 min-h-[180px]">
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))"
                      interval={Math.max(0, Math.ceil(areaData.length / 7) - 1)} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" allowDecimals={false} domain={[0, 'auto']} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="Doanh nghiệp" stroke="#1A7AE8" strokeWidth={2} fill="#1A7AE820"
                      dot={{ r: 4, fill: '#1A7AE8', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Two stacked donuts */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          {isLoading ? (
            <>
              <Skeleton className="h-[140px] rounded-lg" />
              <Skeleton className="h-[140px] rounded-lg" />
            </>
          ) : (
            <>
              <MiniDonut
                title="Trạng thái vận hành"
                subtitle="Quyền truy cập doanh nghiệp"
                data={accessDonutData}
                legend={accessLegend}
                total={total}
              />
              <MiniDonut
                title="Sức khỏe thuê bao"
                subtitle="Trạng thái gói dịch vụ"
                data={subDonutData}
                legend={subLegend}
                total={biz?.active ?? 0}
                centerLabel="active"
              />
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-12 gap-4">
        {/* Plan distribution bar chart */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex min-h-[248px] flex-col rounded-lg border border-border bg-card p-4">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-foreground">Phân bổ gói dịch vụ</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Số doanh nghiệp theo gói đăng ký</p>
          </div>
          {isLoading ? <Skeleton className="h-44 flex-1" /> : (
            <div className="mt-auto h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" allowDecimals={false} domain={[0, 'auto']} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="total" name="Doanh nghiệp" radius={[4, 4, 0, 0]}>
                    {planData.map((p, i) => <Cell key={i} fill={p.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent businesses */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Doanh nghiệp mới nhất</h2>
            <Link href="/businesses" className="text-xs text-primary hover:underline">Xem tất cả</Link>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : !data?.recentBusinesses?.length ? (
              <div className="px-5 py-8 text-center">
                <Building2 size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Chưa có doanh nghiệp</p>
              </div>
            ) : (
              data.recentBusinesses.map((b) => {
                const ac = ACCESS_CFG[b.status] ?? ACCESS_CFG.inactive;
                return (
                  <Link key={b.id} href={`/businesses/${b.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase shrink-0">
                      {b.businessCode.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{b.legalName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ac.cls}`}>{ac.label}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent accounts */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Tài khoản mới nhất</h2>
            <Link href="/accounts" className="text-xs text-primary hover:underline">Xem tất cả</Link>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
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
                  }`}>
                    {a.status === 'active' ? 'Hoạt động' : a.status === 'locked' ? 'Khóa' : a.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
