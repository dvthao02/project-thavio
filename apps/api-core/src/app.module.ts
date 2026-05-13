import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { PlatformMiddleware } from './middlewares/platform.middleware';
import { PlatformAuthModule } from '@modules/platform/auth/auth.module';
import { BusinessAuthModule } from '@modules/business/auth/auth.module';
import { BusinessesModule } from '@modules/platform/businesses/businesses.module';
import { AccountsModule } from '@modules/platform/accounts/accounts.module';
import { DashboardModule } from '@modules/platform/dashboard/dashboard.module';
import { env } from '@config/env';

@Module({
  imports: [
    JwtModule.register({ secret: env.jwtSecret, signOptions: { expiresIn: env.jwtExpiresIn as any } }),
    PlatformAuthModule,
    BusinessAuthModule,
    BusinessesModule,
    AccountsModule,
    DashboardModule,
  ],
  providers: [
    PlatformMiddleware,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PlatformMiddleware).forRoutes('platform/*');
  }
}
