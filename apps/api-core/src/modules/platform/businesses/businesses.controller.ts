import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { CreateBusinessSchema } from './dto/create-business.dto';
import { ListBusinessesSchema } from './dto/list-businesses.dto';
import { UpdateStatusSchema } from './dto/update-status.dto';

@Controller('platform/businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get()
  list(@Query() query: unknown) {
    const dto = ListBusinessesSchema.parse(query);
    return this.businessesService.list(dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.businessesService.getOne(id);
  }

  @Post()
  create(@Body() body: unknown) {
    const dto = CreateBusinessSchema.parse(body);
    return this.businessesService.create(dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const dto = UpdateStatusSchema.parse(body);
    return this.businessesService.updateStatus(id, dto);
  }
}
