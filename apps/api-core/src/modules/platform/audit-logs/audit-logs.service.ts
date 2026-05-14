import { Injectable } from '@nestjs/common';
import { desc, eq, gte, lte, and, count, sql, type SQL } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { auditEvents, platformAuditLog } from '@schema/platform';
import type { ListAuditEventsDto } from './dto/list-audit-events.dto';
import type { ListAuditLogsDto } from './dto/list-audit-logs.dto';

const SENSITIVE_KEYS = new Set(['password', 'password_hash', 'pin_hash', 'token', 'refresh_token']);

function stripSensitive(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    result[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : v;
  }
  return result;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly platformDb: PlatformDbService) {}

  async list(dto: ListAuditLogsDto) {
    const { page, limit, tableName, operation, recordId, search, from, to } = dto;
    const offset = (page - 1) * limit;
    const db = this.platformDb.db;

    const filters: SQL[] = [];
    if (tableName) filters.push(eq(platformAuditLog.tableName, tableName));
    if (operation) filters.push(eq(platformAuditLog.operation, operation));
    if (recordId) filters.push(eq(platformAuditLog.recordId, recordId));
    if (search) {
      const term = `%${search}%`;
      filters.push(sql`(${platformAuditLog.newData}::text ILIKE ${term} OR ${platformAuditLog.oldData}::text ILIKE ${term})`);
    }
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

    const data = rows.map((r) => ({
      ...r,
      oldData: stripSensitive(r.oldData as Record<string, unknown> | null),
      newData: stripSensitive(r.newData as Record<string, unknown> | null),
    }));

    return {
      data,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    };
  }

  async getTableNames(): Promise<string[]> {
    const db = this.platformDb.db;
    const rows = await db
      .selectDistinct({ tableName: platformAuditLog.tableName })
      .from(platformAuditLog)
      .orderBy(platformAuditLog.tableName);
    return rows.map((r) => r.tableName);
  }

  async listEvents(dto: ListAuditEventsDto) {
    const { page, limit, eventType, objectType, objectId, accountId, businessId, from, to } = dto;
    const offset = (page - 1) * limit;
    const db = this.platformDb.db;

    const filters: SQL[] = [];
    if (eventType) filters.push(eq(auditEvents.eventType, eventType));
    if (objectType) filters.push(eq(auditEvents.objectType, objectType));
    if (objectId) filters.push(eq(auditEvents.objectId, objectId));
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

    return {
      data: rows,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    };
  }

  async getEventTypes(): Promise<string[]> {
    const db = this.platformDb.db;
    const rows = await db
      .selectDistinct({ eventType: auditEvents.eventType })
      .from(auditEvents)
      .orderBy(auditEvents.eventType);
    return rows.map((r) => r.eventType);
  }
}
