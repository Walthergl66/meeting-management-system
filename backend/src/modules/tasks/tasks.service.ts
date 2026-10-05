import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PAGINATION, TaskPriority, TaskStatus } from '../../shared';
import { TASK_STATUS_TRANSITIONS } from '../../shared';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMembershipContext } from '../../common/guards/team-role.guard';
import { dispatchDomainEvent } from '../../common/events/dispatch-domain-event';
import {
  TaskAssignedEvent,
  TaskChangedEvent,
  TaskChange,
} from '../../common/events/domain-events';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private readonly logger = new Logger(TasksService.name);

  private dispatch(event: string, payload: unknown): Promise<void> {
    return dispatchDomainEvent(this.eventEmitter, this.logger, event, payload);
  }

  async list(
    userId: string,
    filters: {
      teamId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      meetingId?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    return this.prisma.task.findMany({
      where: {
        team: { members: { some: { userId } } },
        ...(filters.teamId ? { teamId: filters.teamId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
        ...(filters.meetingId ? { meetingId: filters.meetingId } : {}),
        ...(filters.from || filters.to
          ? {
              dueDate: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        meeting: { select: { id: true, title: true } },
        decision: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      // Cota dura: esta lista crece con todo el histórico del usuario y sin
      // limite se lleva la memoria del proceso. El recorte es silencioso; la
      // paginación real queda pendiente de decidir con el frontend.
      take: PAGINATION.MAX_LIMIT,
    });
  }

  async get(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, team: { members: { some: { userId } } } },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        meeting: { select: { id: true, title: true } },
        decision: { select: { id: true, title: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    return task;
  }

  async create(
    userId: string,
    data: {
      title: string;
      description?: string;
      priority?: TaskPriority;
      dueDate?: string;
      assigneeId?: string;
      teamId: string;
      meetingId?: string;
      decisionId?: string;
    },
  ) {
    const membership = await this.membershipOrThrow(userId, data.teamId);
    this.assertCanCreate(membership);

    if (data.assigneeId) {
      await this.assertAssigneeInTeam(data.teamId, data.assigneeId);
    }

    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority ?? TaskPriority.MEDIUM,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assigneeId: data.assigneeId,
        creatorId: userId,
        teamId: data.teamId,
        meetingId: data.meetingId,
        decisionId: data.decisionId,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        meeting: { select: { id: true, title: true } },
        decision: { select: { id: true, title: true } },
      },
    });

    if (data.assigneeId) {
      await this.dispatch(
        'task.assigned',
        new TaskAssignedEvent(
          task.id,
          task.teamId,
          task.assigneeId,
          userId,
          task.title,
        ),
      );
    }

    await this.notifyChanged(
      task.id,
      task.teamId,
      task.meetingId,
      userId,
      'CREATED',
      task.status,
    );

    return task;
  }

  async update(
    userId: string,
    taskId: string,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: string;
      assigneeId?: string;
    },
  ) {
    const task = await this.taskOrThrow(userId, taskId);
    const membership = await this.membershipOrThrow(userId, task.teamId);
    this.assertCanModify(userId, membership, task.creatorId, task.assigneeId);

    if (data.status && data.status !== task.status) {
      const allowed = TASK_STATUS_TRANSITIONS[task.status] ?? [];
      if (!allowed.includes(data.status)) {
        throw new UnprocessableEntityException(
          `Transición de ${task.status} a ${data.status} no permitida`,
        );
      }
    }

    if (data.assigneeId) {
      await this.assertAssigneeInTeam(task.teamId, data.assigneeId);
    }

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        title: data.title ?? task.title,
        description:
          data.description !== undefined ? data.description : task.description,
        status: data.status ?? task.status,
        priority: data.priority ?? task.priority,
        dueDate:
          data.dueDate !== undefined ? new Date(data.dueDate) : task.dueDate,
        assigneeId:
          data.assigneeId !== undefined ? data.assigneeId : task.assigneeId,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        meeting: { select: { id: true, title: true } },
        decision: { select: { id: true, title: true } },
      },
    });

    await this.notifyChanged(
      updated.id,
      updated.teamId,
      updated.meetingId,
      userId,
      'UPDATED',
      updated.status,
    );

    if (updated.assigneeId && updated.assigneeId !== task.assigneeId) {
      await this.dispatch(
        'task.assigned',
        new TaskAssignedEvent(
          updated.id,
          updated.teamId,
          updated.assigneeId,
          userId,
          updated.title,
        ),
      );
    }

    return updated;
  }

  async remove(userId: string, taskId: string) {
    const task = await this.taskOrThrow(userId, taskId);
    const membership = await this.membershipOrThrow(userId, task.teamId);
    this.assertCanModify(userId, membership, task.creatorId, task.assigneeId);

    await this.prisma.task.delete({ where: { id: task.id } });

    await this.notifyChanged(
      task.id,
      task.teamId,
      task.meetingId,
      userId,
      'DELETED',
      task.status,
    );
  }

  private async notifyChanged(
    taskId: string,
    teamId: string,
    meetingId: string | null,
    actorId: string,
    change: TaskChange,
    status: TaskStatus,
  ): Promise<void> {
    await this.dispatch(
      'task.changed',
      new TaskChangedEvent(taskId, teamId, meetingId, actorId, change, status),
    );
  }

  private assertCanCreate(membership: TeamMembershipContext): void {
    if (
      membership.role === 'OWNER' ||
      membership.role === 'ADMIN' ||
      membership.role === 'MEMBER'
    ) {
      return;
    }

    throw new ForbiddenException('No puedes crear tareas en este equipo');
  }

  private assertCanModify(
    userId: string,
    membership: TeamMembershipContext,
    creatorId: string,
    assigneeId: string | null,
  ): void {
    const isPrivileged =
      membership.role === 'OWNER' || membership.role === 'ADMIN';

    if (isPrivileged || creatorId === userId || assigneeId === userId) {
      return;
    }

    throw new ForbiddenException('No puedes modificar esta tarea');
  }

  private async assertAssigneeInTeam(
    teamId: string,
    assigneeId: string,
  ): Promise<void> {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: assigneeId } },
      select: { userId: true },
    });

    if (!member) {
      throw new UnprocessableEntityException(
        'El responsable debe ser un miembro del equipo',
      );
    }
  }

  private async membershipOrThrow(
    userId: string,
    teamId: string,
  ): Promise<TeamMembershipContext> {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    return { teamId, role: membership.role };
  }

  private async taskOrThrow(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, team: { members: { some: { userId } } } },
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    return task;
  }
}
