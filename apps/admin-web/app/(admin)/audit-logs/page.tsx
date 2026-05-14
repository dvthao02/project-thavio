'use client';

import { useMemo, useState } from 'react';
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
  eventType: string;
  objectType: string;
  objectId: string | null;
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
  accounts: 'Tài khoản platform',
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
      return `acct:${shortId(data.account_id as string)} → biz:${shortId(data.business_id as string)}`;
    default:
      return shortId(log.recordId);
  }
}

function eventLabel(eventType: string) {
  const labels: Record<string, string> = {
    platform_login_success: 'Đăng nhập thành công',
    platform_login_failed: 'Đăng nhập thất bại',
    platform_logout: 'Đăng xuất',
    platform_impersonate_start: 'Bắt đầu hỗ trợ tenant',
    platform_impersonate_end: 'Kết thúc hỗ trợ tenant',
    platform_account_status_changed: 'Đổi trạng thái tài khoản',
    platform_mfa_reset: 'Reset MFA',
    platform_business_assigned: 'Gán nhân viên phụ trách',
    platform_subscription_plan_changed: 'Đổi gói dịch vụ',
    platform_export_requested: 'Xuất dữ liệu',
  };
  return labels[eventType] ?? eventType.replaceAll('_', ' ');
}

function objectTypeLabel(objectType: string) {
  const labels: Record<string, string> = {
    platform_auth: 'Xác thực admin',
    business: 'Doanh nghiệp',
    subscription: 'Gói dịch vụ',
    account: 'Tài khoản platform',
    role: 'Vai trò',
  };
  return labels[objectType] ?? objectType;
}

