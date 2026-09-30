import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEV_PASSWORD = 'Meetflow123!';

const USERS = [
  {
    email: 'owner@meetflow.local',
    name: 'Ana Propietaria',
    timezone: 'America/Mexico_City',
  },
  {
    email: 'admin@meetflow.local',
    name: 'Administrador Admin',
    timezone: 'America/Mexico_City',
  },
  {
    email: 'member@meetflow.local',
    name: 'Miembro Miembro',
    timezone: 'America/Bogota',
  },
  {
    email: 'guest@meetflow.local',
    name: 'Invitado Invitado',
    timezone: 'UTC',
  },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  for (const user of USERS) {
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, timezone: user.timezone },
      create: { ...user, passwordHash },
    });

    process.stdout.write(
      `Usuario listo: ${upserted.email} (contraseña: ${DEV_PASSWORD})\n`,
    );
  }

  await prisma.refreshToken.deleteMany({});
  process.stdout.write('Refresh tokens de desarrollo limpiados\n');
}

main()
  .catch((error) => {
    process.stderr.write(`Seed falló: ${error}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
