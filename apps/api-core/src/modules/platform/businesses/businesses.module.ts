import { Module } from '@nestjs/common';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { PlatformDbService } from '@common/database/platform-db.service';
import { BusinessDbService } from '@common/database/business-db.service';

@Module({
  controllers: [BusinessesController],
  providers: [BusinessesService, PlatformDbService, BusinessDbService],
})
export class BusinessesModule {}
