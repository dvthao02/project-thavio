'use client';

import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Download,
  Eye,
  Filter,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

type AuditMode = 'events' | 'data';
type Operation = 'INSERT' | 'UPDATE' | 'DELETE';
type OperationFilter = '' | Operation;
type EventPeriod = 'today' | '7d' | '30d' | 'custom';
type EventResultFilter = '' | 'success' | 'failed' | 'info';

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

interface EventFilters {
  search: string;
  eventType: string;
  objectType: string;
  objectId: string;
  result: EventResultFilter;
  from: string;
  to: string;
  period: EventPeriod;
  limit: number;
}

interface DataFilters {
  tableName: string;
  operation: OperationFilter;
  recordId: string;
  search: string;
  from: string;
  to: string;
  limit: number;
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

const RESULT_TONE: Record<Exclude<EventResultFilter, ''> | 'default', string> = {
  success: 'bg-emerald-500/10 text-emerald-700',
  failed: 'bg-red-500/10 text-red-700',
  info: 'bg-slate-500/10 text-slate-700',
  default: 'bg-primary/10 text-primary',
};

const TABLE_LABELS: Record<string, string> = {
  businesses: 'Doanh nghiệp',
  accounts: 'Tài khoản nền tảng',
  account_businesses: 'Phân công phụ trách',
  business_subscriptions: 'Gói dịch vụ',
};

function toIsoDateTime(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toLocalDateTimeInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getPresetRange(period: Exclude<EventPeriod, 'custom'>) {
  const now = new Date();
  const from = new Date(now);
  from.setSeconds(0, 0);

  if (period === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (period === '7d') {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
  }

  return {
    from: toLocalDateTimeInput(from),
    to: toLocalDateTimeInput(now),
  };
}

function createDefaultEventFilters(): EventFilters {
  const range = getPresetRange('today');
  return {
    search: '',
    eventType: '',
    objectType: '',
    objectId: '',
    result: '',
    period: 'today',
    from: range.from,
    to: range.to,
    limit: 50,
  };
}

function createDefaultDataFilters(): DataFilters {
  return {
    tableName: '',
    operation: '',
    recordId: '',
    search: '',
    from: '',
    to: '',
    limit: 50,
  };
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
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

function payloadNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function trimOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function isInvalidRange(from: string, to: string) {
  const fromIso = toIsoDateTime(from);
  const toIso = toIsoDateTime(to);
  if (!fromIso || !toIso) return false;
  return new Date(fromIso) > new Date(toIso);
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
  if (!userAgent) return { browser: '-', os: '-', deviceType: '-' };

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

function eventResultKey(event: AuditEvent): Exclude<EventResultFilter, ''> {
  if (event.eventType.includes('failed')) return 'failed';
  if (
    event.eventType.includes('success')
    || event.eventType === 'platform_logout'
    || event.eventType === 'platform_impersonate_start'
    || event.eventType === 'platform_impersonate_end'
  ) {
    return 'success';
  }
  return 'info';
}

function eventResultLabel(event: AuditEvent) {
  const key = eventResultKey(event);
  if (key === 'success') return 'Thành công';
  if (key === 'failed') return 'Thất bại';
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

function eventEndpoint(event: AuditEvent) {
  return payloadString(event.eventPayload, 'endpoint')
    ?? payloadString(event.eventPayload, 'path')
    ?? payloadString(event.eventPayload, 'route')
    ?? '-';
}

function eventResponseCode(event: AuditEvent) {
  const code = payloadNumber(event.eventPayload, 'statusCode')
    ?? payloadNumber(event.eventPayload, 'responseCode');
  return code ?? '-';
}

function tableLabel(tableName: string) {
  return TABLE_LABELS[tableName] ?? tableName;
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
      return `TK:${shortId(data.account_id as string)} → DN:${shortId(data.business_id as string)}`;
    default:
      return shortId(log.recordId);
  }
}

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages: Array<number | 'left-gap' | 'right-gap'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('left-gap');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push('right-gap');

  pages.push(totalPages);
  return pages;
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

function ResultBadge({ event }: { event: AuditEvent }) {
  const result = eventResultKey(event);
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${RESULT_TONE[result]}`}>
      {eventResultLabel(event)}
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

function FieldChips({ fields }: { fields: string[] | null }) {
  if (!fields?.length) return <span className="text-xs text-muted-foreground">-</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {fields.slice(0, 5).map((field) => (
        <span key={field} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {field}
        </span>
      ))}
      {fields.length > 5 ? (
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          +{fields.length - 5}
        </span>
      ) : null}
    </div>
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

function FilterChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs text-foreground">
      {label}
    </span>
  );
}

function EventDetail({
  event,
  payloadOpen,
  onTogglePayload,
  onClose,
  onCopyPayload,
}: {
  event: AuditEvent;
  payloadOpen: boolean;
  onTogglePayload: () => void;
  onClose: () => void;
  onCopyPayload: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground" title={event.id}>
            Sự kiện: {shortId(event.id)} • {objectTypeLabel(event.objectType)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Đóng chi tiết"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Thông tin truy cập</p>
          <p className="mt-2 font-medium text-foreground">IP: {payloadString(event.eventPayload, 'ipAddress') ?? '-'}</p>
          <p className="mt-1 text-muted-foreground">Thiết bị: {parseUserAgent(eventUserAgent(event)).deviceType}</p>
          <p className="mt-1 text-muted-foreground">Browser: {eventBrowser(event)}</p>
          <p className="mt-1 text-muted-foreground">OS: {eventOs(event)}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Thông tin phiên</p>
          <p className="mt-2 font-medium text-foreground">Login method: {eventLoginMethod(event)}</p>
          <p className="mt-1 text-muted-foreground">Session ID</p>
          <code className="mt-1 block truncate rounded bg-muted px-2 py-1 text-xs" title={eventSessionId(event)}>
            {eventSessionId(event)}
          </code>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Thông tin kỹ thuật</p>
          <p className="mt-2 text-muted-foreground">Request ID</p>
          <code className="mt-1 block truncate rounded bg-muted px-2 py-1 text-xs" title={eventRequestId(event)}>
            {eventRequestId(event)}
          </code>
          <p className="mt-2 text-muted-foreground">Endpoint: {eventEndpoint(event)}</p>
          <p className="mt-1 text-muted-foreground">Response code: {eventResponseCode(event)}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Khác</p>
          <p className="mt-2 font-medium text-foreground">Đối tượng: {objectTypeLabel(event.objectType)}</p>
          <p className="mt-1 text-muted-foreground">Object ID: {shortId(event.objectId)}</p>
          <p className="mt-1 text-muted-foreground">Lý do lỗi: {eventFailureReason(event)}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTogglePayload}
            className="inline-flex items-center gap-2 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            <ChevronRight size={14} className={`transition-transform ${payloadOpen ? 'rotate-90' : ''}`} />
            Payload (JSON)
          </button>
          <button
            type="button"
            onClick={onCopyPayload}
            className="inline-flex items-center gap-2 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            <Copy size={14} />
            Sao chép
          </button>
        </div>
        {payloadOpen ? (
          <pre className="mt-3 max-h-[320px] overflow-auto rounded-md border border-border bg-slate-950 p-3 text-xs leading-5 text-slate-100">
            {JSON.stringify(event.eventPayload, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const [mode, setMode] = useState<AuditMode>('events');

  const [eventFilters, setEventFilters] = useState<EventFilters>(() => createDefaultEventFilters());
  const [eventDraft, setEventDraft] = useState<EventFilters>(() => createDefaultEventFilters());
  const [dataFilters, setDataFilters] = useState<DataFilters>(() => createDefaultDataFilters());
  const [dataDraft, setDataDraft] = useState<DataFilters>(() => createDefaultDataFilters());

  const [eventPage, setEventPage] = useState(1);
  const [dataPage, setDataPage] = useState(1);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [payloadOpenEventId, setPayloadOpenEventId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const [eventAdvancedOpen, setEventAdvancedOpen] = useState(false);
  const [dataAdvancedOpen, setDataAdvancedOpen] = useState(false);

  const eventRangeInvalid = useMemo(
    () => isInvalidRange(eventDraft.from, eventDraft.to),
    [eventDraft.from, eventDraft.to],
  );
  const dataRangeInvalid = useMemo(
    () => isInvalidRange(dataDraft.from, dataDraft.to),
    [dataDraft.from, dataDraft.to],
  );

  const eventParams = useMemo(
    () => ({
      page: eventPage,
      limit: eventFilters.limit,
      eventType: eventFilters.eventType || undefined,
      objectType: eventFilters.objectType || undefined,
      objectId: trimOrUndefined(eventFilters.objectId),
      search: trimOrUndefined(eventFilters.search),
      from: toIsoDateTime(eventFilters.from),
      to: toIsoDateTime(eventFilters.to),
    }),
    [eventPage, eventFilters],
  );

  const dataParams = useMemo(
    () => ({
      page: dataPage,
      limit: dataFilters.limit,
      tableName: dataFilters.tableName || undefined,
      operation: dataFilters.operation || undefined,
      recordId: trimOrUndefined(dataFilters.recordId),
      search: trimOrUndefined(dataFilters.search),
      from: toIsoDateTime(dataFilters.from),
      to: toIsoDateTime(dataFilters.to),
    }),
    [dataPage, dataFilters],
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
    placeholderData: (previous) => previous,
  });

  const logsQuery = useQuery<AuditLogResponse>({
    queryKey: ['audit-logs', dataParams],
    queryFn: () => api.get('/platform/audit-logs', { params: dataParams }).then((res) => res.data),
    enabled: mode === 'data',
    placeholderData: (previous) => previous,
  });

  const eventRows = useMemo(() => {
    const rows = eventsQuery.data?.data ?? [];
    if (!eventFilters.result) return rows;
    return rows.filter((event) => eventResultKey(event) === eventFilters.result);
  }, [eventsQuery.data?.data, eventFilters.result]);

  const activeMeta = mode === 'events' ? eventsQuery.data?.meta : logsQuery.data?.meta;
  const activePage = mode === 'events' ? eventPage : dataPage;
  const activeLimit = mode === 'events' ? eventFilters.limit : dataFilters.limit;
  const total = activeMeta?.total ?? 0;
  const totalPages = Math.max(activeMeta?.totalPages ?? 1, 1);
  const start = total === 0 ? 0 : (activePage - 1) * activeLimit + 1;
  const end = Math.min(activePage * activeLimit, total);

  const isLoading = mode === 'events' ? eventsQuery.isLoading : logsQuery.isLoading;
  const isFetching = mode === 'events' ? eventsQuery.isFetching : logsQuery.isFetching;
  const isError = mode === 'events' ? eventsQuery.isError : logsQuery.isError;

  const pageItems = useMemo(() => buildPageItems(activePage, totalPages), [activePage, totalPages]);

  const applyEventFilters = () => {
    const prepared = eventDraft.period === 'custom'
      ? { ...eventDraft }
      : { ...eventDraft, ...getPresetRange(eventDraft.period) };

    if (isInvalidRange(prepared.from, prepared.to)) return;

    setEventDraft(prepared);
    setEventFilters(prepared);
    setEventPage(1);
    setExpandedEventId(null);
    setPayloadOpenEventId(null);
  };

  const resetEventFilters = () => {
    const next = createDefaultEventFilters();
    setEventDraft(next);
    setEventFilters(next);
    setEventPage(1);
    setExpandedEventId(null);
    setPayloadOpenEventId(null);
  };

  const applyDataFilters = () => {
    if (isInvalidRange(dataDraft.from, dataDraft.to)) return;
    setDataFilters({ ...dataDraft });
    setDataPage(1);
    setExpandedLogId(null);
  };

  const resetDataFilters = () => {
    const next = createDefaultDataFilters();
    setDataDraft(next);
    setDataFilters(next);
    setDataPage(1);
    setExpandedLogId(null);
  };

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    if (mode === 'events') {
      setEventPage(page);
      setExpandedEventId(null);
      setPayloadOpenEventId(null);
    } else {
      setDataPage(page);
      setExpandedLogId(null);
    }
  };

  const refresh = () => {
    if (mode === 'events') {
      eventsQuery.refetch();
    } else {
      logsQuery.refetch();
    }
  };

  const exportCurrentData = () => {
    const payload = mode === 'events'
      ? eventRows.map((event) => ({
        time: event.createdAt,
        account: eventActor(event),
        accountId: event.accountId,
        action: eventLabel(event.eventType),
        result: eventResultLabel(event),
        ip: payloadString(event.eventPayload, 'ipAddress') ?? null,
        device: eventDevice(event),
        payload: event.eventPayload,
      }))
      : (logsQuery.data?.data ?? []).map((log) => ({
        time: log.eventTime,
        table: log.tableName,
        operation: log.operation,
        recordId: log.recordId,
        actor: log.actorName ?? log.changedBy,
        changedFields: log.changedFields,
        oldData: log.oldData,
        newData: log.newData,
      }));

    if (!payload.length) return;

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const suffix = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = mode === 'events' ? `audit-events-${suffix}.json` : `audit-data-${suffix}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const activeEventFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (eventFilters.period === 'today') chips.push('Hôm nay');
    if (eventFilters.period === '7d') chips.push('7 ngày qua');
    if (eventFilters.period === '30d') chips.push('30 ngày qua');
    if (eventFilters.period === 'custom') chips.push('Khoảng thời gian tùy chọn');
    if (eventFilters.eventType) chips.push(`Thao tác: ${eventLabel(eventFilters.eventType)}`);
    if (eventFilters.result === 'success') chips.push('Kết quả: Thành công');
    if (eventFilters.result === 'failed') chips.push('Kết quả: Thất bại');
    if (eventFilters.result === 'info') chips.push('Kết quả: Thông tin');
    if (eventFilters.search.trim()) chips.push(`Tìm: ${eventFilters.search.trim()}`);
    if (eventFilters.objectType) chips.push(`Đối tượng: ${objectTypeLabel(eventFilters.objectType)}`);
    return chips;
  }, [eventFilters]);

  const activeDataFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (dataFilters.tableName) chips.push(`Bảng: ${tableLabel(dataFilters.tableName)}`);
    if (dataFilters.operation) chips.push(`Thao tác: ${OPERATION_CONFIG[dataFilters.operation].label}`);
    if (dataFilters.search.trim()) chips.push(`Tìm: ${dataFilters.search.trim()}`);
    if (dataFilters.from || dataFilters.to) chips.push('Khoảng thời gian tùy chọn');
    return chips;
  }, [dataFilters]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Nhật ký hệ thống</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi hoạt động và truy cập hệ thống.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCurrentData}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <Download size={16} />
            Xuất dữ liệu
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => {
              setMode('events');
              setExpandedLogId(null);
            }}
            className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition ${
              mode === 'events' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Activity size={15} />
            Nhật ký hoạt động
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('data');
              setExpandedEventId(null);
              setPayloadOpenEventId(null);
            }}
            className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition ${
              mode === 'data' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Database size={15} />
            Nhật ký dữ liệu
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        {mode === 'events' ? (
          <div className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_220px_220px_200px_auto]">
              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Tìm kiếm</span>
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={eventDraft.search}
                    onChange={(event) => setEventDraft((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Tìm kiếm tài khoản, IP, request ID, session ID..."
                    className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Thao tác</span>
                <select
                  value={eventDraft.eventType}
                  onChange={(event) => setEventDraft((current) => ({ ...current, eventType: event.target.value }))}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Tất cả hành động</option>
                  {(eventTypesQuery.data ?? []).map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {eventLabel(eventType)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Kết quả</span>
                <select
                  value={eventDraft.result}
                  onChange={(event) => setEventDraft((current) => ({
                    ...current,
                    result: event.target.value as EventResultFilter,
                  }))}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Tất cả kết quả</option>
                  <option value="success">Thành công</option>
                  <option value="failed">Thất bại</option>
                  <option value="info">Thông tin</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Thời gian</span>
                <select
                  value={eventDraft.period}
                  onChange={(event) => {
                    const period = event.target.value as EventPeriod;
                    if (period === 'custom') {
                      setEventDraft((current) => ({ ...current, period }));
                      return;
                    }
                    const range = getPresetRange(period);
                    setEventDraft((current) => ({
                      ...current,
                      period,
                      from: range.from,
                      to: range.to,
                    }));
                  }}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                >
                  <option value="today">Hôm nay</option>
                  <option value="7d">7 ngày qua</option>
                  <option value="30d">30 ngày qua</option>
                  <option value="custom">Tùy chọn</option>
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setEventAdvancedOpen((value) => !value)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium transition hover:bg-muted xl:w-auto"
                >
                  <SlidersHorizontal size={16} />
                  Nâng cao
                </button>
              </div>
            </div>

            {eventAdvancedOpen ? (
              <div className="grid gap-3 border-t border-border pt-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Đối tượng</span>
                  <select
                    value={eventDraft.objectType}
                    onChange={(event) => setEventDraft((current) => ({ ...current, objectType: event.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Tất cả đối tượng</option>
                    {(objectTypesQuery.data ?? []).map((objectType) => (
                      <option key={objectType} value={objectType}>
                        {objectTypeLabel(objectType)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">ID đối tượng</span>
                  <input
                    value={eventDraft.objectId}
                    onChange={(event) => setEventDraft((current) => ({ ...current, objectId: event.target.value }))}
                    placeholder="Nhập UUID"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Từ thời điểm</span>
                  <input
                    type="datetime-local"
                    value={eventDraft.from}
                    onChange={(event) => setEventDraft((current) => ({
                      ...current,
                      period: 'custom',
                      from: event.target.value,
                    }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Đến thời điểm</span>
                  <input
                    type="datetime-local"
                    value={eventDraft.to}
                    onChange={(event) => setEventDraft((current) => ({
                      ...current,
                      period: 'custom',
                      to: event.target.value,
                    }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {activeEventFilterChips.length ? (
                  <>
                    <span className="text-xs text-muted-foreground">Đang lọc:</span>
                    {activeEventFilterChips.map((chip) => (
                      <FilterChip key={chip} label={chip} />
                    ))}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Chưa áp dụng bộ lọc</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Hiển thị</span>
                  <select
                    value={eventDraft.limit}
                    onChange={(event) => {
                      const limit = Number(event.target.value);
                      setEventDraft((current) => ({ ...current, limit }));
                    }}
                    className="h-9 rounded-md border border-input bg-background px-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>dòng/trang</span>
                </label>
                <button
                  type="button"
                  onClick={resetEventFilters}
                  className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium transition hover:bg-muted"
                >
                  <RefreshCw size={15} />
                  Đặt lại
                </button>
                <button
                  type="button"
                  onClick={applyEventFilters}
                  disabled={eventRangeInvalid}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Filter size={15} />
                  Áp dụng
                </button>
              </div>
            </div>

            {eventRangeInvalid ? (
              <p className="text-xs text-red-600">Khoảng thời gian không hợp lệ: "Từ thời điểm" phải nhỏ hơn hoặc bằng "Đến thời điểm".</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_220px_220px_auto]">
              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Tìm kiếm</span>
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={dataDraft.search}
                    onChange={(event) => setDataDraft((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Tìm trong dữ liệu thay đổi..."
                    className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Bảng dữ liệu</span>
                <select
                  value={dataDraft.tableName}
                  onChange={(event) => setDataDraft((current) => ({ ...current, tableName: event.target.value }))}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Tất cả bảng</option>
                  {(tableNamesQuery.data ?? []).map((tableName) => (
                    <option key={tableName} value={tableName}>
                      {tableLabel(tableName)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Thao tác</span>
                <select
                  value={dataDraft.operation}
                  onChange={(event) => setDataDraft((current) => ({
                    ...current,
                    operation: event.target.value as OperationFilter,
                  }))}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Tất cả thao tác</option>
                  <option value="INSERT">Tạo mới</option>
                  <option value="UPDATE">Cập nhật</option>
                  <option value="DELETE">Xóa</option>
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setDataAdvancedOpen((value) => !value)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium transition hover:bg-muted xl:w-auto"
                >
                  <SlidersHorizontal size={16} />
                  Nâng cao
                </button>
              </div>
            </div>

            {dataAdvancedOpen ? (
              <div className="grid gap-3 border-t border-border pt-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Record ID</span>
                  <input
                    value={dataDraft.recordId}
                    onChange={(event) => setDataDraft((current) => ({ ...current, recordId: event.target.value }))}
                    placeholder="Nhập UUID bản ghi"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Từ thời điểm</span>
                  <input
                    type="datetime-local"
                    value={dataDraft.from}
                    onChange={(event) => setDataDraft((current) => ({ ...current, from: event.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Đến thời điểm</span>
                  <input
                    type="datetime-local"
                    value={dataDraft.to}
                    onChange={(event) => setDataDraft((current) => ({ ...current, to: event.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {activeDataFilterChips.length ? (
                  <>
                    <span className="text-xs text-muted-foreground">Đang lọc:</span>
                    {activeDataFilterChips.map((chip) => (
                      <FilterChip key={chip} label={chip} />
                    ))}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Chưa áp dụng bộ lọc</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Hiển thị</span>
                  <select
                    value={dataDraft.limit}
                    onChange={(event) => {
                      const limit = Number(event.target.value);
                      setDataDraft((current) => ({ ...current, limit }));
                    }}
                    className="h-9 rounded-md border border-input bg-background px-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>dòng/trang</span>
                </label>
                <button
                  type="button"
                  onClick={resetDataFilters}
                  className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium transition hover:bg-muted"
                >
                  <RefreshCw size={15} />
                  Đặt lại
                </button>
                <button
                  type="button"
                  onClick={applyDataFilters}
                  disabled={dataRangeInvalid}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Filter size={15} />
                  Áp dụng
                </button>
              </div>
            </div>

            {dataRangeInvalid ? (
              <p className="text-xs text-red-600">Khoảng thời gian không hợp lệ: "Từ thời điểm" phải nhỏ hơn hoặc bằng "Đến thời điểm".</p>
            ) : null}
          </div>
        )}
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Không thể tải dữ liệu nhật ký. Vui lòng kiểm tra quyền hoặc thử lại.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          {mode === 'events' ? (
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thời gian</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tài khoản</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thao tác</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Kết quả</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">IP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thiết bị</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      Đang tải nhật ký hoạt động...
                    </td>
                  </tr>
                ) : !eventRows.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Activity size={34} className="mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Không có dữ liệu phù hợp với bộ lọc hiện tại</p>
                    </td>
                  </tr>
                ) : (
                  eventRows.map((event) => {
                    const isExpanded = expandedEventId === event.id;
                    return (
                      <Fragment key={event.id}>
                        <tr
                          className={`cursor-pointer transition hover:bg-muted/20 ${isExpanded ? 'bg-primary/5' : ''}`}
                          onClick={() => {
                            const next = isExpanded ? null : event.id;
                            setExpandedEventId(next);
                            setPayloadOpenEventId(null);
                            setExpandedLogId(null);
                          }}
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                            {formatDateTime(event.createdAt)}
                          </td>
                          <td className="px-4 py-3">
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
                            <ResultBadge event={event} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                            {payloadString(event.eventPayload, 'ipAddress') ?? '-'}
                          </td>
                          <td className="max-w-[320px] px-4 py-3 text-xs text-muted-foreground">
                            <p className="truncate" title={eventDevice(event)}>
                              {eventDevice(event)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                const next = isExpanded ? null : event.id;
                                setExpandedEventId(next);
                                setPayloadOpenEventId(null);
                                setExpandedLogId(null);
                              }}
                            >
                              <Eye size={13} />
                              <ChevronRight size={13} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          </td>
                        </tr>

                        {isExpanded ? (
                          <tr className="bg-muted/15">
                            <td colSpan={7} className="px-4 py-4">
                              <EventDetail
                                event={event}
                                payloadOpen={payloadOpenEventId === event.id}
                                onTogglePayload={() =>
                                  setPayloadOpenEventId((current) => (current === event.id ? null : event.id))
                                }
                                onClose={() => {
                                  setExpandedEventId(null);
                                  setPayloadOpenEventId(null);
                                }}
                                onCopyPayload={async () => {
                                  try {
                                    await navigator.clipboard.writeText(JSON.stringify(event.eventPayload, null, 2));
                                  } catch {
                                    // no-op
                                  }
                                }}
                              />
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
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thời gian</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Bảng</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Thao tác</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Bản ghi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Người đổi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Trường đổi</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      Đang tải nhật ký dữ liệu...
                    </td>
                  </tr>
                ) : !(logsQuery.data?.data.length) ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Database size={34} className="mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Không có dữ liệu phù hợp với bộ lọc hiện tại</p>
                    </td>
                  </tr>
                ) : (
                  logsQuery.data.data.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <Fragment key={log.id}>
                        <tr
                          className={`cursor-pointer transition hover:bg-muted/20 ${isExpanded ? 'bg-primary/5' : ''}`}
                          onClick={() => {
                            setExpandedLogId((current) => (current === log.id ? null : log.id));
                            setExpandedEventId(null);
                            setPayloadOpenEventId(null);
                          }}
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
                          <td className="max-w-[220px] px-4 py-3">
                            <span className="block text-xs font-medium text-foreground">{recordLabel(log)}</span>
                            <code className="block truncate text-xs text-muted-foreground" title={log.recordId ?? ''}>
                              {shortId(log.recordId)}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <span className="block text-xs font-medium text-foreground">{log.actorName ?? log.changedBy ?? '-'}</span>
                            {log.actorName && log.changedBy !== log.actorName ? (
                              <code className="block text-xs text-muted-foreground">{shortId(log.changedBy)}</code>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <FieldChips fields={log.changedFields} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                setExpandedLogId((current) => (current === log.id ? null : log.id));
                                setExpandedEventId(null);
                                setPayloadOpenEventId(null);
                              }}
                            >
                              <Eye size={13} />
                              <ChevronRight size={13} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          </td>
                        </tr>

                        {isExpanded ? (
                          <tr className="bg-muted/15">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="rounded-lg border border-border bg-card p-4">
                                <div className="mb-4 grid gap-3 text-xs md:grid-cols-3">
                                  <div>
                                    <p className="text-muted-foreground">ID bản ghi</p>
                                    <code className="mt-1 block truncate rounded bg-muted px-2 py-1" title={log.recordId ?? ''}>
                                      {log.recordId ?? '-'}
                                    </code>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Người thay đổi</p>
                                    <p className="mt-1 font-medium text-foreground">{log.actorName ?? log.changedBy ?? '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Trường thay đổi</p>
                                    <div className="mt-1">
                                      <FieldChips fields={log.changedFields} />
                                    </div>
                                  </div>
                                </div>

                                <div className="grid gap-4 xl:grid-cols-2">
                                  <JsonBlock title="Dữ liệu cũ" value={log.oldData} />
                                  <JsonBlock title="Dữ liệu mới" value={log.newData} />
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
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Hiển thị {start}-{end} / {formatNumber(total)} bản ghi
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => changePage(activePage - 1)}
              disabled={activePage <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Trang trước"
            >
              <ChevronLeft size={15} />
            </button>

            {pageItems.map((item, index) => {
              if (item === 'left-gap' || item === 'right-gap') {
                return (
                  <span key={`${item}-${index}`} className="px-1 text-sm text-muted-foreground">
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => changePage(item)}
                  className={`h-8 min-w-[2rem] rounded-md border px-2 text-sm transition ${
                    item === activePage
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input text-foreground hover:bg-muted'
                  }`}
                >
                  {item}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => changePage(activePage + 1)}
              disabled={activePage >= totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Trang sau"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
