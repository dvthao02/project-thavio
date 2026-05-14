import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { BusinessesService } from './businesses.service';
import { CreateBusinessSchema } from './dto/create-business.dto';
import { ListBusinessesSchema } from './dto/list-businesses.dto';
import { UpdateStatusSchema } from './dto/update-status.dto';
import { RequirePermission } from '@decorators/require-permission.decorator';

@Controller('platform/businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @RequirePermission('platform.business.view')
  @Get()
  list(@Query() query: unknown, @Req() req: Request & { platformUser?: any }) {
    const dto = ListBusinessesSchema.parse(query);
    const currentAccountId = req.platformUser?.sub as string;
    const perms = req.platformUser?.userPermissions as Set<string> | undefined;
    const isFullAdmin = perms?.has('platform.business.create') ?? false;
    return this.businessesService.list(dto, isFullAdmin ? undefined : currentAccountId);
  }

  @RequirePermission('platform.business.view')
  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: Request & { platformUser?: any }) {
    const currentAccountId = req.platformUser?.sub as string;
    const perms = req.platformUser?.userPermissions as Set<string> | undefined;
    const isFullAdmin = perms?.has('platform.business.create') ?? false;
    return this.businessesService.getOne(id, isFullAdmin ? undefined : currentAccountId);
  }

  @RequirePermission('platform.business.create')
  @Post()
  create(@Body() body: unknown, @Req() req: Request & { platformUser?: any }) {
    const dto = CreateBusinessSchema.parse(body);
    return this.businessesService.create(dto, req.platformUser?.sub);
  }

  @RequirePermission('platform.business.update')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown, @Req() req: Request & { platformUser?: any }) {
    const dto = UpdateStatusSchema.parse(body);
    return this.businessesService.updateStatus(id, dto, req.platformUser?.sub);
  }
}
