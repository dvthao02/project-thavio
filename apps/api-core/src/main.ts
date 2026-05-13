import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from '@config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: env.corsOrigin });
  await app.listen(env.port);
  console.log(`API listening on http://localhost:${env.port}/api/v1`);
}

bootstrap();
