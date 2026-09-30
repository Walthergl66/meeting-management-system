import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

export function configureApp(app: INestApplication): INestApplication {
  app.use(cookieParser());
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
  return app;
}
