import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEV_PASSWORD = 'Meetflow123!';

const USERS = [
  {
    email: 'owner@meetflow.local',
    firstName: 'Ana',
    lastName: 'Propietaria',
    alias: 'ana_propietaria',
    phone: '+5215500000001',
    timezone: 'America/Mexico_City',
  },
  {
    email: 'admin@meetflow.local',
    firstName: 'Administrador',
    lastName: 'Admin',
    alias: 'admin',
    phone: '+5215500000002',
    timezone: 'America/Mexico_City',
  },
  {
    email: 'member@meetflow.local',
    firstName: 'Miembro',
    lastName: 'Miembro',
    alias: 'miembro',
    phone: '+576010000003',
    timezone: 'America/Bogota',
  },
  {
    email: 'guest@meetflow.local',
    firstName: 'Invitado',
    lastName: 'Invitado',
    alias: 'invitado',
    phone: '+141500000004',
    timezone: 'UTC',
  },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  for (const user of USERS) {
    const common = {
      firstName: user.firstName,
      lastName: user.lastName,
      alias: user.alias,
      phone: user.phone,
      timezone: user.timezone,
    };
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: common,
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
