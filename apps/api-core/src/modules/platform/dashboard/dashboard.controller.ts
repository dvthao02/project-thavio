import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RequirePermission } from '@decorators/require-permission.decorator';

@Controller('platform/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @RequirePermission('platform.dashboard.view')
  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }
}
