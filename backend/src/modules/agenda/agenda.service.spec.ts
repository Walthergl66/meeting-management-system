import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TeamRole } from '../../shared';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AgendaService } from './agenda.service';

const organizerMembership = { teamId: 'team_1', role: TeamRole.MEMBER };

const meetingRef = {
  id: 'mtg_1',
  teamId: 'team_1',
  organizerId: 'usr_1',
  status: 'SCHEDULED',
};

const agendaItemRow = {
  id: 'agd_1',
  title: 'Demo de la nueva funcionalidad',
  description: null,
  durationMinutes: 20,
  order: 1,
  responsible: {
    id: 'usr_2',
    firstName: 'Responsable',
    lastName: '',
    email: 'resp@correo.com',
  },
};

describe('AgendaService', () => {
  let service: AgendaService;
  let prisma: {
    agendaItem: Record<string, jest.Mock>;
    teamMember: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      agendaItem: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
      teamMember: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgendaService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(AgendaService);
  });

  it('emite agenda.changed solo al equipo cuando la reunión está en curso', async () => {
    const emitter = { emit: jest.fn() };
    (service as unknown as { eventEmitter: unknown }).eventEmitter = emitter;
    prisma.agendaItem.aggregate.mockResolvedValue({ _max: { order: 0 } });
    prisma.agendaItem.create.mockResolvedValue(agendaItemRow);

    await service.create('usr_1', meetingRef, organizerMembership, {
      title: 'Punto',
    });

    const [eventName, event] = emitter.emit.mock.calls[0];
    expect(eventName).toBe('agenda.changed');
    expect(event.broadcastToTeam).toBe(false);
  });

  it('difunde agenda.changed al equipo con la reunión en curso', async () => {
    const emitter = { emit: jest.fn() };
    (service as unknown as { eventEmitter: unknown }).eventEmitter = emitter;
    prisma.agendaItem.aggregate.mockResolvedValue({ _max: { order: 0 } });
    prisma.agendaItem.create.mockResolvedValue(agendaItemRow);

    await service.create(
      'usr_1',
      { ...meetingRef, status: 'IN_PROGRESS' },
      organizerMembership,
      { title: 'Punto' },
    );

    const [, event] = emitter.emit.mock.calls[0];
    expect(event.broadcastToTeam).toBe(true);
  });

  describe('create', () => {
    it('crea un punto con el siguiente orden disponible', async () => {
      prisma.agendaItem.aggregate.mockResolvedValue({ _max: { order: 3 } });
      prisma.agendaItem.create.mockResolvedValue({
        ...agendaItemRow,
        order: 4,
      });

      const result = await service.create(
        'usr_1',
        meetingRef,
        organizerMembership,
        { title: 'Nuevo punto' },
      );

      expect(prisma.agendaItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 4 }),
        }),
      );
      expect(result.order).toBe(4);
    });

    it('rechaza con 422 cuando el responsable no es del equipo', async () => {
      prisma.teamMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create('usr_1', meetingRef, organizerMembership, {
          title: 'Punto sin responsable válido',
          responsibleId: 'usr_9',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('un miembro no puede crear puntos de agenda', async () => {
      await expect(
        service.create('usr_2', meetingRef, organizerMembership, {
          title: 'Punto no autorizado',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('el organizador actualiza un punto', async () => {
      prisma.agendaItem.findFirst.mockResolvedValue(agendaItemRow);
      prisma.agendaItem.update.mockResolvedValue({
        ...agendaItemRow,
        title: 'Demo actualizada',
      });

      const result = await service.update(
        'usr_1',
        meetingRef,
        organizerMembership,
        'agd_1',
        { title: 'Demo actualizada' },
      );

      expect(result.title).toBe('Demo actualizada');
    });

    it('rechaza con 404 si el punto no pertenece a la reunión', async () => {
      prisma.agendaItem.findFirst.mockResolvedValue(null);

      await expect(
        service.update('usr_1', meetingRef, organizerMembership, 'agd_9', {
          title: 'X',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('el organizador elimina un punto', async () => {
      prisma.agendaItem.findFirst.mockResolvedValue(agendaItemRow);
      prisma.agendaItem.delete.mockResolvedValue(undefined);

      await service.remove('usr_1', meetingRef, organizerMembership, 'agd_1');

      expect(prisma.agendaItem.delete).toHaveBeenCalledWith({
        where: { id: 'agd_1' },
      });
    });
  });

  describe('reorder', () => {
    it('guarda el orden correcto', async () => {
      prisma.agendaItem.findMany.mockResolvedValue([
        { id: 'agd_1' },
        { id: 'agd_2' },
        { id: 'agd_3' },
      ]);
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
        Promise.all(ops),
      );
      prisma.agendaItem.update.mockResolvedValue({});
      prisma.agendaItem.findMany
        .mockResolvedValueOnce([
          { id: 'agd_1' },
          { id: 'agd_2' },
          { id: 'agd_3' },
        ])
        .mockResolvedValueOnce([
          { ...agendaItemRow, id: 'agd_3', order: 1 },
          { ...agendaItemRow, id: 'agd_1', order: 2 },
          { ...agendaItemRow, id: 'agd_2', order: 3 },
        ]);

      const result = await service.reorder(
        'usr_1',
        meetingRef,
        organizerMembership,
        ['agd_3', 'agd_1', 'agd_2'],
      );

      expect(prisma.agendaItem.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: { order: 1 } }),
      );
      expect(prisma.agendaItem.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: { order: 2 } }),
      );
      expect(prisma.agendaItem.update).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ data: { order: 3 } }),
      );
      expect(result.map((item) => item.id)).toEqual([
        'agd_3',
        'agd_1',
        'agd_2',
      ]);
    });

    it('rechaza con 422 cuando un id no pertenece a la agenda', async () => {
      prisma.agendaItem.findMany.mockResolvedValue([{ id: 'agd_1' }]);

      await expect(
        service.reorder('usr_1', meetingRef, organizerMembership, [
          'agd_1',
          'agd_9',
        ]),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rechaza con 409 cuando faltan puntos en el orden', async () => {
      prisma.agendaItem.findMany.mockResolvedValue([
        { id: 'agd_1' },
        { id: 'agd_2' },
      ]);

      await expect(
        service.reorder('usr_1', meetingRef, organizerMembership, ['agd_1']),
      ).rejects.toThrow(ConflictException);
    });
  });
});
