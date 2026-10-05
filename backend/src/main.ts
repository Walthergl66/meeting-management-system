import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CorsIoAdapter } from './common/adapters/cors-io.adapter';
import { configureApp } from './common/configure-app';
import { RootConfig } from './config/configuration';
import { resolveCorsOrigins } from './config/cors';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create(AppModule));
  const configService = app.get(ConfigService<RootConfig, true>);

  const { origins } = configService.get('cors', { infer: true });
  const isProduction = configService.get('app', { infer: true }).isProduction;
  const allowedOrigins = resolveCorsOrigins(origins, isProduction);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  });

  // El decorador del gateway se evalúa al importar el módulo, antes de que
  // ConfigModule lea el .env, así que su origen se inyecta aquí en runtime.
  app.useWebSocketAdapter(
    new CorsIoAdapter(app, {
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  setupSwagger(app);

  const port = configService.get('app', { infer: true }).port;
  await app.listen(port);

  new Logger('Bootstrap').log(`API escuchando en http://localhost:${port}`);
  new Logger('Bootstrap').log(`Swagger en http://localhost:${port}/api/docs`);
}

bootstrap();
