import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PAGINATION, TaskPriority, TaskStatus } from '../../shared';
import { TASK_STATUS_TRANSITIONS } from '../../shared';
import { TeamMembershipContext } from '../../common/types/team-membership-context';
import { TeamsService } from '../teams/teams.service';
import { dispatchDomainEvent } from '../../common/events/dispatch-domain-event';
import {
  TaskAssignedEvent,
  TaskChangedEvent,
  TaskChange,
} from '../../common/events/domain-events';
import { TASKS_REPOSITORY } from './tasks.tokens';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(
    @Inject(TASKS_REPOSITORY) private readonly tasksRepository: TasksRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly teamsService: TeamsService,
  ) {}

  private readonly logger = new Logger(TasksService.name);

  private dispatch(event: string, payload: unknown): Promise<void> {
    return dispatchDomainEvent(this.eventEmitter, this.logger, event, payload);
  }

  async list(
    userId: string,
    filters: import('./tasks.repository').TaskListFilters,
  ) {
    return this.tasksRepository.listForUser(
      userId,
      filters,
      PAGINATION.MAX_LIMIT,
    );
  }

  async get(userId: string, taskId: string) {
    const task = await this.tasksRepository.findByIdForUser(userId, taskId);

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

    const task = await this.tasksRepository.create({
      title: data.title,
      description: data.description,
      priority: data.priority ?? TaskPriority.MEDIUM,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assigneeId: data.assigneeId,
      creatorId: userId,
      teamId: data.teamId,
      meetingId: data.meetingId,
      decisionId: data.decisionId,
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

    const updated = await this.tasksRepository.update(task.id, {
      title: data.title ?? task.title,
      description:
        data.description !== undefined ? data.description : task.description,
      status: data.status ?? task.status,
      priority: data.priority ?? task.priority,
      dueDate:
        data.dueDate !== undefined ? new Date(data.dueDate) : task.dueDate,
      assigneeId:
        data.assigneeId !== undefined ? data.assigneeId : task.assigneeId,
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

    await this.tasksRepository.delete(task.id);

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
    const member = await this.teamsService.findMembership(teamId, assigneeId);

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
    const membership = await this.teamsService.findMembership(teamId, userId);

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    return membership;
  }

  private async taskOrThrow(userId: string, taskId: string) {
    const task = await this.tasksRepository.findForMutation(userId, taskId);

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    return task;
  }
}
