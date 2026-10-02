import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationType } from '../../shared';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import {
  DecisionCreatedEvent,
  MeetingCreatedEvent,
  TaskAssignedEvent,
} from '../../common/events/domain-events';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let eventEmitter: { emit: jest.Mock };
  let prisma: {
    notification: Record<string, jest.Mock>;
    teamMember: Record<string, jest.Mock>;
    meetingParticipant: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        createManyAndReturn: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      teamMember: {
        findMany: jest.fn(),
      },
      meetingParticipant: {
        findMany: jest.fn(),
      },
    };

    eventEmitter = { emit: jest.fn() };
    prisma.notification.createManyAndReturn.mockImplementation(
      ({ data }: { data: Array<Record<string, unknown>> }) =>
        Promise.resolve(
          data.map((row, index) => ({
            id: `notif_${index + 1}`,
            createdAt: new Date('2030-01-01T00:00:00.000Z'),
            ...row,
          })),
        ),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  describe('onMeetingCreated', () => {
    it('notifica a los miembros del equipo excepto al organizador', async () => {
      prisma.teamMember.findMany.mockResolvedValue([
        { userId: 'usr_2' },
        { userId: 'usr_3' },
      ]);

      await service.onMeetingCreated(
        new MeetingCreatedEvent('mtg_1', 'team_1', 'usr_1', 'Reunión A'),
      );

      expect(prisma.notification.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            userId: 'usr_2',
            type: NotificationType.MEETING_INVITATION,
          }),
          expect.objectContaining({
            userId: 'usr_3',
            type: NotificationType.MEETING_INVITATION,
          }),
        ],
      });
    });
  });

  describe('onTaskAssigned', () => {
    it('notifica al responsable si es distinto del creador', async () => {
      await service.onTaskAssigned(
        new TaskAssignedEvent('task_1', 'team_1', 'usr_2', 'usr_1', 'Tarea A'),
      );

      expect(prisma.notification.createManyAndReturn).toHaveBeenCalledWith({
        data: [expect.objectContaining({ userId: 'usr_2' })],
      });
    });

    it('no notifica si el responsable es el creador', async () => {
      await service.onTaskAssigned(
        new TaskAssignedEvent('task_1', 'team_1', 'usr_1', 'usr_1', 'Tarea A'),
      );

      expect(prisma.notification.createManyAndReturn).not.toHaveBeenCalled();
    });
  });

  describe('onDecisionCreated', () => {
    it('notifica a los participantes de la reunión excepto al autor', async () => {
      prisma.meetingParticipant.findMany.mockResolvedValue([
        { userId: 'usr_2' },
        { userId: 'usr_3' },
      ]);

      await service.onDecisionCreated(
        new DecisionCreatedEvent(
          'dec_1',
          'mtg_1',
          'team_1',
          'usr_1',
          'Decisión A',
          'Decisión A',
        ),
      );

      expect(prisma.notification.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            userId: 'usr_2',
            type: NotificationType.DECISION_CREATED,
          }),
          expect.objectContaining({
            userId: 'usr_3',
            type: NotificationType.DECISION_CREATED,
          }),
        ],
      });
    });
  });

  describe('createFor', () => {
    it('emite notification.created por cada destinatario', async () => {
      await service.createFor(['usr_2', 'usr_3'], {
        type: NotificationType.MENTION,
        title: 'Te mencionaron',
        body: 'cuerpo',
        metadata: { noteId: 'note_1' },
      });

      const created = eventEmitter.emit.mock.calls.filter(
        ([name]) => name === 'notification.created',
      );
      expect(created).toHaveLength(2);
      expect(created[0][1].userId).toBe('usr_2');
      expect(created[1][1].userId).toBe('usr_3');
      expect(created[0][1].id).toBe('notif_1');
    });

    it('no persiste si no hay destinatarios', async () => {
      const count = await service.createFor([], {
        type: NotificationType.MENTION,
        title: 'Te mencionaron',
        body: 'cuerpo',
      });

      expect(count).toBe(0);
      expect(prisma.notification.createManyAndReturn).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('lista notificaciones del usuario', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.list('usr_1');

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'usr_1' }),
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('marca una notificación propia como leída', async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: 'notif_1' });
      prisma.notification.update.mockResolvedValue({ id: 'notif_1' });

      await service.markAsRead('usr_1', 'notif_1');

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif_1', userId: 'usr_1' },
        select: { id: true },
      });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif_1' },
        data: { read: true },
      });
    });

    it('lanza NotFound si la notificación no pertenece al usuario', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('usr_1', 'notif_2')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('marca todas las notificaciones como leídas', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.markAllAsRead('usr_1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr_1', read: false },
        data: { read: true },
      });
    });
  });
});
