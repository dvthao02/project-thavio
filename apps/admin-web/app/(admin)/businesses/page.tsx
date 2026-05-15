'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Store,
  UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

type AccessStatus = 'active' | 'pending' | 'suspended' | 'inactive' | string;
type TrialFilter = '' | 'trialing' | 'expiring' | 'expired';

interface Business {
  id: string;
  businessCode: string;
  legalName: string;
  brandName: string | null;
  email: string | null;
  status: AccessStatus;
  subscriptionPlan: string;
  subscriptionStatus?: string;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  trialDaysLeft?: number | null;
  assignedAccount?: { id: string; fullName: string; email?: string | null } | null;
  firstStore?: { storeCode: string; storeName: string } | null;
  createdAt: string;
}

interface ListResponse {
  data: Business[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface AccountOption {
  id: string;
  username: string;
  fullName: string | null;
  email: string | null;
}

interface AccountsResponse {
  data: AccountOption[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const PAGE_SIZE = 20;
const TRIAL_DAYS = 10;

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active: { label: 'Hoạt động', cls: 'bg-emerald-500/10 text-emerald-700' },
  pending: { label: 'Chờ khởi tạo', cls: 'bg-amber-500/10 text-amber-700' },
  suspended: { label: 'Tạm khóa', cls: 'bg-red-500/10 text-red-700' },
  inactive: { label: 'Ngừng hoạt động', cls: 'bg-slate-500/10 text-slate-600' },
};

const SUBSCRIPTION_CONFIG: Record<string, { label: string; cls: string }> = {
  trialing: { label: 'Đang dùng thử', cls: 'bg-blue-500/10 text-blue-700' },
  trial_expired: { label: 'Hết dùng thử', cls: 'bg-red-500/10 text-red-700' },
  active: { label: 'Đang trả phí', cls: 'bg-emerald-500/10 text-emerald-700' },
  past_due: { label: 'Quá hạn thanh toán', cls: 'bg-orange-500/10 text-orange-700' },
  suspended: { label: 'Tạm khóa gói', cls: 'bg-red-500/10 text-red-700' },
  cancelled: { label: 'Đã hủy', cls: 'bg-slate-500/10 text-slate-600' },
  pending: { label: 'Chờ xử lý', cls: 'bg-amber-500/10 text-amber-700' },
};

const PLAN_CONFIG: Record<string, { label: string; cls: string }> = {
  starter: { label: 'Starter', cls: 'bg-slate-500/10 text-slate-600' },
  standard: { label: 'Tiêu chuẩn', cls: 'bg-primary/10 text-primary' },
  professional: { label: 'Professional', cls: 'bg-cyan-500/10 text-cyan-700' },
  enterprise: { label: 'Enterprise', cls: 'bg-slate-900 text-white' },
  pro: { label: 'Pro', cls: 'bg-cyan-500/10 text-cyan-700' },
};

const TRIAL_TABS: { value: TrialFilter; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'trialing', label: 'Còn dùng thử' },
  { value: 'expiring', label: 'Sắp hết hạn' },
  { value: 'expired', label: 'Hết hạn' },
];

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function diffDays(to: Date) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}

function normalizeBusiness(row: Business) {
  let subscriptionStatus = row.subscriptionStatus || '';
  if (subscriptionStatus === 'trial') subscriptionStatus = 'trialing';

  if (!subscriptionStatus) {
    const trialEnd = new Date(row.createdAt);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    subscriptionStatus = diffDays(trialEnd) >= 0 ? 'trialing' : 'active';
  }

  const trialEndsAt =
    row.trialEndsAt ??
    (subscriptionStatus === 'trialing' || subscriptionStatus === 'trial_expired'
      ? (() => {
          const date = new Date(row.trialStartedAt ?? row.createdAt);
          date.setDate(date.getDate() + TRIAL_DAYS);
          return date.toISOString();
        })()
      : null);

  const trialDaysLeft =
    row.trialDaysLeft ??
    (subscriptionStatus === 'trialing' && trialEndsAt ? Math.max(0, diffDays(new Date(trialEndsAt))) : null);

  return {
    ...row,
    accessStatus: row.status === 'trial' ? 'active' : row.status,
    subscriptionStatus,
    trialEndsAt,
    trialDaysLeft,
  };
}

type BusinessRow = ReturnType<typeof normalizeBusiness>;

function getTrialLabel(row: BusinessRow) {
  if (row.subscriptionStatus === 'trial_expired') return 'Đã hết hạn';
  if (row.subscriptionStatus !== 'trialing') return 'Không áp dụng';
  if (row.trialDaysLeft === null) return 'Đang dùng thử';
  if (row.trialDaysLeft === 0) return 'Hết hôm nay';
  return `Còn ${row.trialDaysLeft} ngày`;
}

function getTrialClass(row: BusinessRow) {
  if (row.subscriptionStatus === 'trial_expired') return 'bg-red-500/10 text-red-700';
  if (row.subscriptionStatus !== 'trialing') return 'bg-muted text-muted-foreground';
  if ((row.trialDaysLeft ?? TRIAL_DAYS) <= 2) return 'bg-orange-500/10 text-orange-700';
  return 'bg-blue-500/10 text-blue-700';
}

function matchTrialFilter(row: BusinessRow, trial: TrialFilter) {
  if (!trial) return true;
  if (trial === 'trialing') return row.subscriptionStatus === 'trialing' && (row.trialDaysLeft ?? -1) > 2;
  if (trial === 'expiring') {
    return row.subscriptionStatus === 'trialing' && (row.trialDaysLeft ?? -1) >= 0 && (row.trialDaysLeft ?? 99) <= 2;
  }
  return row.subscriptionStatus === 'trial_expired';
}

function CompactStat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
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
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

export default function BusinessesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [trial, setTrial] = useState<TrialFilter>('');
  const [assigneeId, setAssigneeId] = useState('');
  const [page, setPage] = useState(1);
  const { permissions } = useAuthStore();
  const canCreate = permissions.includes('platform.business.create');

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useQuery<ListResponse>({
    queryKey: ['businesses', { search, status, assigneeId, page }],
    queryFn: () =>
      api
        .get('/platform/businesses', {
          params: {
            search: search || undefined,
            status: status || undefined,
            assigneeId: assigneeId || undefined,
            page,
            limit: PAGE_SIZE,
          },
        })
        .then((res) => res.data),
    placeholderData: (previous) => previous,
  });

