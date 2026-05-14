import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { PlatformDbService } from '@common/database/platform-db.service';
import { PlatformMiddleware } from './middlewares/platform.middleware';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { PlatformAuthModule } from '@modules/platform/auth/auth.module';
import { BusinessAuthModule } from '@modules/business/auth/auth.module';
import { BusinessesModule } from '@modules/platform/businesses/businesses.module';
import { AccountsModule } from '@modules/platform/accounts/accounts.module';
import { DashboardModule } from '@modules/platform/dashboard/dashboard.module';
import { AuditLogsModule } from '@modules/platform/audit-logs/audit-logs.module';
import { AlertsModule } from '@modules/platform/alerts/alerts.module';
import { SubscriptionModule } from '@modules/business/subscription/subscription.module';
import { env } from '@config/env';

@Module({
  imports: [
    JwtModule.register({ secret: env.jwtSecret, signOptions: { expiresIn: env.jwtExpiresIn as any } }),
    PlatformAuthModule,
    BusinessAuthModule,
    BusinessesModule,
    AccountsModule,
    DashboardModule,
    AuditLogsModule,
    AlertsModule,
    SubscriptionModule,
  ],
  providers: [
    PlatformMiddleware,
    PlatformDbService,
    Reflector,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: PlatformPermissionGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PlatformMiddleware).forRoutes('platform/*');
  }
}
