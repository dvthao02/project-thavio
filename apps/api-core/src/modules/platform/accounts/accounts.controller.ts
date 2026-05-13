import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { AccountsService } from './accounts.service';
import { CreateAccountSchema } from './dto/create-account.dto';
import { ListAccountsSchema } from './dto/list-accounts.dto';

const UpdateAccountStatusSchema = z.object({
  status: z.enum(['active', 'locked', 'disabled']),
});

@Controller('platform/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  list(@Query() query: unknown) {
    const dto = ListAccountsSchema.parse(query);
    return this.accountsService.list(dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.accountsService.getOne(id);
  }

  @Post()
  create(@Body() body: unknown) {
    const dto = CreateAccountSchema.parse(body);
    return this.accountsService.create(dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const { status } = UpdateAccountStatusSchema.parse(body);
    return this.accountsService.updateStatus(id, status);
  }
}
