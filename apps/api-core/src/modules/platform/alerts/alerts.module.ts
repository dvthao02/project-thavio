import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { PlatformDbService } from '@common/database/platform-db.service';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService, PlatformDbService],
})
export class AlertsModule {}
