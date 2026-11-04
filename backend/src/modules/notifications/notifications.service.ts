import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '../../shared';
import { TeamsService } from '../teams/teams.service';
import { ParticipantsService } from '../participants/participants.service';
import {
  DecisionCreatedEvent,
  MeetingCancelledEvent,
  MeetingCreatedEvent,
  MeetingUpdatedEvent,
  NotificationCreatedEvent,
  TaskAssignedEvent,
} from '../../common/events/domain-events';
import { NOTIFICATIONS_REPOSITORY } from './notifications.tokens';
import { NotificationsRepository } from './notifications.repository';

export type NotificationTemplate = {
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notificationsRepository: NotificationsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly teamsService: TeamsService,
    private readonly participantsService: ParticipantsService,
  ) {}

  async list(userId: string, read?: boolean) {
    return this.notificationsRepository.list(userId, read, 50);
  }

  async markAsRead(userId: string, id: string) {
    if (!(await this.notificationsRepository.existsForUser(id, userId))) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.notificationsRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string) {
    return this.notificationsRepository.markAllAsRead(userId);
  }

  /**
   * Persiste una notificación por destinatario y emite `notification.created`
   * para que el tiempo real la empuje sin esperar un refetch.
   */
  async createFor(
    recipients: string[],
    template: NotificationTemplate,
  ): Promise<number> {
    const unique = [...new Set(recipients.filter(Boolean))];

    if (unique.length === 0) {
      return 0;
    }

    const data = unique.map((userId) => ({
      userId,
      type: template.type,
      title: template.title,
      body: template.body,
      ...(template.metadata ? { metadata: template.metadata } : {}),
    }));

    const rows = await this.notificationsRepository.createMany(data);

    for (const row of rows) {
      this.eventEmitter.emit(
        'notification.created',
        new NotificationCreatedEvent(
          row.id as string,
          row.userId,
          row.type as string,
          row.title as string,
          row.body as string | null,
          (row.metadata as Record<string, unknown> | null) ?? null,
          (row.createdAt as Date).toISOString(),
        ),
      );
    }

    return rows.length;
  }

  private async notifyTeam(
    teamId: string,
    excludeUserId: string,
    template: NotificationTemplate,
  ): Promise<void> {
    await this.createFor(
      await this.teamsService.listMemberUserIds(teamId, excludeUserId),
      template,
    );
  }

  @OnEvent('meeting.created')
  async onMeetingCreated(event: MeetingCreatedEvent): Promise<void> {
    await this.notifyTeam(event.teamId, event.organizerId, {
      type: NotificationType.MEETING_INVITATION,
      title: 'Nueva reunión programada',
      body: `Se programó "${event.title}" en tu equipo.`,
      metadata: { meetingId: event.meetingId },
    });
  }

  @OnEvent('meeting.updated')
  async onMeetingUpdated(event: MeetingUpdatedEvent): Promise<void> {
    await this.notifyTeam(event.teamId, event.organizerId, {
      type: NotificationType.MEETING_UPDATED,
      title: 'Reunión actualizada',
      body: `"${event.title}" fue modificada.`,
      metadata: { meetingId: event.meetingId },
    });
  }

  @OnEvent('meeting.cancelled')
  async onMeetingCancelled(event: MeetingCancelledEvent): Promise<void> {
    await this.notifyTeam(event.teamId, event.organizerId, {
      type: NotificationType.MEETING_CANCELLED,
      title: 'Reunión cancelada',
      body: `"${event.title}" fue cancelada.`,
      metadata: { meetingId: event.meetingId },
    });
  }

  @OnEvent('task.assigned')
  async onTaskAssigned(event: TaskAssignedEvent): Promise<void> {
    if (event.assigneeId === event.creatorId) {
      return;
    }

    await this.createFor([event.assigneeId], {
      type: NotificationType.TASK_ASSIGNED,
      title: 'Tarea asignada',
      body: `Te asignaron "${event.title}".`,
      metadata: { taskId: event.taskId },
    });
  }

  @OnEvent('decision.created')
  async onDecisionCreated(event: DecisionCreatedEvent): Promise<void> {
    await this.createFor(
      await this.participantsService.listUserIdsByMeeting(
        event.meetingId,
        event.authorId,
      ),
      {
        type: NotificationType.DECISION_CREATED,
        title: 'Nueva decisión',
        body: `Se registró "${event.title}" en la reunión.`,
        metadata: { decisionId: event.decisionId, meetingId: event.meetingId },
      },
    );
  }
}
