import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { PlatformDbService } from '@common/database/platform-db.service';

@Module({
  controllers: [RbacController],
  providers: [RbacService, PlatformDbService],
})
export class RbacModule {}
