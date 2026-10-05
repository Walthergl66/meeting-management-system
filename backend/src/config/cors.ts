import { Logger } from '@nestjs/common';

/**
 * Orígenes admitidos por defecto cuando no se declara CORS_ORIGINS y el
 * proceso no es de producción. Coincide con el puerto del frontend en `pnpm dev`.
 */
export const CORS_DEV_FALLBACK_ORIGINS = ['http://localhost:3001'] as const;

/**
 * Resuelve la lista de orígenes que aceptarán tanto HTTP como el handshake de
 * WebSocket. Es la única fuente: el gateway no puede leer configuración en su
 * decorador (se evalúa antes de que ConfigModule cargue el .env), así que su
 * origen se inyecta en el adaptador desde main.
 *
 * Nunca se devuelve un comodín. La API responde con `credentials: true` porque
 * el refresh token viaja en una cookie httpOnly; reflejar cualquier origen con
 * credenciales convierte cualquier sitio en un lector de respuestas
 * autenticadas de la víctima.
 */
export function resolveCorsOrigins(
  rawOrigins: readonly string[],
  isProduction: boolean,
): string[] {
  const origins = rawOrigins.map((origin) => origin.trim()).filter(Boolean);

  if (origins.includes('*')) {
    throw new Error(
      'CORS_ORIGINS no admite el comodín "*": la API usa credenciales, así que hay que enumerar los orígenes (ej. https://app.ejemplo.com).',
    );
  }

  if (origins.length > 0) {
    return origins;
  }

  if (isProduction) {
    throw new Error(
      'CORS_ORIGINS es obligatorio en producción: sin él la API no sabría qué orígenes aceptar.',
    );
  }

  new Logger('Cors').warn(
    `CORS_ORIGINS vacío; se usan los orígenes de desarrollo ${CORS_DEV_FALLBACK_ORIGINS.join(', ')}`,
  );

  return [...CORS_DEV_FALLBACK_ORIGINS];
}
