import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { PlatformDbService } from '@common/database/platform-db.service';
import { PlatformPermissionCacheService } from '@common/auth/platform-permission-cache.service';

@Module({
  controllers: [RbacController],
  providers: [RbacService, PlatformDbService, PlatformPermissionCacheService],
})
export class RbacModule {}
