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
  REFRESH_TOKEN_SECRET: Joi.string().min(16).required(),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),

  CORS_ORIGINS: Joi.string().default('http://localhost:3001'),

  // Origen que acepta el gateway de WebSocket. No es la misma lista que
  // CORS_ORIGINS: aqui solo hay un origen valido (/realtime). Sin declararla,
  // un valor mal escrito pasaba el filtro .unknown(true) en silencio y el
  // handshake se rechazaba en tiempo de ejecucion.
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3001'),

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
