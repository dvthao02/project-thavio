import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { CreateBusinessSchema } from './dto/create-business.dto';
import { ListBusinessesSchema } from './dto/list-businesses.dto';
import { UpdateStatusSchema } from './dto/update-status.dto';
import { UpdateBusinessSchema } from './dto/update-business.dto';
import { AddAssigneeSchema } from './dto/manage-assignee.dto';
import { CreateStaffSchema } from './dto/create-staff.dto';
import { UpdateStaffSchema } from './dto/update-staff.dto';
import { CreateStoreSchema } from './dto/create-store.dto';
import { UpdateStoreSchema } from './dto/update-store.dto';
import { ExtendTrialSchema } from './dto/extend-trial.dto';
import { RequirePermission } from '@decorators/require-permission.decorator';
import { resolvePlatformContext, type PlatformRequest } from '@common/auth/platform-context';

@Controller('platform/businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @RequirePermission('platform.business.view')
  @Get()
  list(@Query() query: unknown, @Req() req: PlatformRequest) {
    const dto = ListBusinessesSchema.parse(query);
    const ctx = resolvePlatformContext(req, 'platform.business.create');
    return this.businessesService.list(dto, ctx.isFullAdmin ? undefined : ctx.accountId);
  }

  @RequirePermission('platform.business.view')
  @Get('summary')
  summary(@Query() query: unknown, @Req() req: PlatformRequest) {
    const dto = ListBusinessesSchema.parse(query);
    const ctx = resolvePlatformContext(req, 'platform.business.create');
    return this.businessesService.summary(dto, ctx.isFullAdmin ? undefined : ctx.accountId);
  }

  @RequirePermission('platform.business.view')
  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: PlatformRequest) {
    const ctx = resolvePlatformContext(req, 'platform.business.create');
    return this.businessesService.getOne(id, ctx.isFullAdmin ? undefined : ctx.accountId);
  }

  @RequirePermission('platform.business.view')
  @Get(':id/stores')
  getStores(@Param('id') id: string) {
    return this.businessesService.getStores(id);
  }

  @RequirePermission('platform.business.update')
  @Post(':id/stores')
  createStore(@Param('id') id: string, @Body() body: unknown) {
    const dto = CreateStoreSchema.parse(body);
    return this.businessesService.createStore(id, dto);
  }

  @RequirePermission('platform.business.update')
  @Patch(':id/stores/:storeId')
  updateStore(@Param('id') id: string, @Param('storeId') storeId: string, @Body() body: unknown) {
    const dto = UpdateStoreSchema.parse(body);
    return this.businessesService.updateStore(id, storeId, dto);
  }

  @RequirePermission('platform.business.view')
  @Get(':id/assignees')
  getAssignees(@Param('id') id: string) {
    return this.businessesService.getAssignees(id);
  }

  @RequirePermission('platform.business.create')
  @Post()
  create(@Body() body: unknown, @Req() req: PlatformRequest) {
    const dto = CreateBusinessSchema.parse(body);
    const ctx = resolvePlatformContext(req);
    return this.businessesService.create(dto, ctx.actorId);
  }

  @RequirePermission('platform.business.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown, @Req() req: PlatformRequest) {
    const dto = UpdateBusinessSchema.parse(body);
    const ctx = resolvePlatformContext(req);
    return this.businessesService.update(id, dto, ctx.actorId);
  }

  @RequirePermission('platform.business.update')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown, @Req() req: PlatformRequest) {
    const dto = UpdateStatusSchema.parse(body);
    const ctx = resolvePlatformContext(req);
    return this.businessesService.updateStatus(id, dto, ctx.actorId);
  }

  @RequirePermission('platform.business.update')
  @Post(':id/trial/extend')
  extendTrial(@Param('id') id: string, @Body() body: unknown, @Req() req: PlatformRequest) {
    const { days } = ExtendTrialSchema.parse(body);
    const ctx = resolvePlatformContext(req);
    return this.businessesService.extendTrial(id, days, ctx.actorId);
  }

  @RequirePermission('platform.business.update')
  @Post(':id/assignees')
  addAssignee(@Param('id') id: string, @Body() body: unknown, @Req() req: PlatformRequest) {
    const dto = AddAssigneeSchema.parse(body);
    const ctx = resolvePlatformContext(req);
    return this.businessesService.addAssignee(id, dto, ctx.actorId);
  }

  @RequirePermission('platform.business.update')
  @Delete(':id/assignees/:accountId')
  removeAssignee(@Param('id') id: string, @Param('accountId') accountId: string) {
    return this.businessesService.removeAssignee(id, accountId);
  }

  @RequirePermission('platform.business.view')
  @Get(':id/staff')
  getStaff(@Param('id') id: string, @Query('storeId') storeId?: string) {
    return this.businessesService.getStaff(id, storeId);
  }

  @RequirePermission('platform.business.update')
  @Post(':id/staff')
  createStaff(@Param('id') id: string, @Body() body: unknown) {
    const dto = CreateStaffSchema.parse(body);
    return this.businessesService.createStaff(id, dto);
  }

  @RequirePermission('platform.business.update')
  @Patch(':id/staff/:staffId')
  updateStaff(@Param('id') id: string, @Param('staffId') staffId: string, @Body() body: unknown) {
    const dto = UpdateStaffSchema.parse(body);
    return this.businessesService.updateStaff(id, staffId, dto);
  }

  @RequirePermission('platform.business.update')
  @Patch(':id/plan')
  updatePlan(@Param('id') id: string, @Body() body: unknown, @Req() req: PlatformRequest) {
    const { plan } = (body as { plan?: string });
    const ctx = resolvePlatformContext(req);
    return this.businessesService.updatePlan(id, plan ?? '', ctx.actorId);
  }

  @RequirePermission('platform.business.update')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.businessesService.delete(id);
  }
}
