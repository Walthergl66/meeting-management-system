import {
  databaseNameFromUrl,
  isTestDatabase,
  resolveTestDatabaseUrl,
} from './test-database';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3000';
process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-jwt-secret-value-32chars';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3001';

// Aviso en consola cuando se cae al fallback de la base de desarrollo: si
// aparece esto, los e2e están a punto de escribir en meetflow.
if (!process.env.TEST_DATABASE_URL) {
  console.warn(
    `[e2e] TEST_DATABASE_URL no definida: se usará ${databaseNameFromUrl(
      process.env.DATABASE_URL,
    )}. Separa las bases con TEST_DATABASE_URL.`,
  );
} else if (!isTestDatabase(process.env.TEST_DATABASE_URL)) {
  throw new Error(
    `TEST_DATABASE_URL apunta a "${databaseNameFromUrl(
      process.env.TEST_DATABASE_URL,
    )}", que no parece una base de pruebas. Los e2e se niegan a continuar para ` +
      'no escribir en tus datos de desarrollo.',
  );
}
