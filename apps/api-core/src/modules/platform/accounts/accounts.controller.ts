import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AccountsService } from './accounts.service';
import { CreateAccountSchema } from './dto/create-account.dto';
import { ListAccountsSchema } from './dto/list-accounts.dto';
import { RequirePermission } from '@decorators/require-permission.decorator';

const UpdateAccountStatusSchema = z.object({
  status: z.enum(['active', 'locked', 'disabled']),
});

const UpdateAccountSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

const AssignRoleSchema = z.object({
  roleId: z.string().uuid(),
  scopeType: z.enum(['platform', 'business', 'store']).default('platform'),
  scopeId: z.string().uuid().optional(),
});

@Controller('platform/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @RequirePermission('platform.account.view')
  @Get()
  list(@Query() query: unknown) {
    const dto = ListAccountsSchema.parse(query);
    return this.accountsService.list(dto);
  }

  @RequirePermission('platform.account.view')
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.accountsService.getOne(id);
  }

  @RequirePermission('platform.account.create')
  @Post()
  create(@Body() body: unknown) {
    const dto = CreateAccountSchema.parse(body);
    return this.accountsService.create(dto);
  }

  @RequirePermission('platform.account.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown, @Req() req: Request & { platformUser?: any }) {
    const dto = UpdateAccountSchema.parse(body);
    return this.accountsService.update(id, dto, req.platformUser?.sub);
  }

  @RequirePermission('platform.account.lock')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown, @Req() req: Request & { platformUser?: any }) {
    const { status } = UpdateAccountStatusSchema.parse(body);
    return this.accountsService.updateStatus(id, status, req.platformUser?.sub);
  }

  @RequirePermission('platform.account.update')
  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: unknown) {
    const { newPassword } = ResetPasswordSchema.parse(body);
    return this.accountsService.resetPassword(id, newPassword);
  }

  @RequirePermission('platform.rbac.manage')
  @Post(':id/roles')
  assignRole(@Param('id') id: string, @Body() body: unknown) {
    const dto = AssignRoleSchema.parse(body);
    return this.accountsService.assignRole(id, dto.roleId, dto.scopeType, dto.scopeId);
  }

  @RequirePermission('platform.rbac.manage')
  @Delete(':id/roles/:bindingId')
  removeRole(@Param('id') id: string, @Param('bindingId') bindingId: string) {
    return this.accountsService.removeRole(id, bindingId);
  }
}
