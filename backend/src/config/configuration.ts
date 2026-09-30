import { parseDurationToMs, parseDurationToSeconds } from './duration';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  isProduction: boolean;
}

export interface DatabaseConfig {
  url: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: number;
  refreshSecret: string;
  refreshExpiresInMs: number;
}

export interface StorageConfig {
  driver: 'local' | 's3';
  localPath: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface AiConfig {
  geminiApiKey: string;
}

export interface RootConfig {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  cors: { origins: string[] };
  storage: StorageConfig;
  mail: MailConfig;
  ai: AiConfig;
}

export default (): RootConfig => ({
  app: {
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT, 10) || 3000,
    apiPrefix: process.env.API_PREFIX ?? '',
    isProduction: process.env.NODE_ENV === 'production',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: parseDurationToSeconds(process.env.JWT_EXPIRES_IN),
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshExpiresInMs: parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRES_IN),
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  storage: {
    driver: process.env.STORAGE_DRIVER as 'local' | 's3',
    localPath: process.env.STORAGE_LOCAL_PATH,
    bucket: process.env.AWS_BUCKET,
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  mail: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
  },
});
