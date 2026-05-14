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
  list(@Query() query: unknown) {
    const dto = ListBusinessesSchema.parse(query);
    return this.businessesService.list(dto);
  }

  @RequirePermission('platform.business.view')
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.businessesService.getOne(id);
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
