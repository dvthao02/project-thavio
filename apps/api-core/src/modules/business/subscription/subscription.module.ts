import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { PlatformDbService } from '@common/database/platform-db.service';
import { env } from '@config/env';

@Module({
  imports: [JwtModule.register({ secret: env.jwtSecret })],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, PlatformDbService],
})
export class SubscriptionModule {}
