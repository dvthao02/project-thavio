import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { PlatformDbService } from '@common/database/platform-db.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, PlatformDbService],
})
export class AccountsModule {}
