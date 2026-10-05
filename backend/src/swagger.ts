import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RootConfig } from './config/configuration';

/**
 * Documentar el contrato en producción expone la superficie completa de la API
 * a cualquiera que la alcance: endpoints, esquemas y nombres de entidades. Por
 * defecto se desactiva en producción y se puede reactivar con
 * SWAGGER_ENABLED=true, que es lo que hay que hacer si de verdad hace falta
 * publicarla detrás de una restricción de acceso.
 */
export function shouldServeSwagger(
  isProduction: boolean,
  flag: string | undefined,
): boolean {
  if (!isProduction) return true;
  return flag?.trim().toLowerCase() === 'true';
}

export function setupSwagger(app: INestApplication): boolean {
  const configService = app.get(ConfigService<RootConfig, true>);
  const isProduction =
    configService.get('app', { infer: true })?.isProduction ?? false;
  const flag = process.env.SWAGGER_ENABLED;

  if (!shouldServeSwagger(isProduction, flag)) {
    new Logger('Swagger').log(
      'Documentación desactivada en producción (SWAGGER_ENABLED para forzarla)',
    );
    return false;
  }

  const config = new DocumentBuilder()
    .setTitle('MeetFlow API')
    .setDescription(
      'Contrato de la API de MeetFlow. Fuente de verdad de los contratos frontend/backend.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('health', 'Estado del servicio')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  return true;
}
