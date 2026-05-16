import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { resolveSubscriptionLifecycle } from '@common/platform/subscription-lifecycle';
import { businesses, businessSubscriptions } from '@schema/platform';

@Injectable()
export class SubscriptionService {
  constructor(private readonly platformDb: PlatformDbService) {}

  async getStatus(businessCode: string) {
    const db = this.platformDb.db;

    const [business] = await db
      .select({
        id: businesses.id,
        status: businesses.status,
        subscriptionPlan: businesses.subscriptionPlan,
        createdAt: businesses.createdAt,
        trialEndsAt: businesses.trialEndsAt,
        subscriptionExpiresAt: businesses.subscriptionExpiresAt,
      })
      .from(businesses)
      .where(eq(businesses.businessCode, businessCode))
      .limit(1);

    if (!business) throw new NotFoundException('Business not found');

    const [sub] = await db
      .select({
        status: businessSubscriptions.status,
        currentPeriodEnd: businessSubscriptions.currentPeriodEnd,
        renewedAt: businessSubscriptions.renewedAt,
      })
      .from(businessSubscriptions)
      .where(eq(businessSubscriptions.businessId, business.id))
      .limit(1);

    const lifecycle = resolveSubscriptionLifecycle({
      businessStatus: business.status,
      createdAt: business.createdAt,
      trialEndsAt: business.trialEndsAt,
      subscriptionStatus: sub?.status,
      periodEnd: sub?.currentPeriodEnd,
      renewedAt: sub?.renewedAt,
      subscriptionExpiresAt: business.subscriptionExpiresAt,
    });

    return {
      status: lifecycle.status,
      plan: business.subscriptionPlan ?? 'standard',
      isTrialing: lifecycle.status === 'trialing',
      isExpired: lifecycle.status === 'trial_expired' || lifecycle.status === 'past_due',
      daysLeft: lifecycle.trialDaysLeft,
      trialEndsAt:
        lifecycle.status === 'trialing' || lifecycle.status === 'trial_expired'
          ? lifecycle.trialEndsAt
          : null,
      periodEnd: sub?.currentPeriodEnd ?? null,
    };
  }
}
