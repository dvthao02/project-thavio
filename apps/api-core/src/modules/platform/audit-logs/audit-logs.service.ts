import { Injectable } from '@nestjs/common';
import { desc, eq, gte, lte, and, count, type SQL } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { platformAuditLog } from '@schema/platform';
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
    const { page, limit, tableName, operation, recordId, from, to } = dto;
    const offset = (page - 1) * limit;
    const db = this.platformDb.db;

    const filters: SQL[] = [];
    if (tableName) filters.push(eq(platformAuditLog.tableName, tableName));
    if (operation) filters.push(eq(platformAuditLog.operation, operation));
    if (recordId) filters.push(eq(platformAuditLog.recordId, recordId));
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
}
