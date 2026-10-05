import { HelmetOptions } from 'helmet';

/**
 * Cabeceras de seguridad de la API.
 *
 * La CSP y la COEP se desactivan a propósito. Esta API sirve JSON, no HTML: la
 * única página que renderiza es Swagger UI, que carga su CSS y su JavaScript
 * con scripts en línea y desde CDN. Con la CSP por defecto, /api/docs se
 * quedaría en blanco, y nadie se entera en los tests porque no hay e2e de
 * navegador. El resto de cabeceras (HSTS, nosniff, frameguard, referrer,
 * permisos) sí se aplican: en un backend no estorban y protegen respuestas
 * que el navegador llegue a interpretar por error.
 *
 * Si en el futuro el frontend se sirve desde este mismo proceso, hay que
 * reactivar la CSP con una lista de fuentes explícita.
 */
export function buildSecurityHeadersOptions(): HelmetOptions {
  return {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  };
}

/**
 * Exprés (y otros) reenvían X-Forwarded-For / X-Forwarded-Proto, pero
 * aceptar la cabecera sin más permite a cualquier cliente falseear su IP y su
 * esquema. Por eso el número de saltos de confianza se declara por entorno y no
 * se adivina: si no hay proxy delante, se queda en false.
 *
 * Acepta `true` (proxy único de confianza), un número de saltos o `false`.
 */
export function resolveTrustProxy(
  value: string | number | boolean | undefined,
): boolean | number {
  if (value === undefined || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : false;
  }

  const normalizado = value.trim().toLowerCase();

  if (normalizado === 'true') return true;
  if (normalizado === 'false') return false;

  const saltos = Number(normalizado);

  return Number.isInteger(saltos) && saltos > 0 ? saltos : false;
}
