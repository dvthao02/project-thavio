'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Filter,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';

type AccessStatus = 'active' | 'pending' | 'suspended' | 'inactive';
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
type TrialFilter = '' | 'active' | 'expiring' | 'expired';

interface Business {
  id: string;
  businessCode: string;
  schemaName?: string;
  legalName: string;
  brandName: string | null;
  email: string | null;
  phone: string | null;
  status: AccessStatus | string;
  subscriptionPlan: string;
  subscriptionStatus?: SubscriptionStatus | 'trial' | string;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  trialDaysLeft?: number | null;
  subscriptionExpiresAt?: string | null;
  assignedAccount?: { id: string; fullName: string; email?: string | null } | null;
  firstStore?: { storeCode: string; storeName: string } | null;
  createdAt: string;
}

interface ListResponse {
  data: Business[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}


const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active: { label: 'Đang hoạt động', cls: 'bg-emerald-500/10 text-emerald-700' },
  pending: { label: 'Chờ khởi tạo', cls: 'bg-amber-500/10 text-amber-700' },
  suspended: { label: 'Tạm khóa', cls: 'bg-red-500/10 text-red-700' },
  inactive: { label: 'Ngừng hoạt động', cls: 'bg-slate-500/10 text-slate-600' },
  trial: { label: 'Dùng thử cũ', cls: 'bg-sky-500/10 text-sky-700' },
  closed: { label: 'Đã đóng', cls: 'bg-slate-500/10 text-slate-600' },
};

const SUBSCRIPTION_CONFIG: Record<string, { label: string; cls: string }> = {
  trialing: { label: 'Đang dùng thử', cls: 'bg-sky-500/10 text-sky-700' },
  trial: { label: 'Đang dùng thử', cls: 'bg-sky-500/10 text-sky-700' },
  active: { label: 'Đang trả phí', cls: 'bg-emerald-500/10 text-emerald-700' },
  past_due: { label: 'Quá hạn thanh toán', cls: 'bg-orange-500/10 text-orange-700' },
  suspended: { label: 'Tạm khóa', cls: 'bg-red-500/10 text-red-700' },
  cancelled: { label: 'Đã hủy', cls: 'bg-slate-500/10 text-slate-600' },
  pending: { label: 'Chờ xử lý', cls: 'bg-amber-500/10 text-amber-700' },
  inactive: { label: 'Ngừng hoạt động', cls: 'bg-slate-500/10 text-slate-600' },
};

const PLAN_CLS: Record<string, string> = {
  starter: 'bg-slate-500/10 text-slate-600',
  standard: 'bg-primary/10 text-primary',
  professional: 'bg-cyan-500/10 text-cyan-700',
  enterprise: 'bg-slate-900 text-white',
  pro: 'bg-cyan-500/10 text-cyan-700',
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffDays(to: Date) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}

function normalizeSubscriptionStatus(b: Business): SubscriptionStatus {
  if (b.subscriptionStatus === 'trial') return 'trialing';
  if (
    b.subscriptionStatus === 'trialing' ||
    b.subscriptionStatus === 'active' ||
    b.subscriptionStatus === 'past_due' ||
    b.subscriptionStatus === 'suspended' ||
    b.subscriptionStatus === 'cancelled'
  ) {
    return b.subscriptionStatus;
  }

  if (b.status === 'suspended') return 'suspended';
  if (b.status === 'inactive') return 'cancelled';

  const createdAt = new Date(b.createdAt);
  return diffDays(addDays(createdAt, 10)) >= 0 ? 'trialing' : 'active';
}

function enrichBusiness(b: Business) {
  const subscriptionStatus = normalizeSubscriptionStatus(b);
  const trialEndsAt =
    b.trialEndsAt ?? (subscriptionStatus === 'trialing' ? addDays(new Date(b.trialStartedAt ?? b.createdAt), 10).toISOString() : null);
  const trialDaysLeft = b.trialDaysLeft ?? (trialEndsAt ? diffDays(new Date(trialEndsAt)) : null);
  const assignedAccount = b.assignedAccount ?? null;
  const firstStore = b.firstStore ?? null;

  return {
    ...b,
    status: b.status === 'trial' ? 'active' : b.status,
    subscriptionStatus,
    trialEndsAt,
    trialDaysLeft,
    assignedAccount,
    firstStore,
  };
}

