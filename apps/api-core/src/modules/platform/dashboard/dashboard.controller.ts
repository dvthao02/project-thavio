import { Controller, Get, Query } from '@nestjs/common';
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
  getStats(@Query() query: unknown) {
    const { period } = StatsQuerySchema.parse(query);
    return this.dashboardService.getStats(period);
  }
}
