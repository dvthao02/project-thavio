import { Controller, Get, Param } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RequirePermission } from '@decorators/require-permission.decorator';

@Controller('platform/rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @RequirePermission('platform.rbac.view')
  listRoles() {
    return this.rbacService.listRoles();
  }

  @Get('roles/:id')
  @RequirePermission('platform.rbac.view')
  getRole(@Param('id') id: string) {
    return this.rbacService.getRole(id);
  }

  @Get('permissions')
  @RequirePermission('platform.rbac.view')
  listPermissions() {
    return this.rbacService.listPermissions();
  }
}
