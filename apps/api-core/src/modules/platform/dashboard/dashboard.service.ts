import { Injectable } from '@nestjs/common';
import { count, eq, desc } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { businesses, accounts } from '@schema/platform';

@Injectable()
export class DashboardService {
  constructor(private readonly platformDb: PlatformDbService) {}

  async getStats() {
    const db = this.platformDb.db;

    const [
      [{ total: totalBusinesses }],
      [{ total: activeCount }],
      [{ total: trialCount }],
      [{ total: suspendedCount }],
      [{ total: totalAccounts }],
      recentBusinesses,
    ] = await Promise.all([
      db.select({ total: count() }).from(businesses),
      db.select({ total: count() }).from(businesses).where(eq(businesses.status, 'active')),
      db.select({ total: count() }).from(businesses).where(eq(businesses.status, 'trial')),
      db.select({ total: count() }).from(businesses).where(eq(businesses.status, 'suspended')),
      db.select({ total: count() }).from(accounts),
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
        .limit(10),
    ]);

    return {
      businesses: {
        total: Number(totalBusinesses),
        active: Number(activeCount),
        trial: Number(trialCount),
        suspended: Number(suspendedCount),
      },
      accounts: {
        total: Number(totalAccounts),
      },
      recentBusinesses,
    };
  }
}
