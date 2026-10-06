import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().allow('').default(''),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  // REFRESH_TOKEN_SECRET ya no se usa: los refresh tokens se guardan hasheados
  // con SHA-256, así que no hay ningún secreto que firmar. Se sigue admitiendo
  // para no romper despliegues que aún lo tengan en su .env, pero no se exige
  // ni se lee.
  REFRESH_TOKEN_SECRET: Joi.string().allow('').optional(),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),

  CORS_ORIGINS: Joi.string().default('http://localhost:3001'),

  // 'true' para un único proxy de confianza, o el número de saltos. Vacío
  // significa que no hay proxy delante y las cabeceras de reenvío se ignoran.
  // La cadena vacía se acepta a propósito: el compose la pasa siempre
  // (${TRUST_PROXY:-}) y, sin esta alternativa, Joi la rechazaba y la API
  // entraba en crashloop al arrancar con el stack de Docker.
  // La documentación de la API se desactiva en producción salvo que se pida.
  SWAGGER_ENABLED: Joi.boolean().default(false),

  TRUST_PROXY: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().integer().min(1), Joi.valid(''))
    .default(''),

  STORAGE_DRIVER: Joi.string().valid('local', 's3').default('local'),
  STORAGE_LOCAL_PATH: Joi.string().default('./uploads'),
  AWS_BUCKET: Joi.string().allow('').default(''),
  AWS_REGION: Joi.string().allow('').default(''),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),

  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  EMAIL_FROM: Joi.string().email().default('noreply@meetflow.local'),

  GEMINI_API_KEY: Joi.string().allow('').default(''),
}).unknown(true);

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const { error, value } = envValidationSchema.validate(config, {
    abortEarly: false,
  });

  if (error) {
    throw new Error(`Configuración de entorno inválida: ${error.message}`);
  }

  return value;
}
