'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, Building2, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3,
  Edit2, ExternalLink, Eye, EyeOff, Globe2, Lock, LockOpen, Mail, MapPin, Phone, Plus, RotateCcw, Search,
  Store, Trash2, User, UserCheck, Users, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';
import { TIMEZONES, CURRENCIES } from '@/lib/biz-constants';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BusinessDetail {
  id: string;
  businessCode: string;
  schemaName: string | null;
  legalName: string;
  brandName: string | null;
  status: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  email: string | null;
  phone: string | null;
  taxCode: string | null;
  currencyCode: string | null;
  website: string | null;
  legalAddress: string | null;
  timezoneName: string | null;
  note: string | null;
  subscriptionExpiresAt: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialExtendedAt: string | null;
  trialDaysLeft: number | null;
  subscription: {
    planCode: string | null;
    status: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    renewedAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface StoreItem {
  id: string;
  storeCode: string;
  storeName: string;
  storeType: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  isActive: boolean;
  staffCount: number;
  createdAt: string;
}

interface Assignee {
  id: string;
  accountId: string;
  fullName: string | null;
  email: string | null;
  username: string;
  isPlatformAdmin: boolean;
  accessLevel: string;
  status: string;
  createdAt: string;
}

interface AccountOption {
  id: string;
  fullName: string | null;
  email: string | null;
  username: string;
  isPlatformAdmin: boolean;
}

interface StaffMember {
  id: string;
  staffCode: string;
  username: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  employmentStatus: string;
  primaryStoreId: string | null;
  storeName: string | null;
  storeCode: string | null;
  storeAssignments: StaffStoreAssignment[];
  lastLoginAt: string | null;
  createdAt: string;
}

interface StaffStoreAssignment {
  storeId: string;
  storeName: string;
  storeCode: string;
  role: string;
}

// ── Config ──────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Hoạt động',       cls: 'bg-emerald-500/10 text-emerald-700' },
  pending:   { label: 'Chờ khởi tạo',   cls: 'bg-amber-500/10 text-amber-700' },
  suspended: { label: 'Tạm khóa',       cls: 'bg-red-500/10 text-red-700' },
  inactive:  { label: 'Ngừng hoạt động',cls: 'bg-slate-500/10 text-slate-600' },
  closed:    { label: 'Đã đóng',        cls: 'bg-slate-500/10 text-slate-600' },
};

const SUB_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  trialing:  { label: 'Dùng thử',   cls: 'bg-sky-500/10 text-sky-700' },
  active:    { label: 'Đang dùng',  cls: 'bg-emerald-500/10 text-emerald-700' },
  past_due:  { label: 'Quá hạn',   cls: 'bg-red-500/10 text-red-700' },
  cancelled: { label: 'Đã hủy',    cls: 'bg-slate-500/10 text-slate-600' },
  suspended: { label: 'Tạm khóa', cls: 'bg-red-500/10 text-red-700' },
  pending:   { label: 'Chờ xử lý', cls: 'bg-amber-500/10 text-amber-700' },
};

const PLAN_CLS: Record<string, string> = {
  starter:      'bg-slate-500/10 text-slate-600',
  standard:     'bg-primary/10 text-primary',
  professional: 'bg-cyan-500/10 text-cyan-700',
  enterprise:   'bg-slate-900 text-white',
};

const ACCESS_LEVEL_LABEL: Record<string, string> = {
  owner:   'Chủ sở hữu',
  admin:   'Quản trị',
  manager: 'Quản lý',
  staff:   'Nhân viên',
  auditor: 'Kiểm soát',
  support: 'Hỗ trợ',
  viewer:  'Xem',
};

const ACCESS_LEVEL_CLS: Record<string, string> = {
  owner:   'bg-amber-500/10 text-amber-700',
  admin:   'bg-primary/10 text-primary',
  manager: 'bg-violet-500/10 text-violet-700',
  staff:   'bg-cyan-500/10 text-cyan-700',
  auditor: 'bg-slate-500/10 text-slate-700',
  support: 'bg-cyan-500/10 text-cyan-700',
  viewer:  'bg-slate-500/10 text-slate-600',
};

const STORE_TYPE_LABEL: Record<string, string> = {
  retail:    'Bán lẻ',
  fnb:       'F&B',
  kiosk:     'Kiosk',
  warehouse: 'Kho',
  office:    'Văn phòng',
};

const STAFF_ROLE_LABEL: Record<string, string> = {
  owner:     'Chủ sở hữu',
  admin:     'Quản trị viên',
  cashier:   'Thu ngân',
  inventory: 'Thủ kho',
  kitchen:   'Bếp / Pha chế',
  delivery:  'Giao hàng',
  staff:     'Nhân viên',
};

const STAFF_ROLES = [
  { value: 'admin',     label: 'Quản trị viên' },
  { value: 'cashier',   label: 'Thu ngân' },
  { value: 'inventory', label: 'Thủ kho' },
  { value: 'kitchen',   label: 'Bếp / Pha chế' },
  { value: 'delivery',  label: 'Giao hàng' },
  { value: 'staff',     label: 'Nhân viên' },
];

const STAFF_ASSIGNMENT_ROLES = [
  { value: 'owner', label: 'Chủ sở hữu' },
  ...STAFF_ROLES,
];

const DEFAULT_STAFF_FORM = {
  fullName: '', username: '', email: '', phone: '', staffCode: '',
  role: 'cashier', password: '', confirmPassword: '',
};

const STORE_TYPES = [
  { value: 'retail',    label: 'Cửa hàng bán lẻ' },
  { value: 'fnb',       label: 'F&B (Nhà hàng / Quán)' },
  { value: 'kiosk',     label: 'Kiosk' },
  { value: 'warehouse', label: 'Kho' },
  { value: 'office',    label: 'Văn phòng' },
];

