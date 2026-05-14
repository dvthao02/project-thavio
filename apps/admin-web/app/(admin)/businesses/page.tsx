'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertTriangle, Building2, CheckCircle2, Clock3, Eye, KeyRound, Plus, RefreshCw, Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

type TrialFilter = '' | 'trialing' | 'expiring' | 'expired';

interface Business {
  id: string;
  businessCode: string;
  legalName: string;
  brandName: string | null;
  email: string | null;
  status: string;
  subscriptionPlan: string;
  subscriptionStatus?: string;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  trialDaysLeft?: number | null;
  assignedAccount?: { id: string; fullName: string } | null;
  firstStore?: { storeCode: string; storeName: string } | null;
  createdAt: string;
}

interface ListResponse {
  data: Business[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Hoạt động',      cls: 'bg-emerald-500/10 text-emerald-700' },
  pending:  { label: 'Chờ khởi tạo',   cls: 'bg-amber-500/10 text-amber-700' },
  suspended:{ label: 'Tạm khóa',       cls: 'bg-red-500/10 text-red-700' },
  inactive: { label: 'Ngừng hoạt động',cls: 'bg-slate-500/10 text-slate-600' },
  closed:   { label: 'Đã đóng',        cls: 'bg-slate-500/10 text-slate-600' },
};

const PLAN_CLS: Record<string, string> = {
  starter:      'bg-slate-500/10 text-slate-600',
  standard:     'bg-primary/10 text-primary',
  professional: 'bg-cyan-500/10 text-cyan-700',
  enterprise:   'bg-slate-900 text-white',
  pro:          'bg-cyan-500/10 text-cyan-700',
};

function diffDays(to: Date) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}

function enrich(b: Business) {
  let subStatus = b.subscriptionStatus ?? '';
  if (subStatus === 'trial') subStatus = 'trialing';
  if (!subStatus) {
    const created = new Date(b.createdAt);
    created.setDate(created.getDate() + 10);
    subStatus = diffDays(created) >= 0 ? 'trialing' : 'active';
  }
  const trialEndsAt = b.trialEndsAt ?? (subStatus === 'trialing' ? (() => {
    const d = new Date(b.trialStartedAt ?? b.createdAt); d.setDate(d.getDate() + 10); return d.toISOString();
  })() : null);
  const daysLeft = b.trialDaysLeft ?? (trialEndsAt ? diffDays(new Date(trialEndsAt)) : null);
  return { ...b, status: b.status === 'trial' ? 'active' : b.status, subStatus, daysLeft };
}

type Enriched = ReturnType<typeof enrich>;

function trialLabel(b: Enriched) {
  if (b.subStatus !== 'trialing') return null;
  if (b.daysLeft === null) return 'Dùng thử';
  if (b.daysLeft < 0)  return 'Hết hạn';
  if (b.daysLeft === 0) return 'Hết hôm nay';
  return `Còn ${b.daysLeft} ngày`;
}

function trialCls(b: Enriched) {
  if ((b.daysLeft ?? 99) < 0)  return 'bg-red-500/10 text-red-700';
  if ((b.daysLeft ?? 99) <= 2) return 'bg-amber-500/10 text-amber-700';
  return 'bg-sky-500/10 text-sky-700';
}

const TRIAL_TABS: { value: TrialFilter; label: string }[] = [
  { value: '',         label: 'Tất cả' },
  { value: 'trialing', label: 'Còn dùng thử' },
  { value: 'expiring', label: 'Sắp hết hạn' },
  { value: 'expired',  label: 'Hết hạn' },
];

