import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { z } from 'zod';
import { RbacService } from './rbac.service';
import { RequirePermission } from '@decorators/require-permission.decorator';

const CreateRoleSchema = z.object({
  roleKey: z.string().min(2).max(100).regex(/^[a-z0-9_.-]+$/, 'Only lowercase letters, numbers, dots, dashes, underscores'),
  roleName: z.string().min(1).max(150),
  description: z.string().optional(),
  roleScope: z.enum(['platform', 'business']).default('platform'),
});

const UpdateRoleSchema = z.object({
  roleName: z.string().min(1).max(150).optional(),
  description: z.string().optional(),
});

const PermissionSchema = z.object({
  permissionId: z.string().uuid(),
});

@Controller('platform/rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @RequirePermission('platform.role.view')
  listRoles() {
    return this.rbacService.listRoles();
  }

  @Get('roles/:id')
  @RequirePermission('platform.role.view')
  getRole(@Param('id') id: string) {
    return this.rbacService.getRole(id);
  }

  @Post('roles')
  @RequirePermission('platform.role.create')
  createRole(@Body() body: unknown) {
    const dto = CreateRoleSchema.parse(body);
    return this.rbacService.createRole(dto);
  }

  @Patch('roles/:id')
  @RequirePermission('platform.role.update')
  updateRole(@Param('id') id: string, @Body() body: unknown) {
    const dto = UpdateRoleSchema.parse(body);
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @RequirePermission('platform.role.delete')
  deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }

  @Post('roles/:id/permissions')
  @RequirePermission('platform.role.assign_permission')
  addPermission(@Param('id') id: string, @Body() body: unknown) {
    const { permissionId } = PermissionSchema.parse(body);
    return this.rbacService.addPermission(id, permissionId);
  }

  @Delete('roles/:id/permissions/:permissionId')
  @RequirePermission('platform.role.assign_permission')
  removePermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.rbacService.removePermission(id, permissionId);
  }

  @Get('permissions')
  @RequirePermission('platform.role.view')
  listPermissions() {
    return this.rbacService.listPermissions();
  }
}