function eventActor(event: AuditEvent) {
  return payloadString(event.eventPayload, 'identifier') ?? shortId(event.accountId);
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
  const [eventType, setEventType] = useState('');
  const [objectId, setObjectId] = useState('');
  const [tableName, setTableName] = useState('');
  const [operation, setOperation] = useState<OperationFilter>('');
  const [recordId, setRecordId] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [eventPage, setEventPage] = useState(1);
  const [dataPage, setDataPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const eventParams = useMemo(
    () => ({
      page: eventPage,
      limit,
      eventType: eventType || undefined,
      objectId: objectId.trim() || undefined,
      from: toIsoDateTime(from),
      to: toIsoDateTime(to),
    }),
    [eventPage, eventType, from, limit, objectId, to],
  );

  const dataParams = useMemo(
    () => ({
      page: dataPage,
      limit,
      tableName: tableName || undefined,
      operation: operation || undefined,
      recordId: recordId.trim() || undefined,
      search: search.trim() || undefined,
      from: toIsoDateTime(from),
      to: toIsoDateTime(to),
    }),
    [dataPage, from, limit, operation, recordId, search, tableName, to],
  );

  const eventTypesQuery = useQuery<string[]>({
    queryKey: ['audit-event-types'],
    queryFn: () => api.get('/platform/audit-logs/event-types').then((res) => res.data),
    staleTime: 5 * 60_000,
  });

  const tableNamesQuery = useQuery<string[]>({
    queryKey: ['audit-log-table-names'],
    queryFn: () => api.get('/platform/audit-logs/table-names').then((res) => res.data),
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
  const start = total === 0 ? 0 : (activePage - 1) * limit + 1;
  const end = Math.min(activePage * limit, total);
  const isLoading = mode === 'events' ? eventsQuery.isLoading : logsQuery.isLoading;
  const isFetching = mode === 'events' ? eventsQuery.isFetching : logsQuery.isFetching;
  const isError = mode === 'events' ? eventsQuery.isError : logsQuery.isError;

  const updateFilter = (callback: () => void) => {
    callback();
    setEventPage(1);
    setDataPage(1);
    setSelectedEvent(null);
    setSelectedLog(null);
  };

  const clearFilters = () => {
    setEventType('');
    setObjectId('');
    setTableName('');
    setOperation('');
    setRecordId('');
    setSearch('');
    setFrom('');
    setTo('');
    setEventPage(1);
    setDataPage(1);
    setSelectedEvent(null);
    setSelectedLog(null);
  };

  const refresh = () => {
    if (mode === 'events') eventsQuery.refetch();
    else logsQuery.refetch();
  };

  const changeMode = (nextMode: AuditMode) => {
    setMode(nextMode);
    setSelectedEvent(null);
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
            Xem ai đã làm gì trong admin platform và dữ liệu nào đã thay đổi.
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
            Hoạt động admin
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
            ? 'Ghi nhận login, logout, impersonate, export và thao tác nghiệp vụ.'
            : 'Ghi nhận INSERT, UPDATE, DELETE ở database kèm oldData/newData.'}
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        {mode === 'events' ? (
          <>
            <label className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Activity size={13} />
                Hành động
              </span>
              <select
                value={eventType}
                onChange={(event) => updateFilter(() => setEventType(event.target.value))}
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
                <Search size={13} />
                ID đối tượng
              </span>
              <input
                value={objectId}
                onChange={(event) => updateFilter(() => setObjectId(event.target.value))}
                placeholder="Account, business, session..."
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
                value={tableName}
                onChange={(event) => updateFilter(() => setTableName(event.target.value))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Tất cả bảng</option>
                {(tableNamesQuery.data ?? []).map((name) => (
                  <option key={name} value={name}>
                    {name}
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
                value={operation}
                onChange={(event) => updateFilter(() => setOperation(event.target.value as OperationFilter))}
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
                Tìm kiếm
              </span>
              <input
                value={search}
                onChange={(event) => updateFilter(() => setSearch(event.target.value))}
                placeholder="Tên business, username, email..."
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
            value={from}
            onChange={(event) => updateFilter(() => setFrom(event.target.value))}
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
            value={to}
            onChange={(event) => updateFilter(() => setTo(event.target.value))}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <div className="flex items-end gap-2">
          <select
            value={limit}
            onChange={(event) => updateFilter(() => setLimit(Number(event.target.value)))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Số dòng mỗi trang"
          >
            <option value={25}>25 dòng</option>
            <option value={50}>50 dòng</option>
            <option value={100}>100 dòng</option>
          </select>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md border border-input px-3 text-sm font-medium transition hover:bg-muted"
          >
            <X size={15} />
            Xóa lọc
          </button>
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được nhật ký. Kiểm tra API audit và quyền `platform.audit.view`.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {mode === 'events' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Hành động</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tài khoản</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Đối tượng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">IP</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Đang tải hoạt động admin...
                  </td>
                </tr>
              ) : !eventsQuery.data?.data.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Activity size={34} className="mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Chưa có hoạt động nào được ghi nhận</p>
                    <p className="mt-1 text-xs text-muted-foreground">Login, logout, impersonate sẽ xuất hiện ở đây khi API ghi vào <code className="bg-muted px-1 rounded">audit_events</code></p>
                  </td>
                </tr>
              ) : (
                eventsQuery.data.data.map((event) => (
                  <tr
                    key={event.id}
                    className={`transition hover:bg-muted/20 ${selectedEvent?.id === event.id ? 'bg-primary/5' : ''}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <EventBadge eventType={event.eventType} />
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <p className="truncate text-sm font-medium text-foreground" title={eventActor(event)}>
                        {eventActor(event)}
                      </p>
                      <code className="block truncate text-xs text-muted-foreground" title={event.accountId ?? ''}>
                        {shortId(event.accountId)}
                      </code>
                    </td>
                    <td className="max-w-[280px] px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{objectTypeLabel(event.objectType)}</p>
                      <code className="block truncate text-xs text-muted-foreground" title={event.objectId ?? ''}>
                        {shortId(event.objectId)}
                      </code>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {payloadString(event.eventPayload, 'ipAddress') ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event);
                          setSelectedLog(null);
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
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Bảng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thao tác</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Record</th>
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

      {selectedEvent ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{formatDateTime(selectedEvent.createdAt)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <EventBadge eventType={selectedEvent.eventType} />
                <span className="text-sm text-muted-foreground">{objectTypeLabel(selectedEvent.objectType)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Đóng chi tiết"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-4 grid gap-3 text-xs md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Tài khoản</p>
              <p className="mt-1 font-medium text-foreground">{eventActor(selectedEvent)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Account ID</p>
              <code className="mt-1 block truncate rounded bg-muted px-2 py-1" title={selectedEvent.accountId ?? ''}>
                {selectedEvent.accountId ?? '-'}
              </code>
            </div>
            <div>
              <p className="text-muted-foreground">Object ID</p>
              <code className="mt-1 block truncate rounded bg-muted px-2 py-1" title={selectedEvent.objectId ?? ''}>
                {selectedEvent.objectId ?? '-'}
              </code>
            </div>
            <div>
              <p className="text-muted-foreground">IP</p>
              <p className="mt-1 font-medium text-foreground">
                {payloadString(selectedEvent.eventPayload, 'ipAddress') ?? '-'}
              </p>
            </div>
          </div>

          <JsonBlock title="Payload sự kiện" value={selectedEvent.eventPayload} />
        </div>
      ) : null}

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
              <p className="text-muted-foreground">Record ID</p>
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
