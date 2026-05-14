import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { DashboardService } from './dashboard.service';
import { RequirePermission } from '@decorators/require-permission.decorator';

const StatsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '3m', '6m', '1y']).default('30d'),
  assignedAccountId: z.string().optional(),
});

@Controller('platform/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @RequirePermission('platform.dashboard.view')
  @Get('stats')
  getStats(@Query() query: unknown, @Req() req: Request & { platformUser?: any }) {
    const { period, assignedAccountId } = StatsQuerySchema.parse(query);
    const currentAccountId = req.platformUser?.sub as string;
    const perms = req.platformUser?.userPermissions as Set<string> | undefined;
    const isFullAdmin = perms?.has('platform.business.create') ?? false;
    return this.dashboardService.getStats(period, isFullAdmin ? assignedAccountId : currentAccountId, isFullAdmin);
  }
}
