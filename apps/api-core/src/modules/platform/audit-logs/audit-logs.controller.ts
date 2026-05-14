import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { ListAuditLogsSchema } from './dto/list-audit-logs.dto';
import { RequirePermission } from '@decorators/require-permission.decorator';

@Controller('platform/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @RequirePermission('platform.audit.view')
  @Get()
  list(@Query() query: unknown) {
    const dto = ListAuditLogsSchema.parse(query);
    return this.auditLogsService.list(dto);
  }

  @RequirePermission('platform.audit.view')
  @Get('table-names')
  getTableNames() {
    return this.auditLogsService.getTableNames();
  }
}
