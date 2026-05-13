import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PlatformDbService } from '@common/database/platform-db.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, PlatformDbService],
})
export class DashboardModule {}
