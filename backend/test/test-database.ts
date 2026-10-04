/**
 * Los e2e nunca deben escribir en la base de desarrollo. Por eso existe
 * TEST_DATABASE_URL: si está definida, es la única que se usa y la que se limpia
 * al terminar la suite.
 *
 * Sin TEST_DATABASE_URL se conserva el comportamiento anterior (DATABASE_URL),
 * para no romper a quien aún no ha separado las bases.
 */
export function resolveTestDatabaseUrl(): string {
  const testUrl = process.env.TEST_DATABASE_URL;

  if (testUrl) {
    return testUrl;
  }

  return (
    process.env.DATABASE_URL ??
    'postgresql://meetflow:meetflow@localhost:5432/meetflow'
  );
}

export function databaseNameFromUrl(url: string): string {
  const path = url.split('?')[0].split('/');
  return path[path.length - 1] ?? '';
}

/**
 * Se niega a limpiar cualquier base que no parezca de pruebas. Un nombre de
 * base es la única barrera real contra borrar los datos de desarrollo, así que
 * es un límite duro y no un aviso.
 */
export function isTestDatabase(url: string): boolean {
  return /test/i.test(databaseNameFromUrl(url));
}
