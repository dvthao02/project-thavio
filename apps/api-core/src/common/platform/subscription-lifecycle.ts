export const TRIAL_DAYS = 10;

export type SubscriptionLifecycleStatus =
  | 'trialing'
  | 'trial_expired'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled'
  | 'pending';

export type SubscriptionLifecycleInput = {
  businessStatus?: string | null;
  createdAt?: string | Date | null;
  trialEndsAt?: string | Date | null;
  subscriptionStatus?: string | null;
  periodEnd?: string | Date | null;
  renewedAt?: string | Date | null;
  subscriptionExpiresAt?: string | Date | null;
  now?: Date;
};

export type SubscriptionLifecycle = {
  status: SubscriptionLifecycleStatus;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
};

const DAY_MS = 86_400_000;

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveTrialEndsAt(createdAt?: string | Date | null, trialEndsAt?: string | Date | null): Date | null {
  const explicitTrialEnd = toDate(trialEndsAt);
  if (explicitTrialEnd) return explicitTrialEnd;

  const created = toDate(createdAt);
  if (!created) return null;
  return new Date(created.getTime() + TRIAL_DAYS * DAY_MS);
}

export function resolveSubscriptionLifecycle(input: SubscriptionLifecycleInput): SubscriptionLifecycle {
  const now = input.now ?? new Date();
  const businessStatus = input.businessStatus ?? 'active';
  const subscriptionStatus = input.subscriptionStatus ?? null;
  const periodEnd = toDate(input.periodEnd);
  const trialEnd = resolveTrialEndsAt(input.createdAt, input.trialEndsAt);
  const hasPaidSubscription =
    subscriptionStatus === 'active' && Boolean(toDate(input.renewedAt) || toDate(input.subscriptionExpiresAt));

  let status: SubscriptionLifecycleStatus;

  if (businessStatus === 'suspended') {
    status = 'suspended';
  } else if (businessStatus === 'inactive') {
    status = 'cancelled';
  } else if (businessStatus === 'pending') {
    status = 'pending';
  } else if (subscriptionStatus === 'cancelled' || subscriptionStatus === 'inactive') {
    status = 'cancelled';
  } else if (subscriptionStatus === 'pending') {
    status = 'pending';
  } else if (hasPaidSubscription) {
    status = periodEnd && periodEnd.getTime() < now.getTime() ? 'past_due' : 'active';
  } else if (trialEnd) {
    status = trialEnd.getTime() >= now.getTime() ? 'trialing' : 'trial_expired';
  } else if (subscriptionStatus === 'active' && periodEnd) {
    status = periodEnd.getTime() < now.getTime() ? 'past_due' : 'active';
  } else {
    status = 'active';
  }

  return {
    status,
    trialEndsAt: trialEnd ? trialEnd.toISOString() : null,
    trialDaysLeft:
      status === 'trialing' && trialEnd
        ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / DAY_MS))
        : null,
  };
}