const DEFAULT_STORE_FORM = {
  storeName: '', storeCode: '', storeType: 'retail',
  phone: '', email: '', address: '', district: '', city: '',
};

const DEFAULT_STAFF_EDIT_FORM = {
  fullName: '',
  username: '',
  email: '',
  phone: '',
  staffCode: '',
  password: '',
  primaryStoreId: '',
  isActive: true,
  storeRoles: [] as { storeId: string; role: string }[],
};

// ── Hooks ──────────────────────────────────────────────────────────────────────

function useEscape(active: boolean, handler: () => void) {
  useEffect(() => {
    if (!active) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handler(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [active, handler]);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const INPUT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
      <p className="w-36 shrink-0 text-xs font-medium text-muted-foreground pt-0.5">{label}</p>
      <div className="text-sm text-foreground">{value ?? <span className="text-muted-foreground/60">—</span>}</div>
    </div>
  );
}

function isStaffAssignedToStore(member: StaffMember, storeId: string) {
  return member.primaryStoreId === storeId || (member.storeAssignments ?? []).some((item) => item.storeId === storeId);
}

function getStaffRoleForStore(member: StaffMember, storeId: string) {
  return (member.storeAssignments ?? []).find((item) => item.storeId === storeId)?.role ?? member.role;
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function BusinessDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const qc = useQueryClient();
  const { permissions } = useAuthStore();

  const canUpdate = permissions.includes('platform.business.update');
  const canViewAssignees = permissions.includes('platform.business.view');

  const [tab, setTab] = useState<'info' | 'stores' | 'subscription' | 'assignees'>('info');
  const [editOpen, setEditOpen] = useState(false);
  const [suspendConfirm, setSuspendConfirm] = useState<'suspend' | 'activate' | null>(null);
  const [extendTrialDays, setExtendTrialDays] = useState(7);
  const [addAssigneeOpen, setAddAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());
  const [addStaffStoreId, setAddStaffStoreId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState(DEFAULT_STAFF_FORM);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffEditForm, setStaffEditForm] = useState(DEFAULT_STAFF_EDIT_FORM);
  const [showStaffPwd, setShowStaffPwd] = useState(false);
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [storeForm, setStoreForm] = useState(DEFAULT_STORE_FORM);

  const [editForm, setEditForm] = useState({
    legalName: '', brandName: '', email: '', phone: '',
    taxCode: '', currencyCode: '', website: '', legalAddress: '', timezoneName: '', note: '',
  });

  useEscape(editOpen, () => setEditOpen(false));
  useEscape(suspendConfirm !== null, () => setSuspendConfirm(null));
  useEscape(addAssigneeOpen, () => { setAddAssigneeOpen(false); setAssigneeSearch(''); });
  useEscape(addStaffStoreId !== null, () => { setAddStaffStoreId(null); setStaffForm(DEFAULT_STAFF_FORM); });
  useEscape(editingStaff !== null, () => { setEditingStaff(null); setStaffEditForm(DEFAULT_STAFF_EDIT_FORM); });
  useEscape(addStoreOpen, () => { setAddStoreOpen(false); setStoreForm(DEFAULT_STORE_FORM); });

  // ── Queries ──

  const { data: business, isLoading } = useQuery<BusinessDetail>({
    queryKey: ['business', id],
    queryFn: () => api.get(`/platform/businesses/${id}`).then((r) => r.data),
  });

  const { data: storesData } = useQuery<{ data: StoreItem[] }>({
    queryKey: ['business-stores', id],
    queryFn: () => api.get(`/platform/businesses/${id}/stores`).then((r) => r.data),
    enabled: tab === 'stores',
  });

  const { data: staffData } = useQuery<{ data: StaffMember[] }>({
    queryKey: ['business-staff', id],
    queryFn: () => api.get(`/platform/businesses/${id}/staff`).then((r) => r.data),
    enabled: tab === 'stores',
  });

  const { data: assigneesData } = useQuery<{ data: Assignee[] }>({
    queryKey: ['business-assignees', id],
    queryFn: () => api.get(`/platform/businesses/${id}/assignees`).then((r) => r.data),
    enabled: tab === 'assignees' && canViewAssignees,
  });

  const { data: accountsData } = useQuery<{ data: AccountOption[] }>({
    queryKey: ['accounts', { search: assigneeSearch, page: 1, status: 'active', isPlatformAdmin: true }],
    queryFn: () =>
      api.get('/platform/accounts', {
        params: {
          search: assigneeSearch || undefined,
          page: 1,
          limit: 20,
          status: 'active',
          isPlatformAdmin: true,
        },
      }).then((r) => r.data),
    enabled: addAssigneeOpen,
  });

  // ── Mutations ──

  const updateMut = useMutation({
    mutationFn: (body: typeof editForm) => api.patch(`/platform/businesses/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business', id] });
      qc.invalidateQueries({ queryKey: ['businesses'] });
      setEditOpen(false);
    },
  });

  const statusMut = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/platform/businesses/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business', id] });
      qc.invalidateQueries({ queryKey: ['businesses'] });
      setSuspendConfirm(null);
    },
  });

  const addAssigneeMut = useMutation({
    mutationFn: (accountId: string) =>
      api.post(`/platform/businesses/${id}/assignees`, { accountId, accessLevel: 'admin' }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-assignees', id] });
      setAddAssigneeOpen(false);
      setAssigneeSearch('');
    },
  });

  const removeAssigneeMut = useMutation({
    mutationFn: (accountId: string) =>
      api.delete(`/platform/businesses/${id}/assignees/${accountId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-assignees', id] }),
  });

  const extendTrialMut = useMutation({
    mutationFn: (days: number) =>
      api.post(`/platform/businesses/${id}/trial/extend`, { days }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business', id] });
      qc.invalidateQueries({ queryKey: ['businesses'] });
    },
  });

  const createStaffMut = useMutation({
    mutationFn: (body: object) =>
      api.post(`/platform/businesses/${id}/staff`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-staff', id] });
      qc.invalidateQueries({ queryKey: ['business-stores', id] });
      setAddStaffStoreId(null);
      setStaffForm(DEFAULT_STAFF_FORM);
    },
  });

  const updateStaffMut = useMutation({
    mutationFn: ({ staffId, body }: { staffId: string; body: object }) =>
      api.patch(`/platform/businesses/${id}/staff/${staffId}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-staff', id] });
      qc.invalidateQueries({ queryKey: ['business-stores', id] });
      setEditingStaff(null);
      setStaffEditForm(DEFAULT_STAFF_EDIT_FORM);
    },
  });

  const createStoreMut = useMutation({
    mutationFn: (body: object) =>
      api.post(`/platform/businesses/${id}/stores`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-stores', id] });
      qc.invalidateQueries({ queryKey: ['businesses'] });
      setAddStoreOpen(false);
      setStoreForm(DEFAULT_STORE_FORM);
    },
  });

  // ── Derived ──

  const openEdit = () => {
    if (!business) return;
    setEditForm({
      legalName: business.legalName ?? '',
      brandName: business.brandName ?? '',
      email: business.email ?? '',
      phone: business.phone ?? '',
      taxCode: business.taxCode ?? '',
      currencyCode: business.currencyCode ?? '',
      website: business.website ?? '',
      legalAddress: business.legalAddress ?? '',
      timezoneName: business.timezoneName ?? '',
      note: business.note ?? '',
    });
    setEditOpen(true);
  };

  const openEditStaff = (member: StaffMember, currentStoreId?: string) => {
    const currentAssignments =
      member.storeAssignments && member.storeAssignments.length > 0
        ? member.storeAssignments.map((item) => ({ storeId: item.storeId, role: item.role }))
        : member.primaryStoreId
          ? [{ storeId: member.primaryStoreId, role: member.role }]
          : [];
    const primaryStoreId =
      currentStoreId && currentAssignments.some((item) => item.storeId === currentStoreId)
        ? currentStoreId
        : member.primaryStoreId ?? currentAssignments[0]?.storeId ?? '';

    setEditingStaff(member);
    setStaffEditForm({
      fullName: member.fullName,
      username: member.username ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      staffCode: member.staffCode,
      password: '',
      primaryStoreId,
      isActive: member.isActive,
      storeRoles: currentAssignments,
    });
  };

  const toggleStaffStoreRole = (storeId: string, checked: boolean) => {
    setStaffEditForm((current) => {
      if (checked) {
        if (current.storeRoles.some((item) => item.storeId === storeId)) return current;
        return {
          ...current,
          primaryStoreId: current.primaryStoreId || storeId,
          storeRoles: [...current.storeRoles, { storeId, role: 'staff' }],
        };
      }

      const nextRoles = current.storeRoles.filter((item) => item.storeId !== storeId);
      return {
        ...current,
        primaryStoreId: current.primaryStoreId === storeId ? nextRoles[0]?.storeId ?? '' : current.primaryStoreId,
        storeRoles: nextRoles,
      };
    });
  };

  const setStaffStoreRole = (storeId: string, role: string) => {
    setStaffEditForm((current) => ({
      ...current,
      storeRoles: current.storeRoles.map((item) => (item.storeId === storeId ? { ...item, role } : item)),
    }));
  };

  const existingAssigneeIds = new Set((assigneesData?.data ?? []).map((a) => a.accountId));
  const availableAccounts = (accountsData?.data ?? [])
    .filter((a) => !existingAssigneeIds.has(a.id))
    .sort((a, b) => Number(b.isPlatformAdmin) - Number(a.isPlatformAdmin));

  // ── Loading / Error states ──

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Building2 size={32} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Không tìm thấy doanh nghiệp</p>
        <button onClick={() => router.push('/businesses')} className="text-sm text-primary hover:underline">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const sc = STATUS_CFG[business.status] ?? STATUS_CFG.inactive;
  const subSc = SUB_STATUS_CFG[business.subscriptionStatus] ?? SUB_STATUS_CFG.active;
  const planCls = PLAN_CLS[business.subscriptionPlan?.toLowerCase()] ?? PLAN_CLS.standard;
  const initials = business.legalName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Link href="/businesses" className="mt-1 text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{business.legalName}</h1>
              {business.brandName && business.brandName !== business.legalName && (
                <span className="text-sm text-muted-foreground">({business.brandName})</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{business.businessCode}</code>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sc.cls}`}>{sc.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${subSc.cls}`}>{subSc.label}</span>
            </div>
          </div>
        </div>
        {canUpdate && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openEdit}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted transition"
            >
              <Edit2 size={14} /> Chỉnh sửa
            </button>
            {business.status === 'active' ? (
              <button
                onClick={() => setSuspendConfirm('suspend')}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
              >
                <Lock size={14} /> Tạm khóa
              </button>
            ) : business.status === 'suspended' ? (
              <button
                onClick={() => setSuspendConfirm('activate')}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition"
              >
                <LockOpen size={14} /> Kích hoạt
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto border-b border-border">
        <nav className="flex min-w-max gap-0">
          {([
            { key: 'info',         label: 'Thông tin' },
            { key: 'stores',       label: 'Cửa hàng' },
            { key: 'subscription', label: 'Gói dịch vụ' },
            { key: 'assignees',    label: 'Phụ trách' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Thông tin */}
      {tab === 'info' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Thông tin pháp lý</h3>
            <InfoRow label="Tên pháp lý" value={business.legalName} />
            <InfoRow label="Tên thương hiệu" value={business.brandName} />
            <InfoRow label="Mã số thuế" value={business.taxCode} />
            <InfoRow label="Email liên hệ" value={business.email} />
            <InfoRow label="Số điện thoại" value={business.phone} />
            <InfoRow
              label="Website"
              value={
                business.website ? (
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe2 size={13} />
                    {business.website}
                    <ExternalLink size={11} className="text-muted-foreground" />
                  </a>
                ) : null
              }
            />
            <InfoRow label="Địa chỉ pháp lý" value={business.legalAddress} />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Cấu hình hệ thống</h3>
            <InfoRow
              label="Mã doanh nghiệp"
              value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{business.businessCode}</code>}
            />
            <InfoRow
              label="Schema DB"
              value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{business.schemaName ?? '—'}</code>}
            />
            <InfoRow label="Tiền tệ" value={CURRENCIES.find((c) => c.value === business.currencyCode)?.label ?? business.currencyCode} />
            <InfoRow label="Múi giờ" value={TIMEZONES.find((t) => t.value === business.timezoneName)?.label ?? business.timezoneName} />
            <InfoRow
              label="Ngày tạo"
              value={new Date(business.createdAt).toLocaleString('vi-VN')}
            />
            <InfoRow
              label="Cập nhật lần cuối"
              value={new Date(business.updatedAt).toLocaleString('vi-VN')}
            />
          </div>
          {business.note && (
            <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-foreground mb-2">Ghi chú</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{business.note}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Cửa hàng */}
      {tab === 'stores' && (
        <div className="space-y-3">
          {/* Tab header with add button */}
          {canUpdate && storesData && storesData.data.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{storesData.data.length} cửa hàng</p>
              <button
                type="button"
                onClick={() => { setStoreForm(DEFAULT_STORE_FORM); setAddStoreOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
              >
                <Plus size={14} /> Thêm cửa hàng
              </button>
            </div>
          )}

          {!storesData ? (
            <div className="rounded-lg border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">Đang tải…</div>
          ) : storesData.data.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/8">
                <Store size={26} className="text-primary/60" />
              </div>
              <p className="text-sm font-medium text-foreground">Doanh nghiệp chưa có cửa hàng nào</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                Tạo cửa hàng đầu tiên để bắt đầu thêm nhân viên và vận hành POS.
              </p>
              {canUpdate && (
                <button
                  type="button"
                  onClick={() => { setStoreForm(DEFAULT_STORE_FORM); setAddStoreOpen(true); }}
                  className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
                >
                  <Plus size={15} /> Tạo cửa hàng đầu tiên
                </button>
              )}
            </div>
          ) : (
            storesData.data.map((s) => {
              const storeStaff = (staffData?.data ?? []).filter((m) => isStaffAssignedToStore(m, s.id));
              const expanded = expandedStores.has(s.id);
              return (
                <div key={s.id} className="rounded-lg border border-border bg-card overflow-hidden">
                  {/* Store header row */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedStores((prev) => {
                      const next = new Set(prev);
                      next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                      return next;
                    })}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Store size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{s.storeName}</p>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{s.storeCode}</code>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.isActive ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'
                        }`}>{s.isActive ? 'Hoạt động' : 'Ngừng'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {(s.city || s.address) && (
                          <span className="flex items-center gap-1"><MapPin size={11} />{[s.city, s.address].filter(Boolean).join(', ')}</span>
                        )}
                        {s.phone && (
                          <span className="flex items-center gap-1"><Phone size={11} />{s.phone}</span>
                        )}
                        <span className="flex items-center gap-1"><Users size={11} />{storeStaff.length} nhân viên</span>
                        <span className="text-muted-foreground/70">{STORE_TYPE_LABEL[s.storeType] ?? s.storeType}</span>
                      </div>
                    </div>
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAddStaffStoreId(s.id); setStaffForm({ ...DEFAULT_STAFF_FORM }); }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition shrink-0"
                      >
                        <Plus size={12} /> Thêm nhân viên
                      </button>
                    )}
                    <div className="text-muted-foreground shrink-0 ml-1">
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>

                  {/* Staff list (expanded) */}
                  {expanded && (
                    <div className="border-t border-border">
                      {storeStaff.length === 0 ? (
                        <div className="px-5 py-6 text-center">
                          <Users size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">Chưa có nhân viên trong cửa hàng này</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                          <thead>
                            <tr className="bg-muted/30">
                              <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">Nhân viên</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Mã NV</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Đăng nhập bằng</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Chức vụ</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Đăng nhập cuối</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Trạng thái</th>
                              {canUpdate && <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground" />}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {storeStaff.map((m) => (
                              <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                      {m.fullName.split(' ').slice(-1)[0]?.[0]?.toUpperCase() ?? '?'}
                                    </div>
                                    <span className="font-medium text-foreground text-xs">{m.fullName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{m.staffCode}</code>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-0.5">
                                    {m.username && (
                                      <span className="inline-flex items-center gap-1 text-xs text-foreground">
                                        @{m.username}
                                      </span>
                                    )}
                                    {m.phone && (
                                      <span className="inline-flex items-center gap-1 text-xs text-foreground">
                                        <Phone size={11} className="text-emerald-600" />{m.phone}
                                      </span>
                                    )}
                                    {m.email && (
                                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                        <Mail size={11} />{m.email}
                                      </span>
                                    )}
                                    {!m.username && !m.phone && !m.email && (
                                      <span className="text-xs text-muted-foreground/60">Chỉ mã NV</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-muted-foreground">
                                    {STAFF_ROLE_LABEL[getStaffRoleForStore(m, s.id)] ?? getStaffRoleForStore(m, s.id)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                  {m.lastLoginAt
                                    ? new Date(m.lastLoginAt).toLocaleString('vi-VN')
                                    : <span className="text-muted-foreground/50">Chưa đăng nhập</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    m.isActive ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'
                                  }`}>{m.isActive ? 'Hoạt động' : 'Ngừng'}</span>
                                </td>
                                {canUpdate && (
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => openEditStaff(m, s.id)}
                                      className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                    >
                                      <Edit2 size={12} /> Sửa
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Gói dịch vụ */}
      {tab === 'subscription' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Gói hiện tại</h3>
            <InfoRow
              label="Gói dịch vụ"
              value={
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${planCls}`}>
                  {business.subscriptionPlan}
                </span>
              }
            />
            <InfoRow
              label="Trạng thái"
              value={
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${subSc.cls}`}>
                  {subSc.label}
                </span>
              }
            />
            {business.subscription && (
              <>
                <InfoRow
                  label="Chu kỳ bắt đầu"
                  value={business.subscription.periodStart
                    ? new Date(business.subscription.periodStart).toLocaleDateString('vi-VN')
                    : null}
                />
                <InfoRow
                  label="Chu kỳ kết thúc"
                  value={business.subscription.periodEnd
                    ? new Date(business.subscription.periodEnd).toLocaleDateString('vi-VN')
                    : null}
                />
                {business.subscription.renewedAt && (
                  <InfoRow
                    label="Gia hạn lần cuối"
                    value={new Date(business.subscription.renewedAt).toLocaleDateString('vi-VN')}
                  />
                )}
              </>
            )}
            {business.subscriptionExpiresAt && (
              <InfoRow
                label="Hết hạn lúc"
                value={new Date(business.subscriptionExpiresAt).toLocaleString('vi-VN')}
              />
            )}
          </div>

          {(business.subscriptionStatus === 'trialing' || business.trialExtendedAt) && (
            <div className="rounded-lg border border-sky-200 bg-sky-500/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock3 size={16} className="text-sky-600" />
                  <h3 className="text-sm font-semibold text-sky-700">Dùng thử</h3>
                </div>
                {canUpdate && (
                  <div className="flex items-center gap-2">
                    <select
                      value={extendTrialDays}
                      onChange={(e) => setExtendTrialDays(Number(e.target.value))}
                      className="h-8 rounded-md border border-sky-200 bg-white px-2 text-xs text-sky-800 focus:outline-none"
                    >
                      {[3, 5, 7, 10, 14, 30].map((d) => (
                        <option key={d} value={d}>+{d} ngày</option>
                      ))}
                    </select>
                    <button
                      onClick={() => extendTrialMut.mutate(extendTrialDays)}
                      disabled={extendTrialMut.isPending}
                      className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition"
                    >
                      <RotateCcw size={12} className={extendTrialMut.isPending ? 'animate-spin' : ''} />
                      Gia hạn
                    </button>
                  </div>
                )}
              </div>
              <InfoRow
                label="Bắt đầu dùng thử"
                value={business.trialStartedAt
                  ? new Date(business.trialStartedAt).toLocaleDateString('vi-VN')
                  : null}
              />
              <InfoRow
                label="Kết thúc dùng thử"
                value={business.trialEndsAt
                  ? new Date(business.trialEndsAt).toLocaleDateString('vi-VN')
                  : null}
              />
              {business.trialExtendedAt && (
                <InfoRow label="Đã gia hạn tới" value={
                  <span className="text-sky-700 font-medium">{new Date(business.trialExtendedAt).toLocaleDateString('vi-VN')}</span>
                } />
              )}
              <InfoRow
                label="Còn lại"
                value={
                  business.trialDaysLeft !== null ? (
                    <span className={`font-semibold ${
                      business.trialDaysLeft <= 2 ? 'text-red-600' :
                      business.trialDaysLeft <= 5 ? 'text-amber-600' : 'text-sky-700'
                    }`}>
                      {business.trialDaysLeft === 0
                        ? 'Hết hôm nay'
                        : business.trialDaysLeft < 0
                        ? 'Đã hết hạn'
                        : `${business.trialDaysLeft} ngày`}
                    </span>
                  ) : null
                }
              />
              {extendTrialMut.isError && (
                <p className="mt-2 text-xs text-destructive">
                  {getApiErrorMessage(extendTrialMut.error, 'Lỗi khi gia hạn.')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Phụ trách */}
      {tab === 'assignees' && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Nhân viên phụ trách{assigneesData ? ` (${assigneesData.data.length})` : ''}
            </h3>
            {canUpdate && (
              <button
                onClick={() => setAddAssigneeOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition"
              >
                <Plus size={13} /> Thêm phụ trách
              </button>
            )}
          </div>
          {!assigneesData ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">Đang tải…</div>
          ) : assigneesData.data.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <UserCheck size={32} className="mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Chưa có nhân viên phụ trách</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Tài khoản</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cấp độ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Được gán lúc</th>
                  {canUpdate && <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assigneesData.data.map((a) => {
                  const display = a.fullName ?? a.username;
                  const initials2 = display.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
                  const lvlCls = ACCESS_LEVEL_CLS[a.accessLevel] ?? ACCESS_LEVEL_CLS.viewer;
                  const lvlLabel = ACCESS_LEVEL_LABEL[a.accessLevel] ?? a.accessLevel;
                  return (
                    <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {initials2}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{display}</p>
                            <p className="text-xs text-muted-foreground">{a.email ?? `@${a.username}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lvlCls}`}>{lvlLabel}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      {canUpdate && (
                        <td className="px-4 py-3.5 text-right">
                          {a.accessLevel !== 'owner' && (
                            <button
                              onClick={() => removeAssigneeMut.mutate(a.accountId)}
                              disabled={removeAssigneeMut.isPending}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600 transition disabled:opacity-40"
                            >
                              <Trash2 size={13} /> Gỡ
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Edit Business Info */}
      {editOpen && canUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Chỉnh sửa thông tin</h3>
              <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tên pháp lý *">
                  <input className={INPUT} value={editForm.legalName} onChange={(e) => setEditForm((f) => ({ ...f, legalName: e.target.value }))} />
                </Field>
                <Field label="Tên thương hiệu">
                  <input className={INPUT} value={editForm.brandName} onChange={(e) => setEditForm((f) => ({ ...f, brandName: e.target.value }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email liên hệ">
                  <input type="email" className={INPUT} value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                </Field>
                <Field label="Số điện thoại">
                  <input className={INPUT} value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mã số thuế">
                  <input className={INPUT} value={editForm.taxCode} onChange={(e) => setEditForm((f) => ({ ...f, taxCode: e.target.value }))} />
                </Field>
                <Field label="Tiền tệ">
                  <select className={INPUT} value={editForm.currencyCode} onChange={(e) => setEditForm((f) => ({ ...f, currencyCode: e.target.value }))}>
                    {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Website">
                <div className="relative">
                  <Globe2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="url"
                    className={INPUT + ' pl-8'}
                    value={editForm.website}
                    onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="https://business.vn"
                  />
                </div>
              </Field>
              <Field label="Địa chỉ pháp lý">
                <textarea className={INPUT + ' resize-none'} rows={2} value={editForm.legalAddress} onChange={(e) => setEditForm((f) => ({ ...f, legalAddress: e.target.value }))} placeholder="Địa chỉ đăng ký kinh doanh" />
              </Field>
              <Field label="Múi giờ">
                <select className={INPUT} value={editForm.timezoneName} onChange={(e) => setEditForm((f) => ({ ...f, timezoneName: e.target.value }))}>
                  {Object.entries(
                    TIMEZONES.reduce<Record<string, typeof TIMEZONES>>((acc, tz) => {
                      (acc[tz.group] ??= []).push(tz);
                      return acc;
                    }, {}),
                  ).map(([group, tzs]) => (
                    <optgroup key={group} label={group}>
                      {tzs.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="Ghi chú vận hành">
                <textarea className={INPUT + ' resize-none'} rows={3} value={editForm.note} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} placeholder="Nguồn lead, yêu cầu đặc biệt..." />
              </Field>
            </div>
            {updateMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                {getApiErrorMessage(updateMut.error, 'Lỗi khi cập nhật.')}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditOpen(false)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition">Hủy</button>
              <button
                onClick={() => updateMut.mutate(editForm)}
                disabled={updateMut.isPending || !editForm.legalName}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {updateMut.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Suspend / Activate Confirm */}
      {suspendConfirm !== null && canUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                suspendConfirm === 'suspend' ? 'bg-red-500/10' : 'bg-emerald-500/10'
              }`}>
                {suspendConfirm === 'suspend'
                  ? <AlertTriangle size={18} className="text-red-600" />
                  : <CheckCircle2 size={18} className="text-emerald-600" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {suspendConfirm === 'suspend' ? 'Tạm khóa doanh nghiệp?' : 'Kích hoạt doanh nghiệp?'}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {suspendConfirm === 'suspend'
                    ? `Doanh nghiệp "${business.legalName}" sẽ bị tạm khóa. Người dùng sẽ không thể đăng nhập.`
                    : `Doanh nghiệp "${business.legalName}" sẽ được kích hoạt trở lại.`}
                </p>
              </div>
            </div>
            {statusMut.isError && (
              <p className="mb-3 text-xs text-destructive">
                {getApiErrorMessage(statusMut.error, 'Lỗi khi cập nhật.')}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setSuspendConfirm(null)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition">Hủy</button>
              <button
                onClick={() => statusMut.mutate(suspendConfirm === 'suspend' ? 'suspended' : 'active')}
                disabled={statusMut.isPending}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition ${
                  suspendConfirm === 'suspend' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {statusMut.isPending ? 'Đang xử lý...' : suspendConfirm === 'suspend' ? 'Tạm khóa' : 'Kích hoạt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Staff */}
      {addStaffStoreId !== null && canUpdate && (() => {
        const targetStore = storesData?.data.find((s) => s.id === addStaffStoreId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Thêm nhân viên</h3>
                  {targetStore && <p className="text-xs text-muted-foreground mt-0.5">{targetStore.storeName}</p>}
                </div>
                <button onClick={() => { setAddStaffStoreId(null); setStaffForm(DEFAULT_STAFF_FORM); }}
                  className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
              </div>

              <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                <Field label="Họ và tên *">
                  <input className={INPUT} value={staffForm.fullName} autoFocus
                    onChange={(e) => setStaffForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Nguyễn Văn A" />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Username">
                    <input className={INPUT} value={staffForm.username}
                      onChange={(e) => setStaffForm((f) => ({ ...f, username: e.target.value }))}
                      placeholder="nguyenvana" />
                  </Field>
                  <Field label="Số điện thoại (đăng nhập)">
                    <input className={INPUT} value={staffForm.phone}
                      onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="0901234567" />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email (đăng nhập)">
                    <input type="email" className={INPUT} value={staffForm.email}
                      onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="nv@business.vn" />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mã nhân viên" >
                    <input className={INPUT} value={staffForm.staffCode}
                      onChange={(e) => setStaffForm((f) => ({ ...f, staffCode: e.target.value }))}
                      placeholder="Tự động nếu để trống" />
                  </Field>
                  <Field label="Chức vụ *">
                    <select className={INPUT} value={staffForm.role}
                      onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))}>
                      {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Mật khẩu *">
                  <div className="relative">
                    <input
                      type={showStaffPwd ? 'text' : 'password'}
                      className={INPUT + ' pr-9'} value={staffForm.password}
                      onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="≥ 8 ký tự" />
                    <button type="button" onClick={() => setShowStaffPwd((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showStaffPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </Field>

                <div className="rounded-md bg-sky-500/5 border border-sky-200 px-3 py-2 text-xs text-sky-700">
                  Nhân viên đăng nhập bằng: <strong>username</strong>, <strong>SĐT</strong>, <strong>email</strong>, hoặc <strong>mã NV</strong> + mật khẩu
                </div>
              </div>

              {createStaffMut.isError && (
                <p className="mt-3 text-xs text-destructive">
                  {getApiErrorMessage(createStaffMut.error, 'Lỗi khi thêm nhân viên.')}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => { setAddStaffStoreId(null); setStaffForm(DEFAULT_STAFF_FORM); }}
                  className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition">Hủy</button>
                <button
                  onClick={() => {
                    if (!staffForm.fullName || !staffForm.password) return;
                    createStaffMut.mutate({
                      fullName: staffForm.fullName,
                      ...(staffForm.username && { username: staffForm.username }),
                      ...(staffForm.email && { email: staffForm.email }),
                      ...(staffForm.phone && { phone: staffForm.phone }),
                      ...(staffForm.staffCode && { staffCode: staffForm.staffCode }),
                      role: staffForm.role,
                      password: staffForm.password,
                      primaryStoreId: addStaffStoreId,
                    });
                  }}
                  disabled={createStaffMut.isPending || !staffForm.fullName || !staffForm.password}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
                >
                  {createStaffMut.isPending ? 'Đang thêm...' : 'Thêm nhân viên'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Edit Staff */}
      {editingStaff && canUpdate && (() => {
        const stores = storesData?.data ?? [];
        const selectedStoreIds = new Set(staffEditForm.storeRoles.map((item) => item.storeId));
        const canSaveStaff =
          staffEditForm.fullName.trim().length > 0 &&
          staffEditForm.staffCode.trim().length > 0 &&
          staffEditForm.primaryStoreId.length > 0 &&
          staffEditForm.storeRoles.length > 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Sửa nhân viên</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{editingStaff.fullName}</p>
                </div>
                <button
                  onClick={() => { setEditingStaff(null); setStaffEditForm(DEFAULT_STAFF_EDIT_FORM); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Họ và tên *">
                    <input
                      className={INPUT}
                      value={staffEditForm.fullName}
                      onChange={(e) => setStaffEditForm((f) => ({ ...f, fullName: e.target.value }))}
                      autoFocus
                    />
                  </Field>
                  <Field label="Mã nhân viên *">
                    <input
                      className={INPUT}
                      value={staffEditForm.staffCode}
                      onChange={(e) => setStaffEditForm((f) => ({ ...f, staffCode: e.target.value }))}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Username">
                    <input
                      className={INPUT}
                      value={staffEditForm.username}
                      onChange={(e) => setStaffEditForm((f) => ({ ...f, username: e.target.value }))}
                      placeholder="nguyenvana"
                    />
                  </Field>
                  <Field label="Số điện thoại">
                    <input
                      className={INPUT}
                      value={staffEditForm.phone}
                      onChange={(e) => setStaffEditForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="0901234567"
                    />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Email">
                    <input
                      type="email"
                      className={INPUT}
                      value={staffEditForm.email}
                      onChange={(e) => setStaffEditForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="nv@business.vn"
                    />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Trạng thái">
                    <select
                      className={INPUT}
                      value={staffEditForm.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setStaffEditForm((f) => ({ ...f, isActive: e.target.value === 'active' }))}
                    >
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Ngừng hoạt động</option>
                    </select>
                  </Field>
                  <Field label="Mật khẩu mới">
                    <input
                      type="password"
                      className={INPUT}
                      value={staffEditForm.password}
                      onChange={(e) => setStaffEditForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Để trống nếu không đổi"
                    />
                  </Field>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Cửa hàng và vai trò *</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Chọn một hoặc nhiều cửa hàng. Mỗi cửa hàng có thể dùng vai trò riêng cho cùng nhân viên.
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-md border border-border">
                    {stores.map((store) => {
                      const assigned = selectedStoreIds.has(store.id);
                      const role = staffEditForm.storeRoles.find((item) => item.storeId === store.id)?.role ?? 'staff';
                      return (
                        <div key={store.id} className="grid gap-3 border-b border-border px-3 py-3 last:border-b-0 md:grid-cols-[1fr_130px_170px] md:items-center">
                          <label className="flex min-w-0 items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={assigned}
                              onChange={(e) => toggleStaffStoreRole(store.id, e.target.checked)}
                              className="mt-1"
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-foreground">{store.storeName}</span>
                              <span className="text-xs text-muted-foreground">{store.storeCode}</span>
                            </span>
                          </label>
                          <label className={`flex items-center gap-2 text-xs ${assigned ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                            <input
                              type="radio"
                              name="primary-store"
                              checked={staffEditForm.primaryStoreId === store.id}
                              disabled={!assigned}
                              onChange={() => setStaffEditForm((f) => ({ ...f, primaryStoreId: store.id }))}
                            />
                            Cửa hàng chính
                          </label>
                          <select
                            className={INPUT}
                            value={role}
                            disabled={!assigned}
                            onChange={(e) => setStaffStoreRole(store.id, e.target.value)}
                          >
                            {STAFF_ASSIGNMENT_ROLES.map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {updateStaffMut.isError && (
                <p className="mt-3 text-xs text-destructive">
                  {getApiErrorMessage(updateStaffMut.error, 'Lỗi khi cập nhật nhân viên.')}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => { setEditingStaff(null); setStaffEditForm(DEFAULT_STAFF_EDIT_FORM); }}
                  className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (!canSaveStaff || !editingStaff) return;
                    const storeRoles = staffEditForm.storeRoles.map((item) => ({ storeId: item.storeId, role: item.role }));
                    const primaryRole = storeRoles.find((item) => item.storeId === staffEditForm.primaryStoreId)?.role ?? storeRoles[0]?.role ?? 'staff';
                    const memberRole = primaryRole === 'owner' ? 'admin' : primaryRole;
                    updateStaffMut.mutate({
                      staffId: editingStaff.id,
                      body: {
                        fullName: staffEditForm.fullName.trim(),
                        staffCode: staffEditForm.staffCode.trim(),
                        username: staffEditForm.username.trim() || null,
                        email: staffEditForm.email.trim() || null,
                        phone: staffEditForm.phone.trim() || null,
                        role: memberRole,
                        primaryStoreId: staffEditForm.primaryStoreId,
                        isActive: staffEditForm.isActive,
                        storeRoles,
                        ...(staffEditForm.password.trim() && { password: staffEditForm.password.trim() }),
                      },
                    });
                  }}
                  disabled={updateStaffMut.isPending || !canSaveStaff}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
                >
                  {updateStaffMut.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Create Store */}
      {addStoreOpen && canUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Tạo cửa hàng mới</h3>
              <button
                onClick={() => { setAddStoreOpen(false); setStoreForm(DEFAULT_STORE_FORM); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <Field label="Tên cửa hàng *">
                <input
                  className={INPUT}
                  value={storeForm.storeName}
                  autoFocus
                  onChange={(e) => setStoreForm((f) => ({ ...f, storeName: e.target.value }))}
                  placeholder="Cửa hàng 1"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Mã cửa hàng">
                  <input
                    className={INPUT}
                    value={storeForm.storeCode}
                    onChange={(e) => setStoreForm((f) => ({ ...f, storeCode: e.target.value.toUpperCase() }))}
                    placeholder="Tự động nếu để trống"
                  />
                  <p className="text-xs text-muted-foreground mt-1">2–30 ký tự IN HOA, số, gạch dưới</p>
                </Field>
                <Field label="Loại cửa hàng">
                  <select
                    className={INPUT}
                    value={storeForm.storeType}
                    onChange={(e) => setStoreForm((f) => ({ ...f, storeType: e.target.value }))}
                  >
                    {STORE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Số điện thoại">
                  <input
                    className={INPUT}
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="0901234567"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className={INPUT}
                    value={storeForm.email}
                    onChange={(e) => setStoreForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="cuahang@business.vn"
                  />
                </Field>
              </div>

              <Field label="Địa chỉ">
                <input
                  className={INPUT}
                  value={storeForm.address}
                  onChange={(e) => setStoreForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Nguyễn Huệ"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Quận / Huyện">
                  <input
                    className={INPUT}
                    value={storeForm.district}
                    onChange={(e) => setStoreForm((f) => ({ ...f, district: e.target.value }))}
                    placeholder="Quận 1"
                  />
                </Field>
                <Field label="Tỉnh / Thành phố">
                  <input
                    className={INPUT}
                    value={storeForm.city}
                    onChange={(e) => setStoreForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="TP. Hồ Chí Minh"
                  />
                </Field>
              </div>
            </div>

            {createStoreMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                {getApiErrorMessage(createStoreMut.error, 'Lỗi khi tạo cửa hàng.')}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setAddStoreOpen(false); setStoreForm(DEFAULT_STORE_FORM); }}
                className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (!storeForm.storeName.trim()) return;
                  createStoreMut.mutate({
                    storeName: storeForm.storeName.trim(),
                    ...(storeForm.storeCode && { storeCode: storeForm.storeCode }),
                    storeType: storeForm.storeType,
                    ...(storeForm.phone && { phone: storeForm.phone }),
                    ...(storeForm.email && { email: storeForm.email }),
                    ...(storeForm.address && { address: storeForm.address }),
                    ...(storeForm.district && { district: storeForm.district }),
                    ...(storeForm.city && { city: storeForm.city }),
                  });
                }}
                disabled={createStoreMut.isPending || !storeForm.storeName.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {createStoreMut.isPending ? 'Đang tạo...' : 'Tạo cửa hàng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Assignee */}
      {addAssigneeOpen && canUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Thêm nhân viên phụ trách</h3>
              <button onClick={() => { setAddAssigneeOpen(false); setAssigneeSearch(''); }} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Tài khoản được thêm sẽ được gán quyền phụ trách mức <span className="font-medium text-foreground">Quản trị</span>.
            </p>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm tài khoản..."
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-md border border-border">
              {availableAccounts.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {assigneeSearch ? 'Không tìm thấy tài khoản phù hợp' : 'Tất cả tài khoản đã được thêm'}
                </div>
              ) : (
                availableAccounts.map((a) => {
                  const name = a.fullName ?? a.username;
                  const ini = name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => addAssigneeMut.mutate(a.id)}
                      disabled={addAssigneeMut.isPending}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition disabled:opacity-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{ini}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.email ?? `@${a.username}`}</p>
                      </div>
                      {a.isPlatformAdmin && (
                        <span className="text-xs text-primary font-medium shrink-0">Admin</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            {addAssigneeMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                {getApiErrorMessage(addAssigneeMut.error, 'Lỗi khi thêm phụ trách.')}
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
