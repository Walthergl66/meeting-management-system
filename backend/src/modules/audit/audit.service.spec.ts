import { Test, TestingModule } from '@nestjs/testing';
import { AuditAction, AuditEntityType, TaskStatus } from '../../shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';
import {
  DecisionCreatedEvent,
  MeetingCreatedEvent,
  TaskChangedEvent,
  TeamMembershipChangedEvent,
  UserAuthenticatedEvent,
} from '../../common/events/domain-events';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    auditLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    teamMember: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log_1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      teamMember: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AuditService);
  });

  describe('record', () => {
    it('persiste la acción con su contexto de red', async () => {
      await service.record(
        {
          action: AuditAction.USER_LOGIN,
          entity: AuditEntityType.USER,
          entityId: 'usr_1',
        },
        {
          userId: 'usr_1',
          ipAddress: '10.0.0.1',
          userAgent: 'jest',
        },
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'usr_1',
          action: AuditAction.USER_LOGIN,
          entity: AuditEntityType.USER,
          entityId: 'usr_1',
          ipAddress: '10.0.0.1',
          userAgent: 'jest',
          metadata: undefined,
        },
      });
    });

    it('nunca propaga un fallo de auditoría a la operación de negocio', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('db caída'));

      await expect(
        service.record(
          {
            action: AuditAction.USER_LOGIN,
            entity: AuditEntityType.USER,
            entityId: 'usr_1',
          },
          { userId: 'usr_1' },
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('listeners', () => {
    it('audita el login con IP y user agent', async () => {
      service.onUserAuthenticated(
        new UserAuthenticatedEvent('usr_1', '10.0.0.1', 'jest'),
      );
      await new Promise(process.nextTick);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AuditAction.USER_LOGIN,
          entityId: 'usr_1',
          ipAddress: '10.0.0.1',
        }),
      });
    });

    it('distingue TASK_CREATED, TASK_UPDATED y TASK_COMPLETED', async () => {
      const emit = (
        change: 'CREATED' | 'UPDATED' | 'DELETED',
        status: TaskStatus,
      ) =>
        service.onTaskChanged(
          new TaskChangedEvent(
            'task_1',
            'team_1',
            'mtg_1',
            'usr_1',
            change,
            status,
          ),
        );

      emit('CREATED', TaskStatus.TODO);
      emit('UPDATED', TaskStatus.IN_PROGRESS);
      emit('UPDATED', TaskStatus.DONE);

      await new Promise(process.nextTick);

      const actions = prisma.auditLog.create.mock.calls.map(
        ([arg]) => arg.data.action,
      );
      expect(actions).toEqual([
        AuditAction.TASK_CREATED,
        AuditAction.TASK_UPDATED,
        AuditAction.TASK_COMPLETED,
      ]);
    });

    it('audita la reunión creada con el organizador como actor', async () => {
      service.onMeetingCreated(
        new MeetingCreatedEvent('mtg_1', 'team_1', 'usr_1', 'Daily'),
      );
      await new Promise(process.nextTick);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AuditAction.MEETING_CREATED,
          entity: AuditEntityType.MEETING,
          entityId: 'mtg_1',
          userId: 'usr_1',
        }),
      });
    });

    it('distingue MEMBER_INVITED y MEMBER_REMOVED sobre el equipo', async () => {
      service.onTeamMembershipChanged(
        new TeamMembershipChangedEvent('team_1', 'usr_2', 'usr_1', 'INVITED'),
      );
      service.onTeamMembershipChanged(
        new TeamMembershipChangedEvent('team_1', 'usr_2', 'usr_1', 'REMOVED'),
      );
      await new Promise(process.nextTick);

      expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
        action: AuditAction.MEMBER_INVITED,
        entity: AuditEntityType.TEAM,
        entityId: 'team_1',
        userId: 'usr_1',
        metadata: { targetUserId: 'usr_2', change: 'INVITED' },
      });
      expect(prisma.auditLog.create.mock.calls[1][0].data.action).toBe(
        AuditAction.MEMBER_REMOVED,
      );
    });

    it('audita la decisión creada', async () => {
      service.onDecisionCreated(
        new DecisionCreatedEvent(
          'dec_1',
          'mtg_1',
          'team_1',
          'usr_1',
          'Aprobamos el plan',
          'Aprobamos el plan',
        ),
      );
      await new Promise(process.nextTick);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AuditAction.DECISION_CREATED,
          entity: AuditEntityType.DECISION,
          entityId: 'dec_1',
        }),
      });
    });
  });

  describe('list', () => {
    it('acota el registro a los miembros de los equipos del usuario', async () => {
      prisma.teamMember.findMany
        .mockResolvedValueOnce([{ teamId: 'team_1' }])
        .mockResolvedValueOnce([{ userId: 'usr_1' }, { userId: 'usr_2' }]);
      prisma.auditLog.count.mockResolvedValue(2);
      prisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.list('usr_1', { limit: 50, offset: 0 });

      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where.userId).toEqual({ in: ['usr_1', 'usr_2'] });
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('aplica los filtros de acción, entidad y rango de fechas', async () => {
      prisma.teamMember.findMany.mockResolvedValue([]);
      const from = new Date('2026-10-01T00:00:00.000Z');
      const to = new Date('2026-10-31T23:59:59.000Z');

      await service.list('usr_1', {
        action: AuditAction.MEETING_CREATED,
        entity: AuditEntityType.MEETING,
        entityId: 'mtg_1',
        userId: 'usr_2',
        from,
        to,
        limit: 10,
        offset: 5,
      });

      expect(prisma.auditLog.findMany.mock.calls[0][0]).toMatchObject({
        where: {
          action: AuditAction.MEETING_CREATED,
          entity: AuditEntityType.MEETING,
          entityId: 'mtg_1',
          userId: 'usr_2',
          createdAt: { gte: from, lte: to },
        },
        take: 10,
        skip: 5,
      });
    });

    it('devuelve la fila con el usuario resuelto', async () => {
      prisma.teamMember.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(1);
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log_1',
          userId: 'usr_1',
          user: { id: 'usr_1', name: 'Ana', email: 'ana@correo.com' },
          action: AuditAction.USER_LOGIN,
          entity: AuditEntityType.USER,
          entityId: 'usr_1',
          ipAddress: null,
          userAgent: null,
          metadata: null,
          createdAt: new Date('2026-10-01T10:00:00.000Z'),
        },
      ]);

      const result = await service.list('usr_1', { limit: 50, offset: 0 });

      expect(result.items[0]).toMatchObject({
        id: 'log_1',
        action: AuditAction.USER_LOGIN,
        user: { name: 'Ana' },
      });
      expect(result.total).toBe(1);
    });
  });
});
