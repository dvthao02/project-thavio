import { BadRequestException, Injectable } from '@nestjs/common';
import { desc, eq, gte, lte, and, count, inArray, sql, type SQL } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { accounts, auditEvents, businesses, platformAuditLog } from '@schema/platform';
import type { ListAuditEventsDto } from './dto/list-audit-events.dto';
import type { ListAuditLogsDto } from './dto/list-audit-logs.dto';

const SENSITIVE_KEYS = new Set(['password', 'password_hash', 'pin_hash', 'token', 'refresh_token']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }

  if (!value || typeof value !== 'object') return value;

  const data = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    result[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : redactSensitive(v);
  }
  return result;
}

function stripSensitive(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null;
  return redactSensitive(data) as Record<string, unknown>;
}

function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

@Injectable()
export class AuditLogsService {
  private readonly optionsCacheTtlMs = 60_000;
  private readonly optionsCache = new Map<string, { value: string[]; expiresAt: number }>();

  constructor(private readonly platformDb: PlatformDbService) {}

  private validateTimeRange(from?: string, to?: string) {
    if (!from || !to) return;
    if (new Date(from) <= new Date(to)) return;
    throw new BadRequestException('Invalid time range: `from` must be before or equal to `to`.');
  }

  private buildMeta(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async resolveAccountNames(ids: Iterable<string>): Promise<Map<string, string>> {
    const uniqueIds = [...new Set([...ids].filter((id) => isUuid(id)))];
    if (uniqueIds.length === 0) return new Map();

    const rows = await this.platformDb.db
      .select({ id: accounts.id, fullName: accounts.fullName, username: accounts.username, email: accounts.email })
      .from(accounts)
      .where(inArray(accounts.id, uniqueIds));

    const result = new Map<string, string>();
    for (const row of rows) {
      result.set(row.id, row.fullName ?? row.username ?? row.email ?? row.id);
    }
    return result;
  }

  private async resolveBusinessNames(ids: Iterable<string>): Promise<Map<string, string>> {
    const uniqueIds = [...new Set([...ids].filter((id) => isUuid(id)))];
    if (uniqueIds.length === 0) return new Map();

    const rows = await this.platformDb.db
      .select({ id: businesses.id, code: businesses.businessCode, legalName: businesses.legalName })
      .from(businesses)
      .where(inArray(businesses.id, uniqueIds));

    const result = new Map<string, string>();
    for (const row of rows) {
      result.set(row.id, row.legalName ?? row.code ?? row.id);
    }
    return result;
  }

  private async getCachedList(key: string, resolver: () => Promise<string[]>): Promise<string[]> {
    const now = Date.now();
    const cached = this.optionsCache.get(key);
    if (cached && cached.expiresAt > now) return cached.value;

    const value = await resolver();
    this.optionsCache.set(key, { value, expiresAt: now + this.optionsCacheTtlMs });
    return value;
  }

  private isAccountObjectType(objectType: string) {
    return objectType === 'account' || objectType === 'platform_auth';
  }

  private isBusinessObjectType(objectType: string) {
    return objectType === 'business' || objectType === 'subscription';
  }

  async list(dto: ListAuditLogsDto) {
    const { page, limit, tableName, operation, recordId, search, from, to } = dto;
    const offset = (page - 1) * limit;
    const db = this.platformDb.db;
    this.validateTimeRange(from, to);

    const filters: SQL[] = [];
    if (tableName) filters.push(eq(platformAuditLog.tableName, tableName));
    if (operation) filters.push(eq(platformAuditLog.operation, operation));
    if (recordId) filters.push(eq(platformAuditLog.recordId, recordId));
    const searchTerm = search?.trim();
    if (searchTerm) {
      const term = `%${searchTerm}%`;
      filters.push(sql`(${platformAuditLog.newData}::text ILIKE ${term} OR ${platformAuditLog.oldData}::text ILIKE ${term})`);
    }
    // Hide technical login heartbeat updates in data-change view.
    // Only suppress rows where changed fields are limited to last_login_at / updated_at.
    filters.push(sql`NOT (
      ${platformAuditLog.tableName} = 'accounts'
      AND ${platformAuditLog.operation} = 'UPDATE'
      AND ${platformAuditLog.changedFields} IS NOT NULL
      AND ${platformAuditLog.changedFields} && ARRAY['last_login_at']::text[]
      AND ${platformAuditLog.changedFields} <@ ARRAY['last_login_at', 'updated_at']::text[]
    )`);
    if (from) filters.push(gte(platformAuditLog.eventTime, from));
    if (to) filters.push(lte(platformAuditLog.eventTime, to));
    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: platformAuditLog.id,
          eventTime: platformAuditLog.eventTime,
          tableName: platformAuditLog.tableName,
          operation: platformAuditLog.operation,
          recordId: platformAuditLog.recordId,
          changedBy: platformAuditLog.changedBy,
          changedFields: platformAuditLog.changedFields,
          oldData: platformAuditLog.oldData,
          newData: platformAuditLog.newData,
        })
        .from(platformAuditLog)
        .where(where)
        .orderBy(desc(platformAuditLog.eventTime))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(platformAuditLog).where(where),
    ]);

    // Resolve account names for changedBy values that are UUIDs
    const actorIds = rows.map((row) => row.changedBy).filter((changedBy): changedBy is string => isUuid(changedBy));
    const actorMap = await this.resolveAccountNames(actorIds);

    const data = rows.map((r) => ({
      ...r,
      actorName: r.changedBy ? (actorMap.get(r.changedBy) ?? null) : null,
      oldData: stripSensitive(r.oldData as Record<string, unknown> | null),
      newData: stripSensitive(r.newData as Record<string, unknown> | null),
    }));

    return {
      data,
      meta: this.buildMeta(page, limit, Number(total)),
    };
  }

  async getTableNames(): Promise<string[]> {
    return this.getCachedList('table-names', async () => {
      const rows = await this.platformDb.db
        .selectDistinct({ tableName: platformAuditLog.tableName })
        .from(platformAuditLog)
        .orderBy(platformAuditLog.tableName);
      return rows.map((r) => r.tableName);
    });
  }

  async listEvents(dto: ListAuditEventsDto) {
    const { page, limit, eventType, objectType, objectId, search, accountId, businessId, from, to } = dto;
    const offset = (page - 1) * limit;
    const db = this.platformDb.db;
    this.validateTimeRange(from, to);

    const filters: SQL[] = [];
    if (eventType) filters.push(eq(auditEvents.eventType, eventType));
    if (objectType) filters.push(eq(auditEvents.objectType, objectType));
    const objectIdTerm = objectId?.trim();
    if (objectIdTerm) filters.push(eq(auditEvents.objectId, objectIdTerm));
    const searchTerm = search?.trim();
    if (searchTerm) {
      const term = `%${searchTerm}%`;
      filters.push(
        sql`(
          ${auditEvents.eventType} ILIKE ${term}
          OR ${auditEvents.objectType} ILIKE ${term}
          OR COALESCE(${auditEvents.objectId}, '') ILIKE ${term}
          OR COALESCE(${auditEvents.accountId}::text, '') ILIKE ${term}
          OR COALESCE(${auditEvents.eventPayload}::text, '') ILIKE ${term}
        )`,
      );
    }
    if (accountId) filters.push(eq(auditEvents.accountId, accountId));
    if (businessId) filters.push(eq(auditEvents.businessId, businessId));
    if (from) filters.push(gte(auditEvents.createdAt, from));
    if (to) filters.push(lte(auditEvents.createdAt, to));
    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: auditEvents.id,
          businessId: auditEvents.businessId,
          accountId: auditEvents.accountId,
          eventType: auditEvents.eventType,
          objectType: auditEvents.objectType,
          objectId: auditEvents.objectId,
          eventPayload: auditEvents.eventPayload,
          createdAt: auditEvents.createdAt,
        })
        .from(auditEvents)
        .where(where)
        .orderBy(desc(auditEvents.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(auditEvents).where(where),
    ]);

    const accountIds = new Set<string>();
    const businessIds = new Set<string>();

    for (const row of rows) {
      if (isUuid(row.accountId)) accountIds.add(row.accountId);
      if (this.isAccountObjectType(row.objectType) && isUuid(row.objectId)) accountIds.add(row.objectId);
      if (isUuid(row.businessId)) businessIds.add(row.businessId);
      if (this.isBusinessObjectType(row.objectType) && isUuid(row.objectId)) businessIds.add(row.objectId);
    }

    const [accountMap, businessMap] = await Promise.all([
      this.resolveAccountNames(accountIds),
      this.resolveBusinessNames(businessIds),
    ]);

    const data = rows.map((row) => ({
      ...row,
      accountName: row.accountId ? (accountMap.get(row.accountId) ?? null) : null,
      objectName: this.isAccountObjectType(row.objectType)
        ? row.objectId
          ? (accountMap.get(row.objectId) ?? null)
          : null
        : this.isBusinessObjectType(row.objectType)
          ? (row.objectId ? (businessMap.get(row.objectId) ?? null) : row.businessId ? (businessMap.get(row.businessId) ?? null) : null)
          : null,
    }));

    return {
      data,
      meta: this.buildMeta(page, limit, Number(total)),
    };
  }

  async getEventTypes(): Promise<string[]> {
    return this.getCachedList('event-types', async () => {
      const rows = await this.platformDb.db
        .selectDistinct({ eventType: auditEvents.eventType })
        .from(auditEvents)
        .orderBy(auditEvents.eventType);
      return rows.map((r) => r.eventType);
    });
  }

  async getObjectTypes(): Promise<string[]> {
    return this.getCachedList('object-types', async () => {
      const rows = await this.platformDb.db
        .selectDistinct({ objectType: auditEvents.objectType })
        .from(auditEvents)
        .orderBy(auditEvents.objectType);
      return rows.map((r) => r.objectType);
    });
  }
}
