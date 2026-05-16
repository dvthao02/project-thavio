'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';

interface BusinessItem {
  id: string;
  businessCode: string;
  legalName: string;
  status: string;
}

interface StoreItem {
  id: string;
  businessId: string;
  businessCode: string;
  storeCode: string;
  storeName: string;
  isActive: boolean;
  staffCount?: number;
}

interface StaffStoreAssignment {
  storeId: string;
  storeName: string;
  storeCode: string;
  role: string;
}

interface StaffMember {
  id: string;
  businessId: string;
  businessCode: string;
  businessLegalName: string;
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

interface ListResponse<T> {
  data: T[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

const STAFF_ROLES = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'cashier', label: 'Thu ngân' },
  { value: 'inventory', label: 'Thủ kho' },
  { value: 'kitchen', label: 'Bếp / Pha chế' },
  { value: 'delivery', label: 'Giao hàng' },
  { value: 'staff', label: 'Nhân viên' },
] as const;

const STAFF_ASSIGNMENT_ROLES = [
  { value: 'owner', label: 'Chủ sở hữu' },
  ...STAFF_ROLES,
] as const;

const EMPLOYMENT_STATUSES = [
  { value: 'active', label: 'Đang làm' },
  { value: 'inactive', label: 'Tạm nghỉ' },
  { value: 'on_leave', label: 'Nghỉ phép' },
  { value: 'terminated', label: 'Đã nghỉ việc' },
] as const;

const INPUT =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60';

const ACTION_BUTTON =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40';

const EMPTY_STAFF_FORM = {
  businessId: '',
  fullName: '',
  username: '',
  email: '',
  phone: '',
  staffCode: '',
  role: 'staff',
  password: '',
  primaryStoreId: '',
};

const EMPTY_EDIT_FORM = {
  businessId: '',
  fullName: '',
  username: '',
  email: '',
  phone: '',
  staffCode: '',
  password: '',
  primaryStoreId: '',
  isActive: true,
  employmentStatus: 'active',
  storeRoles: [] as { storeId: string; role: string }[],
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roleLabel(role: string) {
  return STAFF_ASSIGNMENT_ROLES.find((item) => item.value === role)?.label ?? role;
}

function employmentStatusLabel(status: string) {
  return EMPLOYMENT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

function accountStatusLabel(member: StaffMember) {
  if (!member.isActive) return { label: 'Khóa', cls: 'bg-red-500/10 text-red-700' };
  if (member.employmentStatus !== 'active') return { label: employmentStatusLabel(member.employmentStatus), cls: 'bg-slate-500/10 text-slate-700' };
  return { label: 'Hoạt động', cls: 'bg-emerald-500/10 text-emerald-700' };
}

function getAssignments(member: StaffMember): StaffStoreAssignment[] {
  if (member.storeAssignments?.length) return member.storeAssignments;
  if (!member.primaryStoreId || !member.storeName || !member.storeCode) return [];
  return [{
    storeId: member.primaryStoreId,
    storeName: member.storeName,
    storeCode: member.storeCode,
    role: member.role,
  }];
}

function memberBelongsToStore(member: StaffMember, storeId: string) {
  return member.primaryStoreId === storeId || getAssignments(member).some((item) => item.storeId === storeId);
}

export default function BusinessAccountsPage() {
  const qc = useQueryClient();
  const { permissions } = useAuthStore();
  const canViewBusiness = permissions.includes('platform.business.view');
  const canUpdateBusiness = permissions.includes('platform.business.update');

  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [detailMember, setDetailMember] = useState<StaffMember | null>(null);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF_FORM);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: businessesData, isLoading: businessesLoading, refetch: refetchBusinesses } = useQuery<ListResponse<BusinessItem>>({
    queryKey: ['operations-business-accounts-businesses'],
    queryFn: () =>
      api
        .get('/platform/businesses', { params: { page: 1, limit: 100 } })
        .then((res) => res.data),
    enabled: canViewBusiness,
    staleTime: 300_000,
  });

  const businesses = useMemo(() => businessesData?.data ?? [], [businessesData?.data]);
  const businessIdsKey = useMemo(() => businesses.map((item) => item.id).join(','), [businesses]);

  const targetBusinesses = useMemo(() => {
    if (selectedBusinessId) {
      return businesses.filter((business) => business.id === selectedBusinessId);
    }
    return businesses;
  }, [businesses, selectedBusinessId]);

  const { data: storesData, isLoading: storesLoading, isFetching: storesFetching, refetch: refetchStores } = useQuery<{ data: StoreItem[] }>({
    queryKey: ['operations-business-accounts-stores', businessIdsKey, selectedBusinessId],
    queryFn: async () => {
      const rows = await Promise.all(
        targetBusinesses.map(async (business) => {
          const res = await api.get<{ data: Omit<StoreItem, 'businessId' | 'businessCode'>[] }>(`/platform/businesses/${business.id}/stores`);
          return res.data.data.map((store) => ({
            ...store,
            businessId: business.id,
            businessCode: business.businessCode,
          }));
        }),
      );
      return { data: rows.flat() };
    },
    enabled: canViewBusiness && targetBusinesses.length > 0,
    placeholderData: (previous) => previous,
  });

  const stores = useMemo(() => storesData?.data ?? [], [storesData?.data]);
  const storesByBusiness = useMemo(() => {
    const map = new Map<string, StoreItem[]>();
    for (const store of stores) {
      const list = map.get(store.businessId) ?? [];
      list.push(store);
      map.set(store.businessId, list);
    }
    return map;
  }, [stores]);

  useEffect(() => {
    if (!selectedStoreId) return;
    if (!stores.some((store) => store.id === selectedStoreId)) {
      setSelectedStoreId('');
    }
  }, [stores, selectedStoreId]);

  const { data: staffData, isLoading: staffLoading, isFetching: staffFetching, refetch: refetchStaff } = useQuery<{ data: StaffMember[] }>({
    queryKey: ['operations-business-accounts-staff', businessIdsKey, selectedBusinessId],
    queryFn: async () => {
      const rows = await Promise.all(
        targetBusinesses.map(async (business) => {
          const res = await api.get<{ data: Omit<StaffMember, 'businessId' | 'businessCode' | 'businessLegalName'>[] }>(
            `/platform/businesses/${business.id}/staff`,
          );
          return res.data.data.map((member) => ({
            ...member,
            businessId: business.id,
            businessCode: business.businessCode,
            businessLegalName: business.legalName,
            storeAssignments: member.storeAssignments ?? [],
          }));
        }),
      );
      return { data: rows.flat() };
    },
    enabled: canViewBusiness && targetBusinesses.length > 0,
    placeholderData: (previous) => previous,
  });

  const selectedBusiness = useMemo(
    () => businesses.find((item) => item.id === selectedBusinessId) ?? null,
    [businesses, selectedBusinessId],
  );

  const filteredStaff = useMemo(() => {
    const rows = staffData?.data ?? [];
    return rows.filter((member) => {
      const assignments = getAssignments(member);
      const assignmentText = assignments.map((item) => `${item.storeName} ${item.storeCode} ${roleLabel(item.role)}`).join(' ');
      const text = `${member.fullName} ${member.staffCode} ${member.username ?? ''} ${member.email ?? ''} ${member.phone ?? ''} ${member.businessLegalName} ${member.businessCode} ${assignmentText}`.toLowerCase();
      if (selectedStoreId && !memberBelongsToStore(member, selectedStoreId)) return false;
      if (search && !text.includes(search.toLowerCase())) return false;
      if (roleFilter && member.role !== roleFilter && !assignments.some((item) => item.role === roleFilter)) return false;

      const isActive = member.isActive && member.employmentStatus === 'active';
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;
      return true;
    });
  }, [staffData?.data, search, roleFilter, selectedStoreId, statusFilter]);

  const selectedBusinessStores = useMemo(() => {
    const businessId = staffForm.businessId || selectedBusinessId;
    return businessId ? storesByBusiness.get(businessId) ?? [] : [];
  }, [selectedBusinessId, staffForm.businessId, storesByBusiness]);

  const editBusinessStores = useMemo(() => {
    return editForm.businessId ? storesByBusiness.get(editForm.businessId) ?? [] : [];
  }, [editForm.businessId, storesByBusiness]);

  const createStaffMut = useMutation({
    mutationFn: (body: typeof staffForm) => {
      if (!body.businessId) throw new Error('Chưa chọn doanh nghiệp');
      return api.post(`/platform/businesses/${body.businessId}/staff`, {
        fullName: body.fullName.trim(),
        ...(body.username.trim() && { username: body.username.trim() }),
        ...(body.email.trim() && { email: body.email.trim() }),
        ...(body.phone.trim() && { phone: body.phone.trim() }),
        ...(body.staffCode.trim() && { staffCode: body.staffCode.trim() }),
        role: body.role,
        password: body.password,
        primaryStoreId: body.primaryStoreId,
      }).then((res) => res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations-business-accounts-staff'] });
      qc.invalidateQueries({ queryKey: ['operations-business-accounts-stores'] });
      setAddOpen(false);
      setShowPassword(false);
      setStaffForm(EMPTY_STAFF_FORM);
    },
  });

  const updateStaffMut = useMutation({
    mutationFn: ({ staffId, businessId, body }: { staffId: string; businessId: string; body: object }) =>
      api.patch(`/platform/businesses/${businessId}/staff/${staffId}`, body).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations-business-accounts-staff'] });
      qc.invalidateQueries({ queryKey: ['operations-business-accounts-stores'] });
      setEditingMember(null);
      setShowEditPassword(false);
      setEditForm(EMPTY_EDIT_FORM);
    },
  });

  useEffect(() => {
    if (!addOpen) return;
    const businessId = staffForm.businessId || selectedBusinessId || businesses[0]?.id || '';
    if (!businessId) return;
    const businessStores = storesByBusiness.get(businessId) ?? [];
    const primaryStoreId = businessStores.some((store) => store.id === staffForm.primaryStoreId)
      ? staffForm.primaryStoreId
      : businessStores[0]?.id ?? '';
    setStaffForm((current) => ({ ...current, businessId, primaryStoreId }));
  }, [addOpen, businesses, selectedBusinessId, staffForm.businessId, staffForm.primaryStoreId, storesByBusiness]);

  const openAddModal = () => {
    const businessId = selectedBusinessId || businesses[0]?.id || '';
    const primaryStoreId = businessId ? storesByBusiness.get(businessId)?.[0]?.id ?? '' : '';
    setStaffForm({ ...EMPTY_STAFF_FORM, businessId, primaryStoreId });
    setShowPassword(false);
    setAddOpen(true);
  };

  const openEditModal = (member: StaffMember) => {
    const assignments = getAssignments(member);
    const primaryStoreId = member.primaryStoreId ?? assignments[0]?.storeId ?? '';
    setEditingMember(member);
    setDetailMember(null);
    setEditForm({
      businessId: member.businessId,
      fullName: member.fullName,
      username: member.username ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      staffCode: member.staffCode,
      password: '',
      primaryStoreId,
      isActive: member.isActive,
      employmentStatus: member.employmentStatus,
      storeRoles: assignments.map((item) => ({ storeId: item.storeId, role: item.role })),
    });
    setShowEditPassword(false);
  };

  const toggleEditStoreRole = (storeId: string, checked: boolean) => {
    setEditForm((current) => {
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

  const setEditStoreRole = (storeId: string, role: string) => {
    setEditForm((current) => ({
      ...current,
      storeRoles: current.storeRoles.map((item) => (item.storeId === storeId ? { ...item, role } : item)),
    }));
  };

  const refreshAll = () => {
    refetchBusinesses();
    refetchStores();
    refetchStaff();
  };

  const canCreateStaff = Boolean(
    staffForm.businessId &&
    staffForm.primaryStoreId &&
    staffForm.fullName.trim() &&
    staffForm.password.length >= 8,
  );

  const canSaveEdit = Boolean(
    editingMember &&
    editForm.businessId &&
    editForm.fullName.trim() &&
    editForm.staffCode.trim() &&
    editForm.primaryStoreId &&
    editForm.storeRoles.length > 0,
  );

  if (!canViewBusiness) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Tài khoản doanh nghiệp</h1>
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Bạn không có quyền xem dữ liệu doanh nghiệp.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tài khoản doanh nghiệp</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quản lý tài khoản nhân viên theo doanh nghiệp, cửa hàng, trạng thái và vai trò vận hành.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium transition hover:bg-muted"
          >
            <RefreshCw size={15} className={staffFetching || storesFetching ? 'animate-spin' : ''} />
            Làm mới
          </button>
          {canUpdateBusiness && (
            <button
              type="button"
              onClick={openAddModal}
              disabled={businesses.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              <UserPlus size={15} />
              Thêm tài khoản
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_180px_160px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Doanh nghiệp</label>
            <select
              value={selectedBusinessId}
              onChange={(event) => {
                setSelectedBusinessId(event.target.value);
                setSelectedStoreId('');
              }}
              className={INPUT}
              disabled={businessesLoading}
            >
              <option value="">Tất cả doanh nghiệp</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.legalName} ({business.businessCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Cửa hàng</label>
            <select
              value={selectedStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
              className={INPUT}
              disabled={storesLoading || stores.length === 0}
            >
              <option value="">Tất cả cửa hàng</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.storeName} ({selectedBusinessId ? store.storeCode : `${store.businessCode} / ${store.storeCode}`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tìm kiếm</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className={`${INPUT} pl-8`}
                placeholder="Tên, email, SĐT, mã NV"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Vai trò</label>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className={INPUT}
            >
              <option value="">Tất cả vai trò</option>
              {STAFF_ASSIGNMENT_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
              className={INPUT}
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Phạm vi</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">
            {selectedBusiness ? selectedBusiness.legalName : 'Tất cả doanh nghiệp'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Số cửa hàng</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{stores.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Tài khoản hiển thị</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{filteredStaff.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tài khoản</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Doanh nghiệp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cửa hàng / vai trò</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Đăng nhập gần nhất</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tạo lúc</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staffLoading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: 7 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <Users size={24} className="mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">Không có tài khoản phù hợp</p>
                    <p className="mt-1 text-xs text-muted-foreground">Thử thay đổi bộ lọc hoặc thêm tài khoản mới.</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const status = accountStatusLabel(member);
                  const assignments = getAssignments(member);
                  return (
                    <tr key={`${member.businessId}-${member.id}`} className="hover:bg-muted/20">
                      <td className="px-4 py-3.5 align-middle">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{member.fullName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{member.staffCode}</code>
                            {member.username && <span className="truncate text-xs text-muted-foreground">@{member.username}</span>}
                            {member.email && <span className="truncate text-xs text-muted-foreground">{member.email}</span>}
                            {member.phone && <span className="text-xs text-muted-foreground">{member.phone}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Building2 size={13} className="text-muted-foreground" />
                          <span className="truncate">{member.businessLegalName}</span>
                          <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-muted-foreground">{member.businessCode}</code>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        {assignments.length > 0 ? (
                          <div className="flex max-w-lg flex-wrap gap-1.5">
                            {assignments.slice(0, 3).map((item) => (
                              <span key={`${item.storeId}-${item.role}`} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                                <Store size={12} className="text-muted-foreground" />
                                {item.storeName}
                                <span className="text-muted-foreground">· {roleLabel(item.role)}</span>
                              </span>
                            ))}
                            {assignments.length > 3 && (
                              <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">+{assignments.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Chưa gán cửa hàng</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-xs text-muted-foreground">
                        {formatDateTime(member.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-xs text-muted-foreground">
                        {formatDateTime(member.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" className={ACTION_BUTTON} onClick={() => setDetailMember(member)} title="Xem chi tiết">
                            <Eye size={14} />
                          </button>
                          {canUpdateBusiness && (
                            <button type="button" className={ACTION_BUTTON} onClick={() => openEditModal(member)} title="Sửa / gán role">
                              <Edit2 size={14} />
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
      </div>

      {detailMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Chi tiết tài khoản</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{detailMember.businessLegalName}</p>
              </div>
              <button onClick={() => setDetailMember(null)} className="text-muted-foreground transition hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <InfoItem label="Họ và tên" value={detailMember.fullName} />
              <InfoItem label="Mã nhân viên" value={detailMember.staffCode} />
              <InfoItem label="Username" value={detailMember.username ?? '-'} />
              <InfoItem label="Email" value={detailMember.email ?? '-'} />
              <InfoItem label="Số điện thoại" value={detailMember.phone ?? '-'} />
              <InfoItem label="Trạng thái" value={accountStatusLabel(detailMember).label} />
              <InfoItem label="Đăng nhập gần nhất" value={formatDateTime(detailMember.lastLoginAt)} />
            </div>

            <div className="mt-4 rounded-md border border-border">
              <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">Cửa hàng và vai trò</div>
              <div className="divide-y divide-border">
                {getAssignments(detailMember).length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">Chưa gán cửa hàng.</div>
                ) : (
                  getAssignments(detailMember).map((item) => (
                    <div key={`${item.storeId}-${item.role}`} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.storeName}</p>
                        <p className="text-xs text-muted-foreground">{item.storeCode}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{roleLabel(item.role)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDetailMember(null)} className="rounded-md border border-input px-4 py-2 text-sm transition hover:bg-muted">
                Đóng
              </button>
              {canUpdateBusiness && (
                <button
                  type="button"
                  onClick={() => openEditModal(detailMember)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  <Edit2 size={14} />
                  Sửa tài khoản
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editingMember && canUpdateBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Sửa tài khoản doanh nghiệp</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{editingMember.businessLegalName}</p>
              </div>
              <button
                type="button"
                onClick={() => { setEditingMember(null); setEditForm(EMPTY_EDIT_FORM); }}
                className="text-muted-foreground transition hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Họ và tên *">
                  <input className={INPUT} value={editForm.fullName} onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))} />
                </Field>
                <Field label="Mã nhân viên *">
                  <input className={INPUT} value={editForm.staffCode} onChange={(event) => setEditForm((current) => ({ ...current, staffCode: event.target.value }))} />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Username">
                  <input className={INPUT} value={editForm.username} onChange={(event) => setEditForm((current) => ({ ...current, username: event.target.value }))} />
                </Field>
                <Field label="Email">
                  <input type="email" className={INPUT} value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Số điện thoại">
                  <input className={INPUT} value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} />
                </Field>
                <Field label="Mật khẩu mới">
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      className={`${INPUT} pr-9`}
                      value={editForm.password}
                      onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Để trống nếu không đổi"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword((value) => !value)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                      title={showEditPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showEditPassword ? <EyeOff size={15} /> : <KeyRound size={15} />}
                    </button>
                  </div>
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Khóa / mở tài khoản">
                  <select className={INPUT} value={editForm.isActive ? 'active' : 'locked'} onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.value === 'active' }))}>
                    <option value="active">Hoạt động</option>
                    <option value="locked">Khóa đăng nhập</option>
                  </select>
                </Field>
                <Field label="Tình trạng làm việc">
                  <select className={INPUT} value={editForm.employmentStatus} onChange={(event) => setEditForm((current) => ({ ...current, employmentStatus: event.target.value }))}>
                    {EMPLOYMENT_STATUSES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-primary" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Cửa hàng và vai trò *</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Một tài khoản có thể thuộc nhiều cửa hàng; vai trò có thể giống hoặc khác theo từng cửa hàng.
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-md border border-border">
                  {editBusinessStores.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground">Doanh nghiệp này chưa có cửa hàng.</div>
                  ) : (
                    editBusinessStores.map((store) => {
                      const assigned = editForm.storeRoles.some((item) => item.storeId === store.id);
                      const role = editForm.storeRoles.find((item) => item.storeId === store.id)?.role ?? 'staff';
                      return (
                        <div key={store.id} className="grid gap-3 border-b border-border px-3 py-3 last:border-b-0 md:grid-cols-[1fr_140px_180px] md:items-center">
                          <label className="flex min-w-0 items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={assigned}
                              onChange={(event) => toggleEditStoreRole(store.id, event.target.checked)}
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
                              checked={editForm.primaryStoreId === store.id}
                              disabled={!assigned}
                              onChange={() => setEditForm((current) => ({ ...current, primaryStoreId: store.id }))}
                            />
                            Cửa hàng chính
                          </label>
                          <select
                            className={INPUT}
                            value={role}
                            disabled={!assigned}
                            onChange={(event) => setEditStoreRole(store.id, event.target.value)}
                          >
                            {STAFF_ASSIGNMENT_ROLES.map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {updateStaffMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                {getApiErrorMessage(updateStaffMut.error, 'Không thể cập nhật tài khoản doanh nghiệp.')}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setEditingMember(null); setEditForm(EMPTY_EDIT_FORM); }}
                className="rounded-md border border-input px-4 py-2 text-sm transition hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingMember || !canSaveEdit) return;
                  const storeRoles = editForm.storeRoles.map((item) => ({ storeId: item.storeId, role: item.role }));
                  const primaryRole = storeRoles.find((item) => item.storeId === editForm.primaryStoreId)?.role ?? storeRoles[0]?.role ?? 'staff';
                  const memberRole = primaryRole === 'owner' ? 'admin' : primaryRole;
                  updateStaffMut.mutate({
                    businessId: editForm.businessId,
                    staffId: editingMember.id,
                    body: {
                      fullName: editForm.fullName.trim(),
                      staffCode: editForm.staffCode.trim(),
                      username: editForm.username.trim() || null,
                      email: editForm.email.trim() || null,
                      phone: editForm.phone.trim() || null,
                      role: memberRole,
                      primaryStoreId: editForm.primaryStoreId,
                      isActive: editForm.isActive,
                      employmentStatus: editForm.employmentStatus,
                      storeRoles,
                      ...(editForm.password.trim() && { password: editForm.password.trim() }),
                    },
                  });
                }}
                disabled={updateStaffMut.isPending || !canSaveEdit}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {updateStaffMut.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {addOpen && canUpdateBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Thêm tài khoản doanh nghiệp</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Chọn doanh nghiệp và cửa hàng ban đầu cho tài khoản.</p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="text-muted-foreground transition hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Doanh nghiệp *">
                <select
                  className={INPUT}
                  value={staffForm.businessId}
                  onChange={(event) => {
                    const businessId = event.target.value;
                    const firstStoreId = storesByBusiness.get(businessId)?.[0]?.id ?? '';
                    setStaffForm((current) => ({ ...current, businessId, primaryStoreId: firstStoreId }));
                  }}
                >
                  <option value="">Chọn doanh nghiệp</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.legalName} ({business.businessCode})
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Họ và tên *">
                  <input
                    className={INPUT}
                    value={staffForm.fullName}
                    onChange={(event) => setStaffForm((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Nguyễn Văn A"
                  />
                </Field>
                <Field label="Mã nhân viên">
                  <input
                    className={INPUT}
                    value={staffForm.staffCode}
                    onChange={(event) => setStaffForm((current) => ({ ...current, staffCode: event.target.value }))}
                    placeholder="Để trống để tự tạo"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Username">
                  <input
                    className={INPUT}
                    value={staffForm.username}
                    onChange={(event) => setStaffForm((current) => ({ ...current, username: event.target.value }))}
                    placeholder="nguyenvana"
                  />
                </Field>
                <Field label="Số điện thoại">
                  <input
                    className={INPUT}
                    value={staffForm.phone}
                    onChange={(event) => setStaffForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="0901234567"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <input
                    type="email"
                    className={INPUT}
                    value={staffForm.email}
                    onChange={(event) => setStaffForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="staff@business.vn"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Cửa hàng *">
                  <select
                    className={INPUT}
                    value={staffForm.primaryStoreId}
                    onChange={(event) => setStaffForm((current) => ({ ...current, primaryStoreId: event.target.value }))}
                    disabled={!staffForm.businessId}
                  >
                    <option value="">Chọn cửa hàng</option>
                    {selectedBusinessStores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.storeName} ({store.storeCode})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Vai trò ban đầu *">
                  <select
                    className={INPUT}
                    value={staffForm.role}
                    onChange={(event) => setStaffForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    {STAFF_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Mật khẩu *">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`${INPUT} pr-9`}
                    value={staffForm.password}
                    onChange={(event) => setStaffForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Tối thiểu 8 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>

              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Username, email và số điện thoại đăng nhập là duy nhất trên toàn hệ thống. Mã nhân viên là duy nhất trong doanh nghiệp.
              </div>
            </div>

            {createStaffMut.isError && (
              <p className="mt-3 text-xs text-destructive">
                {getApiErrorMessage(createStaffMut.error, 'Không thể tạo tài khoản doanh nghiệp.')}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-md border border-input px-4 py-2 text-sm transition hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => createStaffMut.mutate(staffForm)}
                disabled={createStaffMut.isPending || !canCreateStaff}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {createStaffMut.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
