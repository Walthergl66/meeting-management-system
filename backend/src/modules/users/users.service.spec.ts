import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

const buildUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'usr_1',
  email: 'ana@correo.com',
  name: 'Ana',
  avatarUrl: null,
  timezone: 'UTC',
  locale: 'es',
  passwordHash: 'hash',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: Record<string, jest.Mock> };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleFixture.get(UsersService);
  });

  describe('findByEmail', () => {
    it('devuelve el usuario si existe', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.findByEmail('ana@correo.com')).resolves.toEqual(
        user,
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'ana@correo.com' },
      });
    });

    it('devuelve null si no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findByEmail('nadie@correo.com')).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('busca por identificador', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.findById('usr_1')).resolves.toEqual(user);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
      });
    });
  });

  describe('findActiveById', () => {
    it('devuelve el usuario si está activo', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.findActiveById('usr_1')).resolves.toEqual(user);
    });

    it('lanza NotFound si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findActiveById('usr_1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza Unauthorized si la cuenta está desactivada', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ isActive: false }));

      await expect(service.findActiveById('usr_1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('no filtra por isActive en la consulta: decide en memoria', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ isActive: false }));

      await expect(service.findActiveById('usr_1')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
      });
    });
  });

  describe('create', () => {
    it('crea el usuario con la zona horaria por defecto en UTC', async () => {
      const created = buildUser();
      prisma.user.create.mockResolvedValue(created);

      await service.create({
        email: 'ana@correo.com',
        name: 'Ana',
        passwordHash: 'hash',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'ana@correo.com',
          name: 'Ana',
          passwordHash: 'hash',
          timezone: 'UTC',
        },
      });
    });

    it('respeta la zona horaria indicada', async () => {
      prisma.user.create.mockResolvedValue(buildUser());

      await service.create({
        email: 'ana@correo.com',
        name: 'Ana',
        passwordHash: 'hash',
        timezone: 'America/Mexico_City',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ timezone: 'America/Mexico_City' }),
      });
    });
  });

  describe('update', () => {
    it('actualiza solo los campos recibidos', async () => {
      const updated = buildUser({ name: 'Ana Nueva' });
      prisma.user.update.mockResolvedValue(updated);

      await service.update('usr_1', { name: 'Ana Nueva' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        data: { name: 'Ana Nueva' },
      });
    });

    it('deja limpiar el avatar', async () => {
      prisma.user.update.mockResolvedValue(buildUser({ avatarUrl: null }));

      await service.update('usr_1', { avatarUrl: null });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        data: { avatarUrl: null },
      });
    });
  });

  describe('updatePasswordHash', () => {
    it('escribe solo el hash de la contraseña', async () => {
      const updated = buildUser({ passwordHash: 'nuevo' });
      prisma.user.update.mockResolvedValue(updated);

      await service.updatePasswordHash('usr_1', 'nuevo');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        data: { passwordHash: 'nuevo' },
      });
    });
  });
});
