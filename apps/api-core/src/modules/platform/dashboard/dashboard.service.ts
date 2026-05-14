import { Injectable } from '@nestjs/common';
import { count, eq, desc, sql, gte, and } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { businesses, accounts } from '@schema/platform';

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

  async getStats(period: Period = '30d') {
    const db = this.platformDb.db;
    const interval = INTERVAL[period];
    const groupBy = GROUP_BY[period];
    const fmt = FMT[groupBy];
    const since = sql`NOW() - INTERVAL ${sql.raw(`'${interval}'`)}`;

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
      db.select({ total: count() }).from(businesses),
      db.select({ total: count() }).from(businesses).where(eq(businesses.status, 'active')),
      db.select({ total: count() }).from(businesses).where(eq(businesses.status, 'pending')),
      db.select({ total: count() }).from(businesses).where(eq(businesses.status, 'suspended')),
      db.select({ total: count() }).from(businesses).where(eq(businesses.status, 'inactive')),
      db.select({ total: count() }).from(businesses).where(
        and(eq(businesses.status, 'active'), gte(businesses.createdAt, sql`NOW() - INTERVAL '10 days'`))
      ),
      db.select({ total: count() }).from(businesses).where(gte(businesses.createdAt, since as any)),
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
      db.execute(
        sql`SELECT subscription_plan AS plan, COUNT(*)::int AS total
            FROM platform.businesses GROUP BY subscription_plan ORDER BY total DESC`,
      ),
      // By period
      db.execute(
        sql.raw(`
          SELECT TO_CHAR(DATE_TRUNC('${groupBy}', created_at AT TIME ZONE 'UTC'), '${fmt}') AS label,
                 COUNT(*)::int AS total
          FROM platform.businesses
          WHERE created_at >= NOW() - INTERVAL '${interval}'
          GROUP BY DATE_TRUNC('${groupBy}', created_at AT TIME ZONE 'UTC')
          ORDER BY DATE_TRUNC('${groupBy}', created_at AT TIME ZONE 'UTC') ASC
        `),
      ),
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
