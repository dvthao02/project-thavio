import { Injectable } from '@nestjs/common';
import { count, eq, desc, sql, gte, and, inArray, type SQL } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { businesses, accounts, accountBusinesses } from '@schema/platform';

export type Period = '7d' | '30d' | '3m' | '6m' | '1y';

const INTERVAL: Record<Period, string> = {
  '7d':  '7 days',
  '30d': '30 days',
  '3m':  '3 months',
  '6m':  '6 months',
  '1y':  '1 year',
};

const GROUP_BY: Record<Period, 'day' | 'month'> = {
  '7d': 'day', '30d': 'day', '3m': 'month', '6m': 'month', '1y': 'month',
};

const FMT: Record<'day' | 'month', string> = {
  day: 'DD/MM', month: 'MM/YYYY',
};

@Injectable()
export class DashboardService {
  constructor(private readonly platformDb: PlatformDbService) {}

  async getStats(period: Period = '30d', assignedAccountId?: string) {
    const db = this.platformDb.db;
    const interval = INTERVAL[period];
    const groupBy = GROUP_BY[period];
    const fmt = FMT[groupBy];
    const since = sql`NOW() - INTERVAL ${sql.raw(`'${interval}'`)}`;

    // When filtering by assignee, resolve their business IDs first
    let bizIds: string[] | undefined;
    if (assignedAccountId) {
      const rows = await db
        .select({ businessId: accountBusinesses.businessId })
        .from(accountBusinesses)
        .where(and(
          eq(accountBusinesses.accountId, assignedAccountId),
          eq(accountBusinesses.status, 'active'),
        ));
      bizIds = rows.map((r) => r.businessId).filter(Boolean) as string[];
    }

    // Compose WHERE: optional biz-scope + optional extra condition
    const w = (...extra: (SQL | undefined)[]): SQL | undefined => {
      const clauses = [
        bizIds ? (bizIds.length > 0 ? inArray(businesses.id, bizIds) : sql`1=0`) : undefined,
        ...extra,
      ].filter(Boolean) as SQL[];
      if (clauses.length === 0) return undefined;
      if (clauses.length === 1) return clauses[0];
      return and(...clauses);
    };

    // For raw-SQL queries (byPlan, byPeriod) add an optional IN clause
    const bizIdClause = bizIds
      ? bizIds.length > 0
        ? `AND id = ANY('{${bizIds.join(',')}}'::uuid[])`
        : 'AND 1=0'
      : '';

    const [
      [{ total: totalBusinesses }],
      [{ total: activeCount }],
      [{ total: pendingCount }],
      [{ total: suspendedCount }],
      [{ total: inactiveCount }],
      [{ total: trialCount }],
      [{ total: newBusinesses }],
      [{ total: totalAccounts }],
      [{ total: lockedAccounts }],
      [{ total: newAccounts }],
      recentBusinesses,
      recentAccounts,
      byPlanRows,
      byPeriodRows,
    ] = await Promise.all([
      db.select({ total: count() }).from(businesses).where(w()),
      db.select({ total: count() }).from(businesses).where(w(eq(businesses.status, 'active'))),
      db.select({ total: count() }).from(businesses).where(w(eq(businesses.status, 'pending'))),
      db.select({ total: count() }).from(businesses).where(w(eq(businesses.status, 'suspended'))),
      db.select({ total: count() }).from(businesses).where(w(eq(businesses.status, 'inactive'))),
      db.select({ total: count() }).from(businesses).where(
        w(eq(businesses.status, 'active'), gte(businesses.createdAt, sql`NOW() - INTERVAL '10 days'`))
      ),
      db.select({ total: count() }).from(businesses).where(w(gte(businesses.createdAt, since as any))),
      db.select({ total: count() }).from(accounts),
      db.select({ total: count() }).from(accounts).where(eq(accounts.status, 'locked')),
      db.select({ total: count() }).from(accounts).where(gte(accounts.createdAt, since as any)),
      db
        .select({
          id: businesses.id,
          businessCode: businesses.businessCode,
          legalName: businesses.legalName,
          brandName: businesses.brandName,
          status: businesses.status,
          subscriptionPlan: businesses.subscriptionPlan,
          createdAt: businesses.createdAt,
        })
        .from(businesses)
        .where(w())
        .orderBy(desc(businesses.createdAt))
        .limit(8),
      db
        .select({
          id: accounts.id,
          username: accounts.username,
          fullName: accounts.fullName,
          email: accounts.email,
          status: accounts.status,
          isPlatformAdmin: accounts.isPlatformAdmin,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .orderBy(desc(accounts.createdAt))
        .limit(6),
      // By plan
      db.execute(sql.raw(
        `SELECT subscription_plan AS plan, COUNT(*)::int AS total
         FROM platform.businesses WHERE 1=1 ${bizIdClause}
         GROUP BY subscription_plan ORDER BY total DESC`,
      )),
      // By period
      db.execute(sql.raw(
        `SELECT TO_CHAR(DATE_TRUNC('${groupBy}', created_at AT TIME ZONE 'UTC'), '${fmt}') AS label,
                COUNT(*)::int AS total
         FROM platform.businesses
         WHERE created_at >= NOW() - INTERVAL '${interval}' ${bizIdClause}
         GROUP BY DATE_TRUNC('${groupBy}', created_at AT TIME ZONE 'UTC')
         ORDER BY DATE_TRUNC('${groupBy}', created_at AT TIME ZONE 'UTC') ASC`,
      )),
    ]);

    return {
      businesses: {
        total: Number(totalBusinesses),
        active: Number(activeCount),
        pending: Number(pendingCount),
        suspended: Number(suspendedCount),
        inactive: Number(inactiveCount),
        trial: Number(trialCount),
        newInPeriod: Number(newBusinesses),
        byPlan: (byPlanRows.rows as { plan: string; total: number }[]).map((r) => ({
          plan: r.plan ?? 'unknown',
          total: Number(r.total),
        })),
        byPeriod: (byPeriodRows.rows as { label: string; total: number }[]).map((r) => ({
          label: r.label,
          total: Number(r.total),
        })),
      },
      accounts: {
        total: Number(totalAccounts),
        locked: Number(lockedAccounts),
        newInPeriod: Number(newAccounts),
      },
      recentBusinesses,
      recentAccounts,
      period,
    };
  }
}
