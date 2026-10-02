import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AuditAction,
  AuditEntityType,
  AuditLogFilter,
  TaskStatus,
} from '../../shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DecisionCreatedEvent,
  MeetingCancelledEvent,
  MeetingCreatedEvent,
  MeetingUpdatedEvent,
  TaskChangedEvent,
  TeamMembershipChangedEvent,
  UserAuthenticatedEvent,
} from '../../common/events/domain-events';

export type AuditContext = {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

type AuditEntry = {
  action: AuditAction;
  entity: AuditEntityType;
  entityId: string;
};

/**
 * Registro de auditoria. Los eventos de dominio ya describen que paso, asi que
 * la escritura es siempre asincrona y nunca bloquea la operacion de negocio:
 * un fallo de auditoria no puede tumbar la API.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, context: AuditContext): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: context.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
          metadata: context.metadata,
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo auditar ${entry.action} de ${entry.entity} ${entry.entityId}: ${
          (error as Error).message
        }`,
      );
    }
  }

  /**
   * Registro consultable. El alcance es la actividad de los miembros de los
   * equipos del usuario: la auditoria es un dato sensible y no se expone global.
   */
  async list(userId: string, filter: AuditLogFilter) {
    const teamIds = (
      await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      })
    ).map((membership) => membership.teamId);

    const teammates = (
      await this.prisma.teamMember.findMany({
        where: { teamId: { in: teamIds } },
        select: { userId: true },
      })
    ).map((membership) => membership.userId);

    const where: Prisma.AuditLogWhereInput = {
      userId: { in: [...new Set([userId, ...teammates])] },
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.entity ? { entity: filter.entity } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.from || filter.to
        ? {
            createdAt: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filter.limit,
        skip: filter.offset,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        user: row.user,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        metadata: row.metadata,
        timestamp: row.createdAt,
      })),
      total,
      limit: filter.limit,
      offset: filter.offset,
    };
  }

  @OnEvent('user.authenticated')
  onUserAuthenticated(event: UserAuthenticatedEvent): void {
    void this.record(
      {
        action: AuditAction.USER_LOGIN,
        entity: AuditEntityType.USER,
        entityId: event.userId,
      },
      {
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
    );
  }

  @OnEvent('user.logged_out')
  onUserLoggedOut(event: UserAuthenticatedEvent): void {
    void this.record(
      {
        action: AuditAction.USER_LOGOUT,
        entity: AuditEntityType.USER,
        entityId: event.userId,
      },
      {
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
    );
  }

  @OnEvent('meeting.created')
  onMeetingCreated(event: MeetingCreatedEvent): void {
    void this.record(
      {
        action: AuditAction.MEETING_CREATED,
        entity: AuditEntityType.MEETING,
        entityId: event.meetingId,
      },
      {
        userId: event.organizerId,
        metadata: { title: event.title, teamId: event.teamId },
      },
    );
  }

  @OnEvent('meeting.updated')
  onMeetingUpdated(event: MeetingUpdatedEvent): void {
    void this.record(
      {
        action: AuditAction.MEETING_UPDATED,
        entity: AuditEntityType.MEETING,
        entityId: event.meetingId,
      },
      {
        userId: event.organizerId,
        metadata: { title: event.title, teamId: event.teamId },
      },
    );
  }

  @OnEvent('meeting.cancelled')
  onMeetingCancelled(event: MeetingCancelledEvent): void {
    void this.record(
      {
        action: AuditAction.MEETING_CANCELLED,
        entity: AuditEntityType.MEETING,
        entityId: event.meetingId,
      },
      {
        userId: event.organizerId,
        metadata: { title: event.title, teamId: event.teamId },
      },
    );
  }

  @OnEvent('task.changed')
  onTaskChanged(event: TaskChangedEvent): void {
    const action = (() => {
      if (event.change === 'CREATED') return AuditAction.TASK_CREATED;
      if (event.status === TaskStatus.DONE) return AuditAction.TASK_COMPLETED;
      return AuditAction.TASK_UPDATED;
    })();

    void this.record(
      {
        action,
        entity: AuditEntityType.TASK,
        entityId: event.taskId,
      },
      {
        userId: event.actorId,
        metadata: {
          teamId: event.teamId,
          meetingId: event.meetingId,
          change: event.change,
          status: event.status,
        },
      },
    );
  }

  @OnEvent('team.membership.changed')
  onTeamMembershipChanged(event: TeamMembershipChangedEvent): void {
    const action =
      event.change === 'INVITED'
        ? AuditAction.MEMBER_INVITED
        : AuditAction.MEMBER_REMOVED;

    // El actor es quien invita o expulsa; el miembro afectado queda en el
    // metadata para poder reconstruir la traza completa del equipo.
    void this.record(
      {
        action,
        entity: AuditEntityType.TEAM,
        entityId: event.teamId,
      },
      {
        userId: event.actorId,
        metadata: { targetUserId: event.targetUserId, change: event.change },
      },
    );
  }

  @OnEvent('decision.created')
  onDecisionCreated(event: DecisionCreatedEvent): void {
    void this.record(
      {
        action: AuditAction.DECISION_CREATED,
        entity: AuditEntityType.DECISION,
        entityId: event.decisionId,
      },
      {
        userId: event.authorId,
        metadata: {
          title: event.title,
          meetingId: event.meetingId,
          teamId: event.teamId,
        },
      },
    );
  }
}
