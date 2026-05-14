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
  list(@Query() query: unknown, @Req() req: Request & { platformUser?: any }) {
    const dto = ListAccountsSchema.parse(query);
    const currentAccountId = req.platformUser?.sub as string;
    const perms = req.platformUser?.userPermissions as Set<string> | undefined;
    const isFullAdmin = perms?.has('platform.account.update') ?? false;
    return this.accountsService.list(dto, isFullAdmin ? undefined : currentAccountId);
  }

  @RequirePermission('platform.account.view')
  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: Request & { platformUser?: any }) {
    const currentAccountId = req.platformUser?.sub as string;
    const perms = req.platformUser?.userPermissions as Set<string> | undefined;
    const isFullAdmin = perms?.has('platform.account.update') ?? false;
    return this.accountsService.getOne(id, isFullAdmin ? undefined : currentAccountId);
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
    const currentAccountId = req.platformUser?.sub as string;
    const perms = req.platformUser?.userPermissions as Set<string> | undefined;
    const isFullAdmin = perms?.has('platform.account.update') ?? false;
    return this.accountsService.update(id, dto, currentAccountId, isFullAdmin ? undefined : currentAccountId);
  }

  @RequirePermission('platform.account.lock')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown, @Req() req: Request & { platformUser?: any }) {
    const { status } = UpdateAccountStatusSchema.parse(body);
    const currentAccountId = req.platformUser?.sub as string;
    const perms = req.platformUser?.userPermissions as Set<string> | undefined;
    const isFullAdmin = perms?.has('platform.account.lock') ?? false;
    return this.accountsService.updateStatus(id, status, currentAccountId, isFullAdmin ? undefined : currentAccountId);
  }

  @RequirePermission('platform.account.update')
  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: unknown, @Req() req: Request & { platformUser?: any }) {
    const { newPassword } = ResetPasswordSchema.parse(body);
    const currentAccountId = req.platformUser?.sub as string;
    const perms = req.platformUser?.userPermissions as Set<string> | undefined;
    const isFullAdmin = perms?.has('platform.account.update') ?? false;
    return this.accountsService.resetPassword(id, newPassword, isFullAdmin ? undefined : currentAccountId);
  }

  @RequirePermission('platform.role.assign_permission')
  @Post(':id/roles')
  assignRole(@Param('id') id: string, @Body() body: unknown) {
    const dto = AssignRoleSchema.parse(body);
    return this.accountsService.assignRole(id, dto.roleId, dto.scopeType, dto.scopeId);
  }

  @RequirePermission('platform.role.assign_permission')
  @Delete(':id/roles/:bindingId')
  removeRole(@Param('id') id: string, @Param('bindingId') bindingId: string) {
    return this.accountsService.removeRole(id, bindingId);
  }
}
