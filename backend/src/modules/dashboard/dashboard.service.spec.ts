import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '@meetflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

const NOW = new Date('2030-05-15T12:00:00.000Z');

const meetingRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'mtg_1',
  title: 'Reunión',
  startTime: NOW,
  endTime: new Date(NOW.getTime() + 3600_000),
  status: 'SCHEDULED',
  team: { id: 'team_1', name: 'Equipo' },
  ...overrides,
});

const decisionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'dec_1',
  title: 'Decisión',
  content: null,
  createdAt: NOW,
  meetingId: 'mtg_1',
  author: { id: 'usr_2', name: 'Ana' },
  meeting: { team: { name: 'Equipo' } },
  ...overrides,
});

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeEach(async () => {
    prisma = {
      teamMember: { findMany: jest.fn() },
      meeting: { findMany: jest.fn() },
      task: { findMany: jest.fn() },
      decision: { findMany: jest.fn() },
      meetingNote: { findMany: jest.fn() },
    };

    // findMany se llama en paralelo con distintas queries; se enruta por los
    // argumentos `select`/`orderBy` de cada consulta.
    prisma.meeting.findMany.mockImplementation((args: Record<string, any>) => {
      if (args.select?.createdAt) return Promise.resolve([]);
      if (args.where?.startTime) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    prisma.decision.findMany.mockResolvedValue([]);
    prisma.meetingNote.findMany.mockResolvedValue([]);
    prisma.task.findMany.mockResolvedValue([]);
    prisma.teamMember.findMany.mockResolvedValue([{ teamId: 'team_1' }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DashboardService);
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('devuelve ceros cuando el usuario no pertenece a ningún equipo', async () => {
    prisma.teamMember.findMany.mockResolvedValue([]);

    const result = await service.summary('usr_1');

    expect(result.metrics).toEqual({
      todayMeetings: 0,
      upcomingMeetings: 0,
      pendingTasks: 0,
      overdueTasks: 0,
    });
    expect(result.recentActivity).toEqual([]);
  });

  it('cuenta reuniones de hoy y próximas', async () => {
    prisma.meeting.findMany
      .mockImplementationOnce(() => Promise.resolve([meetingRow()]))
      .mockImplementationOnce(() =>
        Promise.resolve([meetingRow({ id: 'mtg_2' })]),
      )
      .mockImplementationOnce(() => Promise.resolve([]))
      .mockImplementationOnce(() => Promise.resolve([]));

    const result = await service.summary('usr_1');

    expect(result.metrics.todayMeetings).toBe(1);
    expect(result.metrics.upcomingMeetings).toBe(1);
    expect(result.todayMeetings[0].team.name).toBe('Equipo');
  });

  it('consulta tareas abiertas asignadas al usuario', async () => {
    prisma.task.findMany
      .mockImplementationOnce(() =>
        Promise.resolve([
          {
            id: 'task_1',
            title: 'Tarea vencida',
            priority: 'HIGH',
            dueDate: new Date('2030-05-01T00:00:00.000Z'),
            status: TaskStatus.TODO,
          },
          {
            id: 'task_2',
            title: 'Tarea futura',
            priority: 'LOW',
            dueDate: new Date('2030-06-01T00:00:00.000Z'),
            status: TaskStatus.IN_PROGRESS,
          },
          {
            id: 'task_3',
            title: 'Sin fecha',
            priority: 'MEDIUM',
            dueDate: null,
            status: TaskStatus.BLOCKED,
          },
        ]),
      )
      .mockImplementationOnce(() => Promise.resolve([]));

    const result = await service.summary('usr_1');

    expect(result.metrics.pendingTasks).toBe(3);
    expect(result.metrics.overdueTasks).toBe(1);
    expect(result.overdueTasks.map((t) => t.id)).toEqual(['task_1']);
    expect(result.pendingTasks.find((t) => t.id === 'task_3').isOverdue).toBe(
      false,
    );
    expect(prisma.task.findMany.mock.calls[0][0].where).toEqual({
      assigneeId: 'usr_1',
      status: {
        in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
      },
    });
  });

  it('presenta decisiones recientes del equipo', async () => {
    prisma.decision.findMany.mockImplementation((args: Record<string, any>) =>
      args.select?.content
        ? Promise.resolve([decisionRow()])
        : Promise.resolve([]),
    );

    const result = await service.summary('usr_1');

    expect(result.recentDecisions).toHaveLength(1);
    expect(result.recentDecisions[0].author.name).toBe('Ana');
    expect(result.recentDecisions[0].teamName).toBe('Equipo');
  });

  it('construye la actividad reciente ordenada de más nueva a más antigua', async () => {
    prisma.meeting.findMany.mockImplementation((args: Record<string, any>) =>
      args.select?.createdAt
        ? Promise.resolve([
            {
              id: 'mtg_1',
              title: 'Planificación',
              createdAt: new Date('2030-05-10T10:00:00.000Z'),
              updatedAt: new Date('2030-05-10T10:00:00.000Z'),
              organizer: { id: 'usr_2', name: 'Ana' },
              team: { name: 'Equipo' },
            },
          ])
        : Promise.resolve([]),
    );
    prisma.decision.findMany.mockImplementation((args: Record<string, any>) =>
      args.select?.content
        ? Promise.resolve([])
        : Promise.resolve([
            {
              id: 'dec_1',
              title: 'Adoptar Scrum',
              createdAt: new Date('2030-05-12T09:00:00.000Z'),
              meetingId: 'mtg_1',
              author: { id: 'usr_3', name: 'Luis' },
              meeting: { team: { name: 'Equipo' } },
            },
          ]),
    );
    prisma.task.findMany
      .mockImplementationOnce(() => Promise.resolve([]))
      .mockImplementationOnce(() =>
        Promise.resolve([
          {
            id: 'task_1',
            title: 'Redactar acta',
            createdAt: new Date('2030-05-14T08:00:00.000Z'),
            creator: { id: 'usr_4', name: 'Mara' },
            team: { name: 'Equipo' },
          },
        ]),
      );

    const result = await service.summary('usr_1');

    expect(result.recentActivity.map((entry) => entry.type)).toEqual([
      'TASK_CREATED',
      'DECISION_CREATED',
      'MEETING_CREATED',
    ]);
    expect(result.recentActivity[0].actor.name).toBe('Mara');
    expect(result.recentActivity[2].teamName).toBe('Equipo');
  });

  it('emite una entrada MEETING_UPDATED cuando la reunión fue editada', async () => {
    prisma.meeting.findMany.mockImplementation((args: Record<string, any>) =>
      args.select?.createdAt
        ? Promise.resolve([
            {
              id: 'mtg_1',
              title: 'Planificación',
              createdAt: new Date('2030-05-10T10:00:00.000Z'),
              updatedAt: new Date('2030-05-11T10:00:00.000Z'),
              organizer: { id: 'usr_2', name: 'Ana' },
              team: { name: 'Equipo' },
            },
          ])
        : Promise.resolve([]),
    );

    const result = await service.summary('usr_1');

    expect(result.recentActivity.map((entry) => entry.type)).toEqual([
      'MEETING_UPDATED',
      'MEETING_CREATED',
    ]);
  });

  it('tolera notas y decisiones huérfanas sin reunión', async () => {
    prisma.decision.findMany.mockImplementation((args: Record<string, any>) =>
      args.select?.content
        ? Promise.resolve([decisionRow({ meetingId: null, meeting: null })])
        : Promise.resolve([]),
    );
    prisma.meetingNote.findMany.mockResolvedValue([
      {
        id: 'note_1',
        content: 'Nota suelta',
        createdAt: new Date('2030-05-13T10:00:00.000Z'),
        meetingId: null,
        author: { id: 'usr_5', name: 'Iris' },
        meeting: null,
      },
    ]);

    const result = await service.summary('usr_1');

    expect(result.recentDecisions[0].teamName).toBeNull();
    expect(result.recentActivity).toHaveLength(1);
    expect(result.recentActivity[0].type).toBe('NOTE_CREATED');
  });
});
