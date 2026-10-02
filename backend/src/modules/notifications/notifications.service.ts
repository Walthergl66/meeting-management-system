import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@meetflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DecisionCreatedEvent,
  MeetingCancelledEvent,
  MeetingCreatedEvent,
  MeetingUpdatedEvent,
  NotificationCreatedEvent,
  TaskAssignedEvent,
} from '../../common/events/domain-events';

export type NotificationTemplate = {
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(userId: string, read?: boolean) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(read !== undefined ? { read } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(userId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
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
      ...(template.metadata ? { metadata: template.metadata as object } : {}),
    }));

    const rows = await this.prisma.notification.createManyAndReturn({ data });

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
    const members = await this.prisma.teamMember.findMany({
      where: { teamId, userId: { not: excludeUserId } },
      select: { userId: true },
    });

    await this.createFor(
      members.map((member) => member.userId),
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
    const participants = await this.prisma.meetingParticipant.findMany({
      where: { meetingId: event.meetingId, userId: { not: event.authorId } },
      select: { userId: true },
    });

    await this.createFor(
      participants.map((participant) => participant.userId),
      {
        type: NotificationType.DECISION_CREATED,
        title: 'Nueva decisión',
        body: `Se registró "${event.title}" en la reunión.`,
        metadata: { decisionId: event.decisionId, meetingId: event.meetingId },
      },
    );
  }
}
