import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TeamRole } from '../../shared';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { TeamsService } from './teams.service';

const ownerMembership = { teamId: 'team_1', role: TeamRole.OWNER };
const adminMembership = { teamId: 'team_1', role: TeamRole.ADMIN };
const memberMembership = { teamId: 'team_1', role: TeamRole.MEMBER };

const buildUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'usr_target',
  email: 'target@correo.com',
  firstName: 'Target',
  lastName: '',
  alias: 'target',
  phone: '+521234567890',
  name: 'Target',
  avatarUrl: null,
  timezone: 'UTC',
  locale: 'es',
  passwordHash: '',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('TeamsService', () => {
  let service: TeamsService;
  let tx: {
    team: Record<string, jest.Mock>;
    teamMember: Record<string, jest.Mock>;
  };
  let prisma: {
    $transaction: jest.Mock;
    team: Record<string, jest.Mock>;
    teamMember: Record<string, jest.Mock>;
  };
  let usersService: { findByEmail: jest.Mock };

  const team = {
    id: 'team_1',
    name: 'Producto Cero',
    description: null,
    ownerId: 'usr_owner',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      team: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      teamMember: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    tx = {
      team: {
        create: jest.fn().mockResolvedValue(team),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ ...team, _count: { members: 1 } }),
      },
      teamMember: {
        create: jest.fn().mockResolvedValue({ id: 'tm_1' }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ role: TeamRole.OWNER }),
      },
    };

    prisma.team.findUniqueOrThrow.mockResolvedValue(team);

    usersService = { findByEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: usersService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  describe('create', () => {
    it('crea el equipo y al OWNER como miembro dentro de una transacción', async () => {
      prisma.$transaction.mockImplementation(
        async (fn: (t: typeof tx) => unknown) => fn(tx),
      );

      const result = await service.create('usr_owner', {
        name: 'Producto Cero',
      });

      expect(result).toMatchObject({
        id: 'team_1',
        role: TeamRole.OWNER,
        memberCount: 1,
      });
      expect(tx.team.create).toHaveBeenCalledWith({
        data: {
          name: 'Producto Cero',
          description: undefined,
          ownerId: 'usr_owner',
        },
      });
      expect(tx.teamMember.create).toHaveBeenCalledWith({
        data: { teamId: 'team_1', userId: 'usr_owner', role: TeamRole.OWNER },
      });
    });
  });

  describe('listForUser', () => {
    it('consulta los equipos por el usuario y no a todos', async () => {
      prisma.teamMember.findMany = jest.fn().mockResolvedValue([]);
      const prismaAny = prisma as unknown as {
        teamMember: { findMany: jest.Mock };
      };

      const result = await service.listForUser('usr_1');

      expect(prismaAny.teamMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'usr_1' } }),
      );
      expect(result).toEqual([]);
    });
  });

  describe('invite', () => {
    it('el OWNER invita por correo a un usuario registrado como MEMBER', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());
      prisma.teamMember.findUnique.mockResolvedValue(null);
      prisma.teamMember.create.mockResolvedValue({
        id: 'tm_2',
        role: TeamRole.MEMBER,
        user: {
          id: 'usr_target',
          firstName: 'Target',
          lastName: '',
          email: 'target@correo.com',
          avatarUrl: null,
        },
      });

      const member = await service.invite(
        'usr_owner',
        'team_1',
        'target@correo.com',
        ownerMembership,
      );

      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'target@correo.com',
      );
      expect(prisma.teamMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamId: 'team_1',
            userId: 'usr_target',
            role: TeamRole.MEMBER,
          }),
        }),
      );
      expect(member).toMatchObject({ id: 'tm_2', role: TeamRole.MEMBER });
    });

    it('un MEMBER no puede invitar → 403', async () => {
      await expect(
        service.invite(
          'usr_member',
          'team_1',
          'x@correo.com',
          memberMembership,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lanza 404 si el correo no tiene cuenta', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.invite(
          'usr_owner',
          'team_1',
          'nadie@correo.com',
          ownerMembership,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza 409 si el usuario ya es miembro', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());
      prisma.teamMember.findUnique.mockResolvedValue({ id: 'tm_1' });

      await expect(
        service.invite(
          'usr_owner',
          'team_1',
          'target@correo.com',
          ownerMembership,
        ),
      ).rejects.toThrow(/ya pertenece/);
    });
  });

  describe('changeRole', () => {
    it('el OWNER promueve a un MEMBER a ADMIN', async () => {
      prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.OWNER });
      prisma.teamMember.findFirst.mockResolvedValue({
        id: 'tm_2',
        role: TeamRole.MEMBER,
      });
      prisma.teamMember.update.mockResolvedValue({
        id: 'tm_2',
        role: TeamRole.ADMIN,
      });

      const result = await service.changeRole(
        'usr_owner',
        'team_1',
        'tm_2',
        TeamRole.ADMIN,
        ownerMembership,
      );

      expect(result.role).toBe(TeamRole.ADMIN);
    });

    it('ningún ADMIN puede degradar a otro ADMIN → 403', async () => {
      prisma.teamMember.findFirst.mockResolvedValue({
        id: 'tm_2',
        role: TeamRole.ADMIN,
      });

      await expect(
        service.changeRole(
          'usr_admin',
          'team_1',
          'tm_2',
          TeamRole.MEMBER,
          adminMembership,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('no permite asignar el rol OWNER desde changeRole → 400', async () => {
      prisma.teamMember.findFirst.mockResolvedValue({
        id: 'tm_2',
        role: TeamRole.MEMBER,
      });

      await expect(
        service.changeRole(
          'usr_owner',
          'team_1',
          'tm_2',
          TeamRole.OWNER,
          ownerMembership,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('el OWNER no se puede tocar → 403', async () => {
      prisma.teamMember.findFirst.mockResolvedValue({
        id: 'tm_owner',
        role: TeamRole.OWNER,
      });

      await expect(
        service.changeRole(
          'usr_owner',
          'team_1',
          'tm_owner',
          TeamRole.MEMBER,
          ownerMembership,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('el OWNER elimina a un MEMBER', async () => {
      prisma.teamMember.findFirst.mockResolvedValue({
        id: 'tm_2',
        role: TeamRole.MEMBER,
      });
      prisma.teamMember.delete.mockResolvedValue({ id: 'tm_2' });

      await expect(
        service.removeMember('usr_owner', 'team_1', 'tm_2', ownerMembership),
      ).resolves.toBeUndefined();

      expect(prisma.teamMember.delete).toHaveBeenCalledWith({
        where: { id: 'tm_2' },
      });
    });

    it('no se puede eliminar al OWNER → 400', async () => {
      prisma.teamMember.findFirst.mockResolvedValue({
        id: 'tm_owner',
        role: TeamRole.OWNER,
      });

      await expect(
        service.removeMember(
          'usr_owner',
          'team_1',
          'tm_owner',
          ownerMembership,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('un MEMBER no puede eliminar a nadie → 403', async () => {
      prisma.teamMember.findFirst.mockResolvedValue({
        id: 'tm_2',
        role: TeamRole.MEMBER,
      });

      await expect(
        service.removeMember('usr_member', 'team_1', 'tm_2', memberMembership),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('leave', () => {
    it('abandona el equipo si no es OWNER', async () => {
      prisma.teamMember.findUnique.mockResolvedValue({
        id: 'tm_2',
        role: TeamRole.MEMBER,
      });

      await expect(
        service.leave('usr_member', 'team_1'),
      ).resolves.toBeUndefined();
      expect(prisma.teamMember.delete).toHaveBeenCalledWith({
        where: { id: 'tm_2' },
      });
    });

    it('el OWNER no puede abandonar → 400', async () => {
      prisma.teamMember.findUnique.mockResolvedValue({
        id: 'tm_1',
        role: TeamRole.OWNER,
      });

      await expect(service.leave('usr_owner', 'team_1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('lanza 403 si no pertenece al equipo', async () => {
      prisma.teamMember.findUnique.mockResolvedValue(null);

      await expect(service.leave('usr_fuera', 'team_1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('transferOwnership', () => {
    const setup = () => {
      prisma.team.findUnique.mockResolvedValue({
        ...team,
        ownerId: 'usr_owner',
      });
      prisma.teamMember.findUnique
        .mockResolvedValueOnce({ id: 'tm_1', role: TeamRole.OWNER }) // del actual owner
        .mockResolvedValueOnce({ id: 'tm_2', role: TeamRole.ADMIN }); // del candidato
      prisma.$transaction.mockImplementation(
        async (fn: (ops: unknown[]) => unknown) => fn([]),
      );
    };

    it('un ADMIN no puede transferir → 403', async () => {
      prisma.team.findUnique.mockResolvedValue({
        ...team,
        ownerId: 'usr_owner',
      });

      await expect(
        service.transferOwnership('usr_admin', 'team_1', 'usr_2'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('el OWNER transfiere y queda como ADMIN', async () => {
      setup();
      prisma.teamMember.update
        .mockResolvedValueOnce({ id: 'tm_1', role: TeamRole.ADMIN })
        .mockResolvedValueOnce({ id: 'tm_2', role: TeamRole.OWNER });
      prisma.team.update.mockResolvedValue({ ...team, ownerId: 'usr_2' });
      prisma.$transaction.mockImplementation(
        async (ops: Array<() => Promise<unknown>>) => Promise.all(ops),
      );

      await service.transferOwnership('usr_owner', 'team_1', 'usr_2');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.teamMember.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'tm_1' },
        data: { role: TeamRole.ADMIN },
      });
      expect(prisma.teamMember.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'tm_2' },
        data: { role: TeamRole.OWNER },
      });
      expect(prisma.team.update).toHaveBeenCalledWith({
        where: { id: 'team_1' },
        data: { ownerId: 'usr_2' },
      });
    });
  });

  describe('delete', () => {
    it('elimina el equipo (miembros en cascada por Prisma)', async () => {
      prisma.team.findUnique.mockResolvedValue(team);
      prisma.teamMember.findUniqueOrThrow.mockResolvedValue({
        role: TeamRole.OWNER,
      });

      await expect(
        service.delete('usr_owner', 'team_1'),
      ).resolves.toBeUndefined();
      expect(prisma.team.delete).toHaveBeenCalledWith({
        where: { id: 'team_1' },
      });
    });

    it('lanza 404 si el equipo no existe', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      await expect(
        service.delete('usr_owner', 'team_x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
