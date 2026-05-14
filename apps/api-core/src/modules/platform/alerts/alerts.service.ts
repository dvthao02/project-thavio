import { Injectable } from '@nestjs/common';
import { eq, lt, gte, and, lte, sql } from 'drizzle-orm';
import { PlatformDbService } from '@common/database/platform-db.service';
import { businesses, businessSubscriptions, accounts } from '@schema/platform';

const TRIAL_DAYS = 10;
const EXPIRING_THRESHOLD_DAYS = 2;

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertItem {
  id: string;
  name: string;
  detail: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Alert {
  type: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  count: number;
  items: AlertItem[];
}

@Injectable()
export class AlertsService {
  constructor(private readonly platformDb: PlatformDbService) {}

  async getAlerts(): Promise<{ alerts: Alert[]; totalCritical: number; totalWarning: number; totalInfo: number }> {
    const db = this.platformDb.db;
    const now = new Date();

    const trialExpiringFrom = new Date(now.getTime() - TRIAL_DAYS * 86_400_000);
    const trialExpiringTo = new Date(now.getTime() - (TRIAL_DAYS - EXPIRING_THRESHOLD_DAYS) * 86_400_000);
    const trialExpiredBefore = new Date(now.getTime() - TRIAL_DAYS * 86_400_000);

    const [
      trialExpiringRows,
      trialExpiredRows,
      suspendedRows,
      overdueSubRows,
      lockedAccountRows,
    ] = await Promise.all([
      // Trial còn <= 2 ngày
      db
        .select({
          id: businesses.id,
          businessCode: businesses.businessCode,
          legalName: businesses.legalName,
          createdAt: businesses.createdAt,
        })
        .from(businesses)
        .where(
          and(
            eq(businesses.status, 'active'),
            gte(businesses.createdAt, trialExpiringFrom.toISOString()),
            lte(businesses.createdAt, trialExpiringTo.toISOString()),
          ),
        )
        .limit(50),

      // Trial đã hết (> 10 ngày) nhưng business vẫn active, chưa có subscription active
      db
        .select({
          id: businesses.id,
          businessCode: businesses.businessCode,
          legalName: businesses.legalName,
          createdAt: businesses.createdAt,
        })
        .from(businesses)
        .where(
          and(
            eq(businesses.status, 'active'),
            lt(businesses.createdAt, trialExpiredBefore.toISOString()),
          ),
        )
        .limit(50),

      // Business bị suspended
      db
        .select({
          id: businesses.id,
          businessCode: businesses.businessCode,
          legalName: businesses.legalName,
          updatedAt: businesses.updatedAt,
        })
        .from(businesses)
        .where(eq(businesses.status, 'suspended'))
        .limit(50),

      // Subscription quá hạn (period_end đã qua, status còn active)
      db
        .select({
          id: businessSubscriptions.id,
          businessId: businessSubscriptions.businessId,
          currentPeriodEnd: businessSubscriptions.currentPeriodEnd,
          legalName: businesses.legalName,
          businessCode: businesses.businessCode,
        })
        .from(businessSubscriptions)
        .leftJoin(businesses, eq(businesses.id, businessSubscriptions.businessId))
        .where(
          and(
            eq(businessSubscriptions.status, 'active'),
            lt(businessSubscriptions.currentPeriodEnd, now.toISOString()),
          ),
        )
        .limit(50),

      // Tài khoản bị khóa
      db
        .select({
          id: accounts.id,
          username: accounts.username,
          fullName: accounts.fullName,
          email: accounts.email,
          updatedAt: accounts.updatedAt,
        })
        .from(accounts)
        .where(eq(accounts.status, 'locked'))
        .limit(50),
    ]);

    const alerts: Alert[] = [];

    if (overdueSubRows.length > 0) {
      alerts.push({
        type: 'subscription_overdue',
        severity: 'critical',
        title: 'Subscription quá hạn',
        description: `${overdueSubRows.length} doanh nghiệp có subscription đã hết hạn chưa được gia hạn.`,
        count: overdueSubRows.length,
        items: overdueSubRows.map((r) => {
          const days = Math.floor((now.getTime() - new Date(r.currentPeriodEnd!).getTime()) / 86_400_000);
          return {
            id: r.businessId ?? r.id,
            name: r.legalName ?? r.businessCode ?? r.businessId ?? '-',
            detail: `Quá hạn ${days} ngày (hết ${new Date(r.currentPeriodEnd!).toLocaleDateString('vi-VN')})`,
            updatedAt: r.currentPeriodEnd,
          };
        }),
      });
    }

    if (trialExpiredRows.length > 0) {
      alerts.push({
        type: 'trial_expired',
        severity: 'critical',
        title: 'Trial đã hết hạn',
        description: `${trialExpiredRows.length} doanh nghiệp đã hết trial 10 ngày nhưng chưa có subscription.`,
        count: trialExpiredRows.length,
        items: trialExpiredRows.map((r) => {
          const overdue = Math.floor((now.getTime() - new Date(r.createdAt!).getTime()) / 86_400_000) - TRIAL_DAYS;
          return {
            id: r.id,
            name: r.legalName ?? r.businessCode ?? r.id,
            detail: `Hết trial ${overdue} ngày trước`,
            createdAt: r.createdAt,
          };
        }),
      });
    }

    if (trialExpiringRows.length > 0) {
      alerts.push({
        type: 'trial_expiring',
        severity: 'warning',
        title: 'Trial sắp hết hạn',
        description: `${trialExpiringRows.length} doanh nghiệp còn dưới ${EXPIRING_THRESHOLD_DAYS} ngày dùng thử.`,
        count: trialExpiringRows.length,
        items: trialExpiringRows.map((r) => {
          const daysLeft = TRIAL_DAYS - Math.floor((now.getTime() - new Date(r.createdAt!).getTime()) / 86_400_000);
          return {
            id: r.id,
            name: r.legalName ?? r.businessCode ?? r.id,
            detail: `Còn ${Math.max(0, daysLeft)} ngày`,
            createdAt: r.createdAt,
          };
        }),
      });
    }

    if (lockedAccountRows.length > 0) {
      alerts.push({
        type: 'account_locked',
        severity: 'warning',
        title: 'Tài khoản bị khóa',
        description: `${lockedAccountRows.length} tài khoản platform đang bị khóa.`,
        count: lockedAccountRows.length,
        items: lockedAccountRows.map((r) => ({
          id: r.id,
          name: r.fullName ?? r.username,
          detail: r.email ?? r.username,
          updatedAt: r.updatedAt,
        })),
      });
    }

    if (suspendedRows.length > 0) {
      alerts.push({
        type: 'business_suspended',
        severity: 'info',
        title: 'Doanh nghiệp bị tạm khóa',
        description: `${suspendedRows.length} doanh nghiệp đang ở trạng thái suspended.`,
        count: suspendedRows.length,
        items: suspendedRows.map((r) => ({
          id: r.id,
          name: r.legalName ?? r.businessCode ?? r.id,
          detail: r.businessCode ?? '',
          updatedAt: r.updatedAt,
        })),
      });
    }

    const totalCritical = alerts.filter((a) => a.severity === 'critical').reduce((s, a) => s + a.count, 0);
    const totalWarning = alerts.filter((a) => a.severity === 'warning').reduce((s, a) => s + a.count, 0);
    const totalInfo = alerts.filter((a) => a.severity === 'info').reduce((s, a) => s + a.count, 0);

    return { alerts, totalCritical, totalWarning, totalInfo };
  }
}