export default function BusinessesPage() {
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [trial, setTrial]       = useState<TrialFilter>('');
  const [page, setPage]         = useState(1);
  const { permissions } = useAuthStore();
  const canCreate = permissions.includes('platform.business.create');

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['businesses', { search, status, page }],
    queryFn: () =>
      api.get('/platform/businesses', {
        params: { search: search || undefined, status: status || undefined, page, limit: 20 },
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const enriched = useMemo(() => (data?.data ?? []).map(enrich), [data?.data]);

  const filtered = useMemo(() => enriched.filter((b) => {
    if (trial === 'trialing') return b.subStatus === 'trialing' && (b.daysLeft ?? -1) > 2;
    if (trial === 'expiring') return b.subStatus === 'trialing' && (b.daysLeft ?? -1) >= 0 && (b.daysLeft ?? 99) <= 2;
    if (trial === 'expired')  return b.subStatus === 'trialing' && (b.daysLeft ?? 1) < 0;
    return true;
  }), [enriched, trial]);

  const stats = useMemo(() => ({
    total:     enriched.length,
    active:    enriched.filter((b) => b.status === 'active').length,
    trialing:  enriched.filter((b) => b.subStatus === 'trialing').length,
    expiring:  enriched.filter((b) => b.subStatus === 'trialing' && (b.daysLeft ?? 99) >= 0 && (b.daysLeft ?? 99) <= 2).length,
    suspended: enriched.filter((b) => b.status === 'suspended').length,
  }), [enriched]);

  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Doanh nghiệp</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {data ? `${total} doanh nghiệp` : 'Quản lý doanh nghiệp trên nền tảng'}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/businesses/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            <Plus size={16} /> Tạo doanh nghiệp
          </Link>
        )}
      </div>

      {/* Stat cards — 4 key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Tổng doanh nghiệp', value: stats.total || total, icon: Building2,   tone: 'bg-primary/10 text-primary',           sub: `${total} bản ghi` },
          { label: 'Đang hoạt động',     value: stats.active,          icon: CheckCircle2, tone: 'bg-emerald-500/10 text-emerald-700',   sub: 'Trạng thái active' },
          { label: 'Đang dùng thử',      value: stats.trialing,         icon: Clock3,       tone: 'bg-sky-500/10 text-sky-700',            sub: `${stats.expiring} sắp hết hạn` },
          { label: 'Tạm khóa',           value: stats.suspended,        icon: AlertTriangle,tone: 'bg-red-500/10 text-red-700',            sub: 'Cần xử lý' },
        ].map(({ label, value, icon: Icon, tone, sub }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-md ${tone}`}>
              <Icon size={16} />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm tên, mã, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="pending">Chờ khởi tạo</option>
          <option value="suspended">Tạm khóa</option>
          <option value="inactive">Ngừng hoạt động</option>
        </select>
        <div className="inline-flex rounded-md border border-border bg-card p-1">
          {TRIAL_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTrial(t.value)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                trial === t.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Doanh nghiệp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Mã</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Gói</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Dùng thử</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Phụ trách</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-muted" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <Building2 size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Không tìm thấy doanh nghiệp</p>
                </td>
              </tr>
            ) : (
              filtered.map((b) => {
                const sc = STATUS_CFG[b.status] ?? STATUS_CFG.inactive;
                const planCls = PLAN_CLS[b.subscriptionPlan?.toLowerCase()] ?? PLAN_CLS.standard;
                const tLabel = trialLabel(b);

                return (
                  <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold uppercase text-primary">
                          {b.businessCode.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground max-w-[200px]">{b.legalName}</p>
                          <p className="truncate text-xs text-muted-foreground max-w-[200px]">
                            {b.brandName && b.brandName !== b.legalName ? b.brandName : b.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{b.businessCode}</code>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${planCls}`}>
                        {b.subscriptionPlan}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sc.cls}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {tLabel ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${trialCls(b)}`}>
                          {tLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Trả phí</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {b.assignedAccount ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                            {b.assignedAccount.fullName.split(' ').slice(-2).map((p) => p[0]).join('')}
                          </div>
                          <span className="text-xs text-foreground truncate max-w-[120px]">{b.assignedAccount.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Chưa phân công</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/businesses/${b.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Eye size={13} /> Xem
                        </Link>
                        {b.subStatus === 'trialing' && (
                          <button className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
                            <RefreshCw size={13} /> Gia hạn
                          </button>
                        )}
                        {b.status === 'active' && (
                          <button className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary hover:underline">
                            <KeyRound size={13} /> Hỗ trợ
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
    </div>
  );
}
