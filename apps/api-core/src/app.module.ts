import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { PlatformAuthModule } from '@modules/platform/auth/auth.module';
import { BusinessAuthModule } from '@modules/business/auth/auth.module';

@Module({
  imports: [PlatformAuthModule, BusinessAuthModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
