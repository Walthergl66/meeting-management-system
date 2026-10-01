import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationType } from '@meetflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import {
  DecisionCreatedEvent,
  MeetingCreatedEvent,
  TaskAssignedEvent,
} from './events';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: Record<string, jest.Mock>;
    teamMember: Record<string, jest.Mock>;
    meetingParticipant: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
      },
      teamMember: {
        findMany: jest.fn(),
      },
      meetingParticipant: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
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

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
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

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'usr_2',
          type: NotificationType.TASK_ASSIGNED,
        }),
      });
    });

    it('no notifica si el responsable es el creador', async () => {
      await service.onTaskAssigned(
        new TaskAssignedEvent('task_1', 'team_1', 'usr_1', 'usr_1', 'Tarea A'),
      );

      expect(prisma.notification.create).not.toHaveBeenCalled();
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
        ),
      );

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
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
    it('marca una notificación como leída', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('usr_1', 'notif_1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif_1', userId: 'usr_1' },
        data: { read: true },
      });
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