  const { data: accountsData } = useQuery<AccountsResponse>({
    queryKey: ['business-assignee-options'],
    queryFn: () =>
      api
        .get('/platform/accounts', {
          params: { page: 1, limit: 100 },
        })
        .then((res) => res.data),
    placeholderData: (previous) => previous,
  });

  const rows = useMemo(() => (data?.data ?? []).map(normalizeBusiness), [data?.data]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, { id: string; fullName: string }>();
    (accountsData?.data ?? []).forEach((account) => {
      map.set(account.id, {
        id: account.id,
        fullName: account.fullName || account.username || account.email || 'Chưa đặt tên',
      });
    });
    rows.forEach((row) => {
      if (row.assignedAccount) {
        map.set(row.assignedAccount.id, {
          id: row.assignedAccount.id,
          fullName: row.assignedAccount.fullName || row.assignedAccount.email || 'Chưa đặt tên',
        });
      }
    });
    return Array.from(map.values());
  }, [accountsData?.data, rows]);

  const filteredRows = useMemo(
    () => rows.filter((row) => matchTrialFilter(row, trial)),
    [rows, trial],
  );

  const stats = useMemo(
    () => ({
      total: data?.meta.total ?? rows.length,
      active: rows.filter((row) => row.accessStatus === 'active').length,
      trialing: rows.filter((row) => row.subscriptionStatus === 'trialing').length,
      expiring: rows.filter(
        (row) => row.subscriptionStatus === 'trialing' && (row.trialDaysLeft ?? 99) >= 0 && (row.trialDaysLeft ?? 99) <= 2,
      ).length,
      suspended: rows.filter((row) => row.accessStatus === 'suspended').length,
    }),
    [data?.meta.total, rows],
  );

  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">Doanh nghiệp</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Quản lý truy cập, gói dịch vụ, dùng thử và nhân viên phụ trách.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
              Làm mới
            </button>
            {canCreate ? (
              <Link
                href="/businesses/new"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                <Plus size={16} />
                Tạo doanh nghiệp
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_150px_170px_130px]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm tên, mã doanh nghiệp, email..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="pending">Chờ khởi tạo</option>
            <option value="suspended">Tạm khóa</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>

          <select
            value={assigneeId}
            onChange={(event) => {
              setAssigneeId(event.target.value);
              setPage(1);
            }}
            className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Phụ trách</option>
            {assigneeOptions.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.fullName}
              </option>
            ))}
          </select>

          <select
            value={trial}
            onChange={(event) => {
              setTrial(event.target.value as TrialFilter);
              setPage(1);
            }}
            className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {TRIAL_TABS.map((tab) => (
              <option key={tab.value} value={tab.value}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <CompactStat
          label="Tổng"
          value={stats.total}
          sub={`${filteredRows.length} đang hiển thị`}
          icon={Building2}
          tone="bg-primary/10 text-primary"
        />
        <CompactStat
          label="Hoạt động"
          value={stats.active}
          sub="Có thể đăng nhập"
          icon={CheckCircle2}
          tone="bg-emerald-500/10 text-emerald-700"
        />
        <CompactStat
          label="Dùng thử"
          value={stats.trialing}
          sub={`${stats.expiring} sắp hết hạn`}
          icon={Clock3}
          tone="bg-blue-500/10 text-blue-700"
        />
        <CompactStat
          label="Tạm khóa"
          value={stats.suspended}
          sub="Cần kiểm tra"
          icon={AlertTriangle}
          tone="bg-red-500/10 text-red-700"
        />
      </div>

      {/* Mobile card list */}
      <div className="block xl:hidden overflow-hidden rounded-lg border border-border bg-card divide-y divide-border">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          ))
        ) : filteredRows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Building2 size={32} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Không tìm thấy doanh nghiệp phù hợp</p>
            <p className="mt-1 text-xs text-muted-foreground">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          filteredRows.map((business) => {
            const statusConfig = STATUS_CONFIG[business.accessStatus] ?? STATUS_CONFIG.inactive;
            const subscriptionConfig = SUBSCRIPTION_CONFIG[business.subscriptionStatus] ?? SUBSCRIPTION_CONFIG.cancelled;
            const planKey = business.subscriptionPlan?.toLowerCase() ?? 'standard';
            const planConfig = PLAN_CONFIG[planKey] ?? { label: business.subscriptionPlan, cls: PLAN_CONFIG.standard.cls };
            const trialAwareSubscription =
              business.subscriptionStatus === 'trialing' || business.subscriptionStatus === 'trial_expired'
                ? `${subscriptionConfig.label} · ${getTrialLabel(business)}`
                : subscriptionConfig.label;
            const subscriptionTone =
              business.subscriptionStatus === 'trialing' || business.subscriptionStatus === 'trial_expired'
                ? getTrialClass(business)
                : subscriptionConfig.cls;
            return (
              <Link
                key={business.id}
                href={`/businesses/${business.id}`}
                className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/20"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold uppercase text-primary">
                  {business.businessCode.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-medium text-foreground text-sm">{business.legalName}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${planConfig.cls}`}>
                      {planConfig.label}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {business.businessCode}
                    </code>
                    {business.firstStore && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Store size={11} />
                        {business.firstStore.storeName}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.cls}`}>
                      {statusConfig.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${subscriptionTone}`}>
                      {trialAwareSubscription}
                    </span>
                  </div>
                  {business.assignedAccount && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <UserCheck size={11} />
                      {business.assignedAccount.fullName}
                    </p>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden xl:block overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-[27%] px-5 py-3 text-left text-xs font-medium text-muted-foreground">Doanh nghiệp</th>
              <th className="w-[18%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cửa hàng đầu tiên</th>
              <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Gói</th>
              <th className="w-[17%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Trạng thái</th>
              <th className="w-[15%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Phụ trách</th>
              <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Ngày tạo</th>
              <th className="w-[5%] px-4 py-3 text-right text-xs font-medium text-muted-foreground">Xem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: 7 }).map((__, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <Building2 size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">Không tìm thấy doanh nghiệp phù hợp</p>
                  <p className="mt-1 text-xs text-muted-foreground">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                </td>
              </tr>
            ) : (
              filteredRows.map((business) => {
                const statusConfig = STATUS_CONFIG[business.accessStatus] ?? STATUS_CONFIG.inactive;
                const subscriptionConfig =
                  SUBSCRIPTION_CONFIG[business.subscriptionStatus] ?? SUBSCRIPTION_CONFIG.cancelled;
                const planKey = business.subscriptionPlan?.toLowerCase() ?? 'standard';
                const planConfig = PLAN_CONFIG[planKey] ?? { label: business.subscriptionPlan, cls: PLAN_CONFIG.standard.cls };
                const trialAwareSubscription =
                  business.subscriptionStatus === 'trialing' || business.subscriptionStatus === 'trial_expired'
                    ? `${subscriptionConfig.label} · ${getTrialLabel(business)}`
                    : subscriptionConfig.label;
                const subscriptionTone =
                  business.subscriptionStatus === 'trialing' || business.subscriptionStatus === 'trial_expired'
                    ? getTrialClass(business)
                    : subscriptionConfig.cls;

                return (
                  <tr key={business.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-5 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold uppercase text-primary">
                          {business.businessCode.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{business.legalName}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {business.businessCode}
                            </code>
                            <span className="truncate text-xs text-muted-foreground">
                              {business.brandName || business.email || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      {business.firstStore ? (
                        <div className="flex items-center gap-2">
                          <Store size={14} className="text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">
                              {business.firstStore.storeName}
                            </p>
                            <code className="text-xs text-muted-foreground">{business.firstStore.storeCode}</code>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Chưa có</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${planConfig.cls}`}>
                        {planConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.cls}`}>
                          {statusConfig.label}
                        </span>
                        <span className={`max-w-full truncate whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${subscriptionTone}`}>
                          {trialAwareSubscription}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      {business.assignedAccount ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                            {business.assignedAccount.fullName.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">
                              {business.assignedAccount.fullName}
                            </p>
                            {business.assignedAccount.email ? (
                              <p className="truncate text-[11px] text-muted-foreground">
                                {business.assignedAccount.email}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs italic text-muted-foreground">
                          <UserCheck size={13} />
                          Chưa phân công
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-middle text-xs text-muted-foreground">
                      {formatDate(business.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right align-middle">
                      <Link
                        href={`/businesses/${business.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="Xem chi tiết"
                      >
                        <Eye size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Hiển thị {rangeStart}-{rangeEnd} / {total} doanh nghiệp
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
              className="rounded-md border border-input px-3 py-1.5 text-xs transition hover:bg-muted disabled:opacity-40"
            >
              Trước
            </button>
            <span className="text-xs text-muted-foreground">
              Trang {page} / {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => value + 1)}
              disabled={page >= totalPages}
              className="rounded-md border border-input px-3 py-1.5 text-xs transition hover:bg-muted disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
