import { Controller, Get, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { DashboardService } from './dashboard.service';
import { RequirePermission } from '@decorators/require-permission.decorator';
import { resolvePlatformContext, type PlatformRequest } from '@common/auth/platform-context';

const StatsQuerySchema = z.object({
  period: z.enum(['7d', '30d', 'thisMonth', '3m', '6m', '1y']).default('30d'),
  assignedAccountId: z.string().optional(),
});

@Controller('platform/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @RequirePermission('platform.dashboard.view')
  @Get('assignees')
  getAssignees(@Req() req: PlatformRequest) {
    const ctx = resolvePlatformContext(req, 'platform.business.create');
    return this.dashboardService.getAssignees(ctx.isFullAdmin, ctx.accountId);
  }

  @RequirePermission('platform.dashboard.view')
  @Get('stats')
  getStats(@Query() query: unknown, @Req() req: PlatformRequest) {
    const { period, assignedAccountId } = StatsQuerySchema.parse(query);
    const ctx = resolvePlatformContext(req, 'platform.business.create');
    return this.dashboardService.getStats(period, ctx.isFullAdmin ? assignedAccountId : ctx.accountId, ctx.isFullAdmin);
  }
}
