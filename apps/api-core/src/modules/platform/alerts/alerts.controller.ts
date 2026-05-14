import { Controller, Get } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { RequirePermission } from '@decorators/require-permission.decorator';

@Controller('platform/alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @RequirePermission('platform.dashboard.view')
  @Get()
  getAlerts() {
    return this.alertsService.getAlerts();
  }
}
