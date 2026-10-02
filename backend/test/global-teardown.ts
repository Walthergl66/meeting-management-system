import { PrismaClient } from '@prisma/client';
import { databaseNameFromUrl, resolveTestDatabaseUrl } from './test-database';

/**
 * Vacía la base de pruebas al terminar la suite, para que la siguiente
 * ejecución arranque con las mismas tablas vacías y no acumule usuarios de
 * pruebas anteriores.
 *
 * No borra la base, solo sus tablas: la siguiente vez que se corran los e2e,
 * `prisma migrate deploy` debe encontrar la base ya creada y solo aplicar
 * migraciones pendientes.
 */
async function truncateAllTables(): Promise<void> {
  // globalTeardown corre en su propio proceso, donde setup-e2e.ts no se ha
  // ejecutado: hay que darle la URL en vez de confiar en DATABASE_URL.
  const prisma = new PrismaClient({
    datasources: { db: { url: resolveTestDatabaseUrl() } },
  });

  try {
    const tables: Array<{ tablename: string }> = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE '_prisma%'
        AND tablename NOT IN ('spatial_ref_sys')
    `;

    if (tables.length === 0) {
      return;
    }

    const quoted = tables
      .map(({ tablename }) => `"public"."${tablename}"`)
      .join(', ');

    // RESTART IDENTITY resetea las secuencias; CASCADE resuelve las FK entre
    // tablas de una sola vez.
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

export default async function globalTeardown(): Promise<void> {
  // Sin TEST_DATABASE_URL se está usando la base de desarrollo: no se toca.
  if (!process.env.TEST_DATABASE_URL) {
    return;
  }

  const url = resolveTestDatabaseUrl();

  try {
    await truncateAllTables();
    console.log(`[e2e] Base de pruebas "${databaseNameFromUrl(url)}" vaciada.`);
  } catch (error) {
    // Que el teardown falle ensucia el resultado de una suite que sí pasó. Se
    // avisa y se deja el código de salida intacto.
    console.warn(
      '[e2e] No se pudo vaciar la base de pruebas:',
      error instanceof Error ? error.message : error,
    );
  }
}
