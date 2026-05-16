import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { PlatformDbService } from '@common/database/platform-db.service';
import { PlatformPermissionCacheService } from '@common/auth/platform-permission-cache.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, PlatformDbService, PlatformPermissionCacheService],
})
export class AccountsModule {}