function trialLabel(b: ReturnType<typeof enrichBusiness>) {
  if (b.subscriptionStatus !== 'trialing') return 'Đã trả phí';
  if (b.trialDaysLeft === null) return 'Trial';
  if (b.trialDaysLeft < 0) return 'Hết trial';
  if (b.trialDaysLeft === 0) return 'Hết hôm nay';
  return `Còn ${b.trialDaysLeft} ngày`;
}

function trialTone(b: ReturnType<typeof enrichBusiness>) {
  if (b.subscriptionStatus !== 'trialing') return 'bg-emerald-500/10 text-emerald-700';
  if ((b.trialDaysLeft ?? 99) < 0) return 'bg-red-500/10 text-red-700';
  if ((b.trialDaysLeft ?? 99) <= 2) return 'bg-amber-500/10 text-amber-700';
  return 'bg-sky-500/10 text-sky-700';
}

function matchesTrialFilter(b: ReturnType<typeof enrichBusiness>, filter: TrialFilter) {
  if (!filter) return true;
  if (filter === 'active') return b.subscriptionStatus === 'trialing' && (b.trialDaysLeft ?? -1) > 2;
  if (filter === 'expiring') return b.subscriptionStatus === 'trialing' && (b.trialDaysLeft ?? -1) >= 0 && (b.trialDaysLeft ?? 99) <= 2;
  return b.subscriptionStatus === 'trialing' && (b.trialDaysLeft ?? 1) < 0;
}

function StatCard({
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
    <div className="bg-card border border-border rounded-lg p-4">
      <div className={`w-9 h-9 rounded-md flex items-center justify-center mb-4 ${tone}`}>
        <Icon size={17} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
      <p className="text-xs text-muted-foreground mt-2">{sub}</p>
    </div>
  );
}

