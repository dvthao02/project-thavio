import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { PlatformDbService } from '@common/database/platform-db.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService, PlatformDbService],
})
export class AuditLogsModule {}
