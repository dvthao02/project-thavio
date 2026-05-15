'use client';

import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  FileClock,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

type AuditMode = 'events' | 'data';
type Operation = 'INSERT' | 'UPDATE' | 'DELETE';
type OperationFilter = '' | Operation;

interface AuditEvent {
  id: string;
  businessId: string | null;
  accountId: string | null;
  accountName?: string | null;
  eventType: string;
  objectType: string;
  objectId: string | null;
  objectName?: string | null;
  eventPayload: Record<string, unknown>;
  createdAt: string;
}

interface AuditLog {
  id: string;
  eventTime: string;
  tableName: string;
  operation: Operation;
  recordId: string | null;
  changedBy: string | null;
  actorName: string | null;
  changedFields: string[] | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}

interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AuditEventResponse {
  data: AuditEvent[];
  meta: ListMeta;
}

interface AuditLogResponse {
  data: AuditLog[];
  meta: ListMeta;
}

interface AuditFilters {
  eventType: string;
  objectType: string;
  objectId: string;
  eventSearch: string;
  tableName: string;
  operation: OperationFilter;
  recordId: string;
  search: string;
  from: string;
  to: string;
  limit: number;
}

const DEFAULT_FILTERS: AuditFilters = {
  eventType: '',
  objectType: '',
  objectId: '',
  eventSearch: '',
  tableName: '',
  operation: '',
  recordId: '',
  search: '',
  from: '',
  to: '',
  limit: 50,
};

const EVENT_TONE: Record<string, string> = {
  platform_login_success: 'bg-emerald-500/10 text-emerald-700',
  platform_login_failed: 'bg-red-500/10 text-red-700',
  platform_logout: 'bg-slate-500/10 text-slate-700',
  platform_impersonate_start: 'bg-amber-500/10 text-amber-700',
  platform_impersonate_end: 'bg-amber-500/10 text-amber-700',
};

const OPERATION_CONFIG: Record<Operation, { label: string; cls: string }> = {
  INSERT: { label: 'Tạo mới', cls: 'bg-emerald-500/10 text-emerald-700' },
  UPDATE: { label: 'Cập nhật', cls: 'bg-sky-500/10 text-sky-700' },
  DELETE: { label: 'Xóa', cls: 'bg-red-500/10 text-red-700' },
};

