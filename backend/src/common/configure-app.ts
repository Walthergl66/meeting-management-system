import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { RootConfig } from '../config/configuration';
import { buildSecurityHeadersOptions, resolveTrustProxy } from './security';

export function configureApp(app: INestApplication): INestApplication {
  app.use(cookieParser());

  const configService = app.get(ConfigService<RootConfig, true>);

  app.use(helmet(buildSecurityHeadersOptions()));

  // Solo se confian las cabeceras de reenvio si el entorno lo declara: ver
  // resolveTrustProxy. Sin un proxy delante, activarlo permitiría falsear la IP.
  const trustProxy = resolveTrustProxy(
    configService.get('app', { infer: true })?.trustProxy,
  );
  if (trustProxy !== false) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  app.enableShutdownHooks();

  // Express anuncia su versión en cada respuesta; no hace falta.
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  return app;
}
