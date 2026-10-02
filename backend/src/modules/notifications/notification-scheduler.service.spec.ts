import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType, TaskStatus } from '@meetflow/types';
import { NOTIFICATION_SCHEDULER } from '@meetflow/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationsService } from './notifications.service';

const NOW = new Date('2030-06-10T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

describe('NotificationSchedulerService', () => {
  let service: NotificationSchedulerService;
  let notifications: { createFor: jest.Mock };
  let prisma: {
    meeting: { findMany: jest.Mock };
    task: { findMany: jest.Mock };
    notification: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      meeting: { findMany: jest.fn() },
      task: { findMany: jest.fn() },
      notification: { findFirst: jest.fn() },
    };
    notifications = { createFor: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(NotificationSchedulerService);
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('crea recordatorios para los participantes de reuniones próximas', async () => {
    prisma.meeting.findMany.mockResolvedValue([
      {
        id: 'mtg_1',
        title: 'Daily',
        startTime: new Date(NOW.getTime() + 30 * 60 * 1000),
        participants: [
          { userId: 'usr_2' },
          { userId: 'usr_3' },
          { userId: 'usr_2' },
        ],
      },
    ]);
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.task.findMany.mockResolvedValue([]);

    await service.sweep();

    expect(notifications.createFor).toHaveBeenCalledWith(['usr_2'], {
      type: NotificationType.MEETING_REMINDER,
      title: 'La reunión empieza pronto',
      body: expect.stringContaining('Daily'),
      metadata: { meetingId: 'mtg_1' },
    });
    expect(notifications.createFor).toHaveBeenCalledWith(['usr_3'], {
      type: NotificationType.MEETING_REMINDER,
      title: 'La reunión empieza pronto',
      body: expect.stringContaining('Daily'),
      metadata: { meetingId: 'mtg_1' },
    });
  });

  it('no duplica recordatorios si ya existe uno en la ventana', async () => {
    prisma.meeting.findMany.mockResolvedValue([
      {
        id: 'mtg_1',
        title: 'Daily',
        startTime: new Date(NOW.getTime() + 30 * 60 * 1000),
        participants: [{ userId: 'usr_2' }],
      },
    ]);
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notif_1',
      metadata: { meetingId: 'mtg_1' },
    });
    prisma.task.findMany.mockResolvedValue([]);

    await service.sweep();

    expect(notifications.createFor).not.toHaveBeenCalled();
  });

  it('solo considera reuniones programadas en la ventana de recordatorio', async () => {
    prisma.meeting.findMany.mockResolvedValue([]);
    prisma.task.findMany.mockResolvedValue([]);

    await service.sweep();

    const where = prisma.meeting.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('SCHEDULED');
    expect(where.startTime.gte.getTime()).toBe(
      NOW.getTime() +
        NOTIFICATION_SCHEDULER.MEETING_REMINDER_MINUTES * 60 * 1000,
    );
  });

  it('avisa tareas que vencen dentro de la ventana próxima', async () => {
    prisma.meeting.findMany.mockResolvedValue([]);
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.task.findMany.mockImplementation((args: Record<string, any>) =>
      args.where.dueDate.gte
        ? Promise.resolve([
            {
              id: 'task_1',
              title: 'Redactar acta',
              assigneeId: 'usr_2',
              dueDate: new Date(NOW.getTime() + 2 * HOUR_MS),
            },
          ])
        : Promise.resolve([]),
    );

    await service.sweep();

    expect(notifications.createFor).toHaveBeenCalledWith(
      ['usr_2'],
      expect.objectContaining({
        type: NotificationType.TASK_DUE_SOON,
        metadata: expect.objectContaining({ taskId: 'task_1' }),
      }),
    );
  });

  it('avisa tareas vencidas y excluye las cerradas', async () => {
    prisma.meeting.findMany.mockResolvedValue([]);
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.task.findMany.mockImplementation((args: Record<string, any>) =>
      args.where.dueDate.gte
        ? Promise.resolve([])
        : Promise.resolve([
            {
              id: 'task_2',
              title: 'Tarea vieja',
              assigneeId: 'usr_3',
              dueDate: new Date(NOW.getTime() - 48 * HOUR_MS),
            },
          ]),
    );

    await service.sweep();

    expect(prisma.task.findMany.mock.calls[1][0].where.status).toEqual({
      in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
    });
    expect(notifications.createFor).toHaveBeenCalledWith(
      ['usr_3'],
      expect.objectContaining({ type: NotificationType.TASK_OVERDUE }),
    );
  });

  it('omite tareas sin responsable', async () => {
    prisma.meeting.findMany.mockResolvedValue([]);
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.task.findMany.mockImplementation((args: Record<string, any>) =>
      args.where.dueDate.gte
        ? Promise.resolve([
            {
              id: 'task_3',
              title: 'Sin dueño',
              assigneeId: null,
              dueDate: new Date(NOW.getTime() + HOUR_MS),
            },
          ])
        : Promise.resolve([]),
    );

    await service.sweep();

    expect(notifications.createFor).not.toHaveBeenCalled();
  });
});