function toIsoDateTime(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseBackendDateTime(value: string) {
  const normalized = value
    .trim()
    .replace(' ', 'T')
    .replace(/\.(\d{3})\d+/, '.$1')
    .replace(/([+-]\d{2})$/, '$1:00');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: string) {
  const date = parseBackendDateTime(value);
  if (!date) return value;
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function shortId(value?: string | null) {
  if (!value) return '-';
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function payloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

const TABLE_LABELS: Record<string, string> = {
  businesses: 'Doanh nghiệp',
  accounts: 'Tài khoản nền tảng',
  account_businesses: 'Phân công phụ trách',
  business_subscriptions: 'Gói dịch vụ',
};

function tableLabel(name: string) {
  return TABLE_LABELS[name] ?? name;
}

function recordLabel(log: AuditLog): string {
  const data = (log.newData ?? log.oldData) as Record<string, unknown> | null;
  if (!data) return shortId(log.recordId);
  switch (log.tableName) {
    case 'businesses':
      return (data.business_code as string) ?? (data.legal_name as string) ?? shortId(log.recordId);
    case 'accounts':
      return (data.username as string) ?? (data.full_name as string) ?? shortId(log.recordId);
    case 'account_businesses':
      return `TK:${shortId(data.account_id as string)} -> DN:${shortId(data.business_id as string)}`;
    default:
      return shortId(log.recordId);
  }
}

function eventLabel(eventType: string) {
  const labels: Record<string, string> = {
    platform_login_success: 'Đăng nhập',
    platform_login_failed: 'Đăng nhập',
    platform_logout: 'Đăng xuất',
    platform_impersonate_start: 'Hỗ trợ truy cập',
    platform_impersonate_end: 'Hỗ trợ truy cập',
    platform_account_status_changed: 'Đổi trạng thái tài khoản',
    platform_mfa_reset: 'Đặt lại MFA',
    platform_business_assigned: 'Gán nhân viên phụ trách',
    platform_subscription_plan_changed: 'Đổi gói dịch vụ',
    platform_export_requested: 'Xuất dữ liệu',
  };
  return labels[eventType] ?? eventType.replaceAll('_', ' ');
}

function objectTypeLabel(objectType: string) {
  const labels: Record<string, string> = {
    platform_auth: 'Xác thực quản trị',
    business: 'Doanh nghiệp',
    subscription: 'Gói dịch vụ',
    account: 'Tài khoản nền tảng',
    role: 'Vai trò',
  };
  return labels[objectType] ?? objectType;
}

function eventActor(event: AuditEvent) {
  return event.accountName ?? payloadString(event.eventPayload, 'identifier') ?? shortId(event.accountId);
}

function parseUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return { browser: '-', os: '-', deviceType: '-' };
  }

  const browser =
    /Edg\/([\d.]+)/i.test(userAgent)
      ? `Edge ${RegExp.$1}`
      : /OPR\/([\d.]+)/i.test(userAgent)
        ? `Opera ${RegExp.$1}`
        : /Chrome\/([\d.]+)/i.test(userAgent)
          ? `Chrome ${RegExp.$1}`
          : /Firefox\/([\d.]+)/i.test(userAgent)
            ? `Firefox ${RegExp.$1}`
            : /Version\/([\d.]+).*Safari/i.test(userAgent)
              ? `Safari ${RegExp.$1}`
              : 'Unknown';

  const os =
    /Windows NT 10\.0/i.test(userAgent)
      ? 'Windows 10'
      : /Windows NT 6\.3/i.test(userAgent)
        ? 'Windows 8.1'
        : /Windows NT 6\.1/i.test(userAgent)
          ? 'Windows 7'
          : /Mac OS X ([\d_]+)/i.test(userAgent)
            ? `macOS ${RegExp.$1.replaceAll('_', '.')}`
            : /Android ([\d.]+)/i.test(userAgent)
              ? `Android ${RegExp.$1}`
              : /iPhone OS ([\d_]+)/i.test(userAgent)
                ? `iOS ${RegExp.$1.replaceAll('_', '.')}`
                : /Linux/i.test(userAgent)
                  ? 'Linux'
                  : 'Unknown';

  const deviceType = /Mobile|iPhone|Android/i.test(userAgent)
    ? 'Mobile'
    : /iPad|Tablet/i.test(userAgent)
      ? 'Tablet'
      : 'Desktop';

  return { browser, os, deviceType };
}

function eventUserAgent(event: AuditEvent) {
  return payloadString(event.eventPayload, 'userAgent');
}

function eventDevice(event: AuditEvent) {
  const parsed = parseUserAgent(eventUserAgent(event));
  if (parsed.browser === '-' && parsed.os === '-') return '-';
  return `${parsed.deviceType} • ${parsed.browser} • ${parsed.os}`;
}

function eventBrowser(event: AuditEvent) {
  return parseUserAgent(eventUserAgent(event)).browser;
}

function eventOs(event: AuditEvent) {
  return parseUserAgent(eventUserAgent(event)).os;
}

function eventResult(event: AuditEvent) {
  if (event.eventType === 'platform_impersonate_start') return 'Bắt đầu';
  if (event.eventType === 'platform_impersonate_end') return 'Kết thúc';
  if (event.eventType.includes('failed')) return 'Thất bại';
  if (event.eventType.includes('success') || event.eventType === 'platform_logout') return 'Thành công';
  return 'Thông tin';
}

function eventFailureReason(event: AuditEvent) {
  const reason = payloadString(event.eventPayload, 'reason');
  if (!reason) return '-';

  const labels: Record<string, string> = {
    account_not_found: 'Không tìm thấy tài khoản',
    not_platform_admin: 'Không có quyền quản trị nền tảng',
    account_not_active: 'Tài khoản chưa kích hoạt',
    invalid_password: 'Sai mật khẩu',
  };
  return labels[reason] ?? reason;
}

function eventLoginMethod(event: AuditEvent) {
  return payloadString(event.eventPayload, 'loginMethod')
    ?? (event.eventType.startsWith('platform_login_') ? 'Password' : '-');
}

function eventRequestId(event: AuditEvent) {
  return payloadString(event.eventPayload, 'requestId') ?? '-';
}

function eventSessionId(event: AuditEvent) {
  return payloadString(event.eventPayload, 'sessionId') ?? '-';
}

function EventBadge({ eventType }: { eventType: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        EVENT_TONE[eventType] ?? 'bg-primary/10 text-primary'
      }`}
    >
      {eventLabel(eventType)}
    </span>
  );
}

function OperationBadge({ operation }: { operation: Operation }) {
  const config = OPERATION_CONFIG[operation];
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
}

function JsonBlock({ title, value }: { title: string; value: Record<string, unknown> | null }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</h3>
      <pre className="max-h-[320px] overflow-auto rounded-md border border-border bg-slate-950 p-3 text-xs leading-5 text-slate-100">
        {value ? JSON.stringify(value, null, 2) : 'null'}
      </pre>
    </div>
  );
}

function FieldList({ fields }: { fields: string[] | null }) {
  if (!fields?.length) return <span className="text-xs text-muted-foreground">-</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {fields.slice(0, 5).map((field) => (
        <span key={field} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {field}
        </span>
      ))}
      {fields.length > 5 ? (
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">+{fields.length - 5}</span>
      ) : null}
    </div>
  );
}

export default function AuditLogsPage() {
  const [mode, setMode] = useState<AuditMode>('events');
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [eventPage, setEventPage] = useState(1);
  const [dataPage, setDataPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [payloadOpenEventId, setPayloadOpenEventId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const setDraftFilter = <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const invalidTimeRange = useMemo(() => {
    const fromIso = toIsoDateTime(draftFilters.from);
    const toIso = toIsoDateTime(draftFilters.to);
    if (!fromIso || !toIso) return false;
    return new Date(fromIso) > new Date(toIso);
  }, [draftFilters.from, draftFilters.to]);

  const eventParams = useMemo(
    () => ({
      page: eventPage,
      limit: filters.limit,
      eventType: filters.eventType || undefined,
      objectType: filters.objectType || undefined,
      objectId: filters.objectId.trim() || undefined,
      search: filters.eventSearch.trim() || undefined,
      from: toIsoDateTime(filters.from),
      to: toIsoDateTime(filters.to),
    }),
    [eventPage, filters],
  );

  const dataParams = useMemo(
    () => ({
      page: dataPage,
      limit: filters.limit,
      tableName: filters.tableName || undefined,
      operation: filters.operation || undefined,
      recordId: filters.recordId.trim() || undefined,
      search: filters.search.trim() || undefined,
      from: toIsoDateTime(filters.from),
      to: toIsoDateTime(filters.to),
    }),
    [dataPage, filters],
  );

  const eventTypesQuery = useQuery<string[]>({
    queryKey: ['audit-event-types'],
    queryFn: () => api.get('/platform/audit-logs/event-types').then((res) => res.data),
    enabled: mode === 'events',
    staleTime: 5 * 60_000,
  });

  const objectTypesQuery = useQuery<string[]>({
    queryKey: ['audit-object-types'],
    queryFn: () => api.get('/platform/audit-logs/object-types').then((res) => res.data),
    enabled: mode === 'events',
    staleTime: 5 * 60_000,
  });

  const tableNamesQuery = useQuery<string[]>({
    queryKey: ['audit-log-table-names'],
    queryFn: () => api.get('/platform/audit-logs/table-names').then((res) => res.data),
    enabled: mode === 'data',
    staleTime: 5 * 60_000,
  });

  const eventsQuery = useQuery<AuditEventResponse>({
    queryKey: ['audit-events', eventParams],
    queryFn: () => api.get('/platform/audit-logs/events', { params: eventParams }).then((res) => res.data),
    enabled: mode === 'events',
    placeholderData: (prev) => prev,
  });

  const logsQuery = useQuery<AuditLogResponse>({
    queryKey: ['audit-logs', dataParams],
    queryFn: () => api.get('/platform/audit-logs', { params: dataParams }).then((res) => res.data),
    enabled: mode === 'data',
    placeholderData: (prev) => prev,
  });

  const activeMeta = mode === 'events' ? eventsQuery.data?.meta : logsQuery.data?.meta;
  const activePage = mode === 'events' ? eventPage : dataPage;
  const total = activeMeta?.total ?? 0;
  const totalPages = activeMeta?.totalPages ?? 1;
  const start = total === 0 ? 0 : (activePage - 1) * filters.limit + 1;
  const end = Math.min(activePage * filters.limit, total);
  const isLoading = mode === 'events' ? eventsQuery.isLoading : logsQuery.isLoading;
  const isFetching = mode === 'events' ? eventsQuery.isFetching : logsQuery.isFetching;
  const isError = mode === 'events' ? eventsQuery.isError : logsQuery.isError;

  const applyFilters = () => {
    if (invalidTimeRange) return;
    setFilters(draftFilters);
    setEventPage(1);
    setDataPage(1);
    setSelectedEvent(null);
    setPayloadOpenEventId(null);
    setSelectedLog(null);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setEventPage(1);
    setDataPage(1);
    setSelectedEvent(null);
    setPayloadOpenEventId(null);
    setSelectedLog(null);
  };

  const refresh = () => {
    if (mode === 'events') eventsQuery.refetch();
    else logsQuery.refetch();
  };

  const changeMode = (nextMode: AuditMode) => {
    setMode(nextMode);
    setSelectedEvent(null);
    setPayloadOpenEventId(null);
    setSelectedLog(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileClock size={20} className="text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Nhật ký hoạt động</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Xem ai đã thao tác trong trang quản trị và dữ liệu nào đã thay đổi.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => changeMode('events')}
            className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition ${
              mode === 'events' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Activity size={15} />
            Hoạt động quản trị
          </button>
          <button
            type="button"
            onClick={() => changeMode('data')}
            className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition ${
              mode === 'data' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Database size={15} />
            Dữ liệu thay đổi
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {mode === 'events'
            ? 'Ghi nhận đăng nhập, đăng xuất, hỗ trợ truy cập, xuất dữ liệu và thao tác nghiệp vụ.'
            : 'Ghi nhận tạo mới, cập nhật, xóa dữ liệu kèm dữ liệu cũ và mới.'}
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {mode === 'events' ? (
            <>
              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Activity size={13} />
                  Hành động
                </span>
                <select
                  value={draftFilters.eventType}
                  onChange={(event) => setDraftFilter('eventType', event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Tất cả hành động</option>
                  {(eventTypesQuery.data ?? []).map((name) => (
                    <option key={name} value={name}>
                      {eventLabel(name)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ShieldAlert size={13} />
                  Đối tượng
                </span>
                <select
                  value={draftFilters.objectType}
                  onChange={(event) => setDraftFilter('objectType', event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Tất cả đối tượng</option>
                  {(objectTypesQuery.data ?? []).map((name) => (
                    <option key={name} value={name}>
                      {objectTypeLabel(name)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Search size={13} />
                  ID đối tượng
                </span>
                <input
                  value={draftFilters.objectId}
                  onChange={(event) => setDraftFilter('objectId', event.target.value)}
                  placeholder="Tài khoản, doanh nghiệp, phiên..."
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Search size={13} />
                  Tìm trong payload
                </span>
                <input
                  value={draftFilters.eventSearch}
                  onChange={(event) => setDraftFilter('eventSearch', event.target.value)}
                  placeholder="identifier, ip, requestId..."
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </>
          ) : (
            <>
              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Database size={13} />
                  Bảng dữ liệu
                </span>
                <select
                  value={draftFilters.tableName}
                  onChange={(event) => setDraftFilter('tableName', event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Tất cả bảng</option>
                  {(tableNamesQuery.data ?? []).map((name) => (
                    <option key={name} value={name}>
                      {tableLabel(name)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ShieldAlert size={13} />
                  Thao tác
                </span>
                <select
                  value={draftFilters.operation}
                  onChange={(event) => setDraftFilter('operation', event.target.value as OperationFilter)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Tất cả thao tác</option>
                  <option value="INSERT">Tạo mới</option>
                  <option value="UPDATE">Cập nhật</option>
                  <option value="DELETE">Xóa</option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Search size={13} />
                  Record ID
                </span>
                <input
                  value={draftFilters.recordId}
                  onChange={(event) => setDraftFilter('recordId', event.target.value)}
                  placeholder="UUID bản ghi"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Search size={13} />
                  Tìm kiếm
                </span>
                <input
                  value={draftFilters.search}
                  onChange={(event) => setDraftFilter('search', event.target.value)}
                  placeholder="Tên doanh nghiệp, tên đăng nhập, email..."
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </>
          )}

          <label className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter size={13} />
              Từ thời điểm
            </span>
            <input
              type="datetime-local"
              value={draftFilters.from}
              onChange={(event) => setDraftFilter('from', event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter size={13} />
              Đến thời điểm
            </span>
            <input
              type="datetime-local"
              value={draftFilters.to}
              onChange={(event) => setDraftFilter('to', event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-end gap-2">
            <select
              value={draftFilters.limit}
              onChange={(event) => setDraftFilter('limit', Number(event.target.value))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Số dòng mỗi trang"
            >
              <option value={25}>25 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
            <button
              type="button"
              onClick={applyFilters}
              disabled={invalidTimeRange}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Filter size={15} />
              Áp dụng
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md border border-input px-3 text-sm font-medium transition hover:bg-muted"
            >
              <X size={15} />
              Xóa lọc
            </button>
          </div>
          {invalidTimeRange ? (
            <p className="text-xs text-destructive">Khoảng thời gian không hợp lệ: "Từ" phải trước "Đến".</p>
          ) : (
            <p className="text-xs text-muted-foreground">Nhập bộ lọc và bấm "Áp dụng" để tải dữ liệu.</p>
          )}
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được nhật ký. Kiểm tra API audit và quyền `platform.audit.view`.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
        {mode === 'events' ? (
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tài khoản</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thao tác</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Kết quả</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">IP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thiết bị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Đang tải hoạt động quản trị...
                  </td>
                </tr>
              ) : !eventsQuery.data?.data.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Activity size={34} className="mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Chưa có hoạt động nào được ghi nhận</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Đăng nhập, đăng xuất và hỗ trợ truy cập sẽ xuất hiện ở đây khi API ghi nhận sự kiện.
                    </p>
                  </td>
                </tr>
              ) : (
                eventsQuery.data.data.map((event) => {
                  const isOpen = selectedEvent?.id === event.id;
                  return (
                    <Fragment key={event.id}>
                      <tr
                        onClick={() => {
                          const isSameEvent = selectedEvent?.id === event.id;
                          setSelectedEvent(isSameEvent ? null : event);
                          setPayloadOpenEventId(null);
                          setSelectedLog(null);
                        }}
                        className={`cursor-pointer transition hover:bg-muted/20 ${isOpen ? 'bg-primary/5' : ''}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {formatDateTime(event.createdAt)}
                        </td>
                        <td className="max-w-[260px] px-4 py-3">
                          <p className="truncate text-sm font-medium text-foreground" title={eventActor(event)}>
                            {eventActor(event)}
                          </p>
                          <code className="block truncate text-xs text-muted-foreground" title={event.accountId ?? ''}>
                            {shortId(event.accountId)}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <EventBadge eventType={event.eventType} />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              eventResult(event) === 'Thành công'
                                ? 'bg-emerald-500/10 text-emerald-700'
                                : eventResult(event) === 'Thất bại'
                                  ? 'bg-red-500/10 text-red-700'
                                  : 'bg-slate-500/10 text-slate-700'
                            }`}
                          >
                            {eventResult(event)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {payloadString(event.eventPayload, 'ipAddress') ?? '-'}
                        </td>
                        <td className="max-w-[280px] px-4 py-3 text-xs text-muted-foreground">
                          <p className="truncate" title={eventDevice(event)}>
                            {eventDevice(event)}
                          </p>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="bg-muted/15">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="rounded-lg border border-border bg-card p-4">
                              <div className="mb-3 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(null);
                                    setPayloadOpenEventId(null);
                                  }}
                                  className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                  aria-label="Đóng chi tiết"
                                >
                                  <X size={16} />
                                </button>
                              </div>

                              <div className="mb-4 grid gap-3 text-xs md:grid-cols-2 xl:grid-cols-3">
                                <div>
                                  <p className="text-muted-foreground">Đối tượng</p>
                                  <p className="mt-1 font-medium text-foreground">{objectTypeLabel(event.objectType)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Browser</p>
                                  <p className="mt-1 font-medium text-foreground">{eventBrowser(event)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">OS</p>
                                  <p className="mt-1 font-medium text-foreground">{eventOs(event)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Login method</p>
                                  <p className="mt-1 font-medium text-foreground">{eventLoginMethod(event)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Request ID</p>
                                  <code className="mt-1 block truncate rounded bg-muted px-2 py-1" title={eventRequestId(event)}>
                                    {eventRequestId(event)}
                                  </code>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Session ID</p>
                                  <code className="mt-1 block truncate rounded bg-muted px-2 py-1" title={eventSessionId(event)}>
                                    {eventSessionId(event)}
                                  </code>
                                </div>
                                <div className="md:col-span-2 xl:col-span-2">
                                  <p className="text-muted-foreground">Failure reason</p>
                                  <p className="mt-1 font-medium text-foreground">{eventFailureReason(event)}</p>
                                </div>
                              </div>

                              <div className="border-t border-border pt-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPayloadOpenEventId((current) => (current === event.id ? null : event.id))
                                  }
                                  className="inline-flex items-center gap-2 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                                >
                                  <ChevronRight
                                    size={14}
                                    className={`transition-transform ${payloadOpenEventId === event.id ? 'rotate-90' : ''}`}
                                  />
                                  Payload sự kiện
                                </button>
                                {payloadOpenEventId === event.id ? (
                                  <div className="mt-3">
                                    <JsonBlock title="Payload sự kiện" value={event.eventPayload} />
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Bảng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thao tác</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Bản ghi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Người đổi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Trường đổi</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Đang tải dữ liệu thay đổi...
                  </td>
                </tr>
              ) : !logsQuery.data?.data.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <FileClock size={34} className="mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Không có dữ liệu thay đổi phù hợp bộ lọc</p>
                  </td>
                </tr>
              ) : (
                logsQuery.data.data.map((log) => (
                  <tr
                    key={log.id}
                    className={`transition hover:bg-muted/20 ${selectedLog?.id === log.id ? 'bg-primary/5' : ''}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(log.eventTime)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-foreground">{tableLabel(log.tableName)}</span>
                      <code className="mt-0.5 block text-xs text-muted-foreground">{log.tableName}</code>
                    </td>
                    <td className="px-4 py-3">
                      <OperationBadge operation={log.operation} />
                    </td>
                    <td className="max-w-[210px] px-4 py-3">
                      <span className="block text-xs font-medium text-foreground">{recordLabel(log)}</span>
                      <code className="block truncate text-xs text-muted-foreground" title={log.recordId ?? ''}>
                        {shortId(log.recordId)}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-xs font-medium text-foreground">{log.actorName ?? log.changedBy ?? '-'}</span>
                      {log.actorName && log.changedBy !== log.actorName && (
                        <code className="block text-xs text-muted-foreground">{shortId(log.changedBy)}</code>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <FieldList fields={log.changedFields} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLog(log);
                          setSelectedEvent(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted"
                      >
                        <Eye size={14} />
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Hiển thị {start}-{end} / {total} bản ghi
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                mode === 'events'
                  ? setEventPage((value) => Math.max(1, value - 1))
                  : setDataPage((value) => Math.max(1, value - 1))
              }
              disabled={activePage <= 1}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Trước
            </button>
            <span className="text-xs text-muted-foreground">
              Trang {activePage} / {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              onClick={() =>
                mode === 'events' ? setEventPage((value) => value + 1) : setDataPage((value) => value + 1)
              }
              disabled={activePage >= totalPages}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-40"
            >
              Sau
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {selectedLog ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{formatDateTime(selectedLog.eventTime)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <OperationBadge operation={selectedLog.operation} />
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{selectedLog.tableName}</code>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Đóng chi tiết"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-4 grid gap-3 text-xs md:grid-cols-3">
            <div>
              <p className="text-muted-foreground">ID bản ghi</p>
              <code className="mt-1 block truncate rounded bg-muted px-2 py-1" title={selectedLog.recordId ?? ''}>
                {selectedLog.recordId ?? '-'}
              </code>
            </div>
            <div>
              <p className="text-muted-foreground">Người đổi</p>
              <p className="mt-1 font-medium text-foreground">{selectedLog.actorName ?? selectedLog.changedBy ?? '-'}</p>
              {selectedLog.actorName && selectedLog.changedBy !== selectedLog.actorName && (
                <code className="mt-0.5 block text-xs text-muted-foreground">{shortId(selectedLog.changedBy)}</code>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Trường thay đổi</p>
              <div className="mt-1">
                <FieldList fields={selectedLog.changedFields} />
              </div>
            </div>
          </div>

          {selectedLog.operation === 'UPDATE' && selectedLog.changedFields?.length ? (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-1/4">Trường</th>
                    <th className="px-3 py-2 text-left font-medium text-red-600 w-[37.5%]">Giá trị cũ</th>
                    <th className="px-3 py-2 text-left font-medium text-emerald-700 w-[37.5%]">Giá trị mới</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedLog.changedFields.map((field) => (
                    <tr key={field} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono text-muted-foreground">{field}</td>
                      <td className="px-3 py-2 font-mono text-red-700 break-all">
                        {selectedLog.oldData?.[field] !== undefined
                          ? String(selectedLog.oldData[field] ?? 'null')
                          : '-'}
                      </td>
                      <td className="px-3 py-2 font-mono text-emerald-700 break-all">
                        {selectedLog.newData?.[field] !== undefined
                          ? String(selectedLog.newData[field] ?? 'null')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : selectedLog.operation === 'INSERT' ? (
            <JsonBlock title="Dữ liệu tạo mới" value={selectedLog.newData} />
          ) : selectedLog.operation === 'DELETE' ? (
            <JsonBlock title="Dữ liệu đã xóa" value={selectedLog.oldData} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <JsonBlock title="Dữ liệu cũ" value={selectedLog.oldData} />
              <JsonBlock title="Dữ liệu mới" value={selectedLog.newData} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

