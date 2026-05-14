import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { businesses, businessSubscriptions } from '@schema/platform';

const TRIAL_DAYS = 10;

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
      })
      .from(businesses)
      .where(eq(businesses.businessCode, businessCode))
      .limit(1);

    if (!business) throw new NotFoundException('Business not found');

    const [sub] = await db
      .select({
        status: businessSubscriptions.status,
        currentPeriodEnd: businessSubscriptions.currentPeriodEnd,
      })
      .from(businessSubscriptions)
      .where(eq(businessSubscriptions.businessId, business.id))
      .limit(1);

    const now = Date.now();
    const createdAt = new Date(business.createdAt!).getTime();
    const ageMs = now - createdAt;
    const ageDays = ageMs / 86_400_000;

    const trialEndsAt = new Date(createdAt + TRIAL_DAYS * 86_400_000).toISOString();
    const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now) / 86_400_000));

    let subscriptionStatus: string;

    if (business.status === 'suspended') {
      subscriptionStatus = 'suspended';
    } else if (business.status === 'inactive') {
      subscriptionStatus = 'cancelled';
    } else if (sub?.status === 'active' && sub.currentPeriodEnd) {
      subscriptionStatus = new Date(sub.currentPeriodEnd).getTime() < now ? 'past_due' : 'active';
    } else if (ageDays <= TRIAL_DAYS) {
      subscriptionStatus = 'trialing';
    } else {
      subscriptionStatus = 'trial_expired';
    }

    return {
      status: subscriptionStatus,
      plan: business.subscriptionPlan ?? 'standard',
      isTrialing: subscriptionStatus === 'trialing',
      isExpired: subscriptionStatus === 'trial_expired' || subscriptionStatus === 'past_due',
      daysLeft: subscriptionStatus === 'trialing' ? daysLeft : null,
      trialEndsAt: subscriptionStatus === 'trialing' || subscriptionStatus === 'trial_expired' ? trialEndsAt : null,
      periodEnd: sub?.currentPeriodEnd ?? null,
    };
  }
}