export default function BusinessesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [trial, setTrial] = useState<TrialFilter>('');
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

  const enriched = useMemo(() => (data?.data ?? []).map(enrichBusiness), [data?.data]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, { id: string; fullName: string }>();
    for (const b of enriched) {
      if (b.assignedAccount) map.set(b.assignedAccount.id, b.assignedAccount);
    }
    return Array.from(map.values());
  }, [enriched]);

  const filtered = useMemo(
    () =>
      enriched.filter((b) => {
        if (subscriptionStatus && b.subscriptionStatus !== subscriptionStatus) return false;
        if (assigneeId && b.assignedAccount?.id !== assigneeId) return false;
        return matchesTrialFilter(b, trial);
      }),
    [assigneeId, enriched, subscriptionStatus, trial],
  );

  const stats = useMemo(() => {
    const total = enriched.length;
    const active = enriched.filter((b) => b.status === 'active').length;
    const trialing = enriched.filter((b) => b.subscriptionStatus === 'trialing').length;
    const expiring = enriched.filter((b) => b.subscriptionStatus === 'trialing' && (b.trialDaysLeft ?? 99) >= 0 && (b.trialDaysLeft ?? 99) <= 2).length;
    const paid = enriched.filter((b) => b.subscriptionStatus === 'active').length;
    const suspended = enriched.filter((b) => b.status === 'suspended' || b.subscriptionStatus === 'suspended').length;
    const assigneeCount = assigneeOptions.length;
    return { total, active, trialing, expiring, paid, suspended, assigneeCount };
  }, [enriched, assigneeOptions]);

  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Vận hành doanh nghiệp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi doanh nghiệp, dùng thử 10 ngày, gói dịch vụ và nhân viên phụ trách.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md border border-input hover:bg-muted transition">
            <Download size={16} />
            Xuất dữ liệu
          </button>
          <Link
            href="/businesses/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-primary/90 transition"
          >
            <Plus size={16} />
            Tạo doanh nghiệp
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <StatCard label="Tổng doanh nghiệp" value={stats.total || total} sub={`${total} bản ghi API`} icon={Building2} tone="bg-primary/10 text-primary" />
        <StatCard label="Đang hoạt động" value={stats.active} sub="Đăng nhập được" icon={CheckCircle2} tone="bg-emerald-500/10 text-emerald-700" />
        <StatCard label="Dùng thử 10 ngày" value={stats.trialing} sub={`${stats.expiring} sắp hết hạn`} icon={Clock3} tone="bg-sky-500/10 text-sky-700" />
        <StatCard label="Đã trả phí" value={stats.paid} sub="Gói đang hiệu lực" icon={RefreshCw} tone="bg-cyan-500/10 text-cyan-700" />
        <StatCard label="Tạm khóa" value={stats.suspended} sub="Hết dùng thử / quá hạn" icon={AlertTriangle} tone="bg-red-500/10 text-red-700" />
        <StatCard label="Phụ trách" value={stats.assigneeCount} sub="Nhân viên nền tảng" icon={UserCheck} tone="bg-slate-500/10 text-slate-600" />
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Danh sách doanh nghiệp</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Dùng thử là vòng đời gói dịch vụ; quyền truy cập vẫn hoạt động cho tới khi hết hạn.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter size={14} />
            {filtered.length} kết quả hiển thị
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-4">
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm doanh nghiệp, mã, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="text-sm border border-input rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="pending">Chờ khởi tạo</option>
            <option value="suspended">Tạm khóa</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>
          <select
            value={subscriptionStatus}
            onChange={(e) => setSubscriptionStatus(e.target.value)}
            className="text-sm border border-input rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          >
            <option value="">Tất cả gói dịch vụ</option>
            <option value="trialing">Đang dùng thử</option>
            <option value="active">Đang trả phí</option>
            <option value="past_due">Quá hạn thanh toán</option>
            <option value="suspended">Tạm khóa</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="text-sm border border-input rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          >
            <option value="">Tất cả nhân viên</option>
            {assigneeOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { value: '', label: 'Tất cả dùng thử' },
            { value: 'active', label: 'Còn dùng thử' },
            { value: 'expiring', label: 'Sắp hết hạn' },
            { value: 'expired', label: 'Hết hạn' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setTrial(item.value as TrialFilter)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                trial === item.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Doanh nghiệp</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Mã</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Gói</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Gói dịch vụ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Dùng thử</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Truy cập</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Phụ trách</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Cửa hàng đầu tiên</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                    Đang tải...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center">
                    <Building2 size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Không tìm thấy doanh nghiệp phù hợp</p>
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const statusCfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.inactive;
                  const subscriptionCfg = SUBSCRIPTION_CONFIG[b.subscriptionStatus] ?? SUBSCRIPTION_CONFIG.inactive;
                  const planKey = b.subscriptionPlan?.toLowerCase() ?? 'standard';

                  return (
                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase shrink-0">
                            {b.businessCode.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[220px]">{b.legalName}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                              {b.brandName && b.brandName !== b.legalName ? b.brandName : b.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{b.businessCode}</code>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_CLS[planKey] ?? PLAN_CLS.standard}`}>
                          {b.subscriptionPlan}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${subscriptionCfg.cls}`}>
                          {subscriptionCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${trialTone(b)}`}>
                          {trialLabel(b)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {b.assignedAccount ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                              {b.assignedAccount.fullName
                                .split(' ')
                                .slice(-2)
                                .map((part) => part[0])
                                .join('')}
                            </div>
                            <span className="text-xs text-foreground whitespace-nowrap">{b.assignedAccount.fullName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {b.firstStore ? `${b.firstStore.storeCode} - ${b.firstStore.storeName}` : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/businesses/${b.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <Eye size={13} />
                            Xem
                          </Link>
                          {b.subscriptionStatus === 'trialing' && (
                            <button className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                              <RefreshCw size={13} />
                              Gia hạn
                            </button>
                          )}
                          {b.status === 'active' && (
                            <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline">
                              <KeyRound size={13} />
                              Hỗ trợ
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
        </div>

        {total > 20 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              Hiển thị {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} / {total}
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
