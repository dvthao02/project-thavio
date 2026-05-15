import { Injectable } from '@nestjs/common';
import { count, eq, desc, asc, sql, and, inArray, type SQL } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { businesses, accounts, accountBusinesses } from '@schema/platform';

export type Period = '7d' | '30d' | 'thisMonth' | '3m' | '6m' | '1y';

const INTERVAL: Record<Exclude<Period, 'thisMonth'>, string> = {
  '7d':  '7 days',
  '30d': '30 days',
  '3m':  '3 months',
  '6m':  '6 months',
  '1y':  '1 year',
};

const GROUP_BY: Record<Period, 'day' | 'month'> = {
  '7d': 'day', '30d': 'day', 'thisMonth': 'day', '3m': 'day', '6m': 'day', '1y': 'month',
};

const FMT: Record<'day' | 'month', string> = {
  day: 'DD/MM', month: 'MM/YYYY',
};

@Injectable()
export class DashboardService {
  constructor(private readonly platformDb: PlatformDbService) {}

  async getAssignees(isFullAdmin = true, scopeAccountId?: string) {
    const db = this.platformDb.db;
    const assignedBusinessesExpr = sql<number>`COUNT(DISTINCT ${accountBusinesses.businessId})`;

    const where = and(
      eq(accountBusinesses.status, 'active'),
      eq(accounts.status, 'active'),
      eq(accounts.isPlatformAdmin, true),
      !isFullAdmin && scopeAccountId ? eq(accounts.id, scopeAccountId) : undefined,
    );

    const rows = await db
      .select({
        id: accounts.id,
        username: accounts.username,
        fullName: accounts.fullName,
        email: accounts.email,
        assignedBusinesses: assignedBusinessesExpr,
      })
      .from(accountBusinesses)
      .innerJoin(accounts, eq(accounts.id, accountBusinesses.accountId))
      .where(where)
      .groupBy(accounts.id, accounts.username, accounts.fullName, accounts.email)
      .orderBy(desc(assignedBusinessesExpr), asc(accounts.fullName), asc(accounts.username));

    return {
      data: rows.map((row) => ({
        ...row,
        assignedBusinesses: Number(row.assignedBusinesses ?? 0),
      })),
    };
  }

  async getStats(period: Period = '30d', assignedAccountId?: string, isFullAdmin = true) {
    const db = this.platformDb.db;
    const interval = period === 'thisMonth' ? null : INTERVAL[period];
    const groupBy = GROUP_BY[period];
    const fmt = FMT[groupBy];
    const since = interval
      ? sql`NOW() - INTERVAL ${sql.raw(`'${interval}'`)}`
      : sql`DATE_TRUNC('month', NOW())`;
    const groupBySql = sql.raw(`'${groupBy}'`);
    const fmtSql = sql.raw(`'${fmt}'`);

    // When filtering by assignee (or scoping non-admin), resolve their business IDs
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

    // For non-admin: scope account stats to current user only
    const accountScopeId = isFullAdmin ? undefined : assignedAccountId;

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

    const rawBizScope = bizIds
      ? bizIds.length > 0
        ? sql`AND id IN (${sql.join(bizIds.map((bizId) => sql`${bizId}::uuid`), sql`, `)})`
        : sql`AND 1=0`
      : sql``;

    const accountWhere = accountScopeId ? eq(accounts.id, accountScopeId) : undefined;

    const [
      [businessMetrics],
      [accountMetrics],
      recentBusinesses,
      recentAccounts,
      byPlanRows,
      byPeriodRows,
    ] = await Promise.all([
      db
        .select({
          total: count(),
          active: sql<number>`COUNT(*) FILTER (WHERE ${businesses.status} = 'active')`,
          pending: sql<number>`COUNT(*) FILTER (WHERE ${businesses.status} = 'pending')`,
          suspended: sql<number>`COUNT(*) FILTER (WHERE ${businesses.status} = 'suspended')`,
          inactive: sql<number>`COUNT(*) FILTER (WHERE ${businesses.status} = 'inactive')`,
          trial: sql<number>`COUNT(*) FILTER (WHERE ${businesses.status} = 'active' AND ${businesses.createdAt} >= NOW() - INTERVAL '10 days')`,
          newInPeriod: sql<number>`COUNT(*) FILTER (WHERE ${businesses.createdAt} >= ${since})`,
        })
        .from(businesses)
        .where(w()),
      db
        .select({
          total: count(),
          locked: sql<number>`COUNT(*) FILTER (WHERE ${accounts.status} = 'locked')`,
          newInPeriod: sql<number>`COUNT(*) FILTER (WHERE ${accounts.createdAt} >= ${since})`,
        })
        .from(accounts)
        .where(accountWhere),
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
        .limit(5),
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
        .where(accountWhere)
        .orderBy(desc(accounts.createdAt))
        .limit(5),
      // By plan
      db.execute(sql`
        SELECT subscription_plan AS plan, COUNT(*)::int AS total
        FROM platform.businesses
        WHERE 1=1 ${rawBizScope}
        GROUP BY subscription_plan
        ORDER BY total DESC
      `),
      // By period
      db.execute(sql`
        SELECT TO_CHAR(DATE_TRUNC(${groupBySql}, created_at AT TIME ZONE 'UTC'), ${fmtSql}) AS label,
               COUNT(*)::int AS total
        FROM platform.businesses
        WHERE created_at >= ${since} ${rawBizScope}
        GROUP BY DATE_TRUNC(${groupBySql}, created_at AT TIME ZONE 'UTC')
        ORDER BY DATE_TRUNC(${groupBySql}, created_at AT TIME ZONE 'UTC') ASC
      `),
    ]);

    return {
      businesses: {
        total: Number(businessMetrics?.total ?? 0),
        active: Number(businessMetrics?.active ?? 0),
        pending: Number(businessMetrics?.pending ?? 0),
        suspended: Number(businessMetrics?.suspended ?? 0),
        inactive: Number(businessMetrics?.inactive ?? 0),
        trial: Number(businessMetrics?.trial ?? 0),
        newInPeriod: Number(businessMetrics?.newInPeriod ?? 0),
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
        total: Number(accountMetrics?.total ?? 0),
        locked: Number(accountMetrics?.locked ?? 0),
        newInPeriod: Number(accountMetrics?.newInPeriod ?? 0),
      },
      recentBusinesses,
      recentAccounts,
      period,
    };
  }
}
