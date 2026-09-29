import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './common/configure-app';
import { RootConfig } from './config/configuration';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create(AppModule));
  const configService = app.get(ConfigService<RootConfig, true>);

  const { origins } = configService.get('cors', { infer: true });
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  });

  setupSwagger(app);

  const port = configService.get('app', { infer: true }).port;
  await app.listen(port);

  new Logger('Bootstrap').log(`API escuchando en http://localhost:${port}`);
  new Logger('Bootstrap').log(`Swagger en http://localhost:${port}/api/docs`);
}

bootstrap();
