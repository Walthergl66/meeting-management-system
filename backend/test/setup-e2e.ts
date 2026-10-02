process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://meetflow:meetflow@localhost:5432/meetflow';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-jwt-secret-value-32chars';
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET ?? 'test-refresh-secret-value-32chars';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3001';
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3001';
