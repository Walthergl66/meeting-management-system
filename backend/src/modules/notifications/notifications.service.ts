import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@meetflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DecisionCreatedEvent,
  MeetingCancelledEvent,
  MeetingCreatedEvent,
  MeetingUpdatedEvent,
  TaskAssignedEvent,
} from '../../common/events/domain-events';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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

  @OnEvent('meeting.created')
  async onMeetingCreated(event: MeetingCreatedEvent) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId: event.teamId, userId: { not: event.organizerId } },
      select: { userId: true },
    });

    await this.prisma.notification.createMany({
      data: members.map((member) => ({
        userId: member.userId,
        type: NotificationType.MEETING_INVITATION,
        title: 'Nueva reunión programada',
        body: `Se programó "${event.title}" en tu equipo.`,
        metadata: { meetingId: event.meetingId },
      })),
    });
  }

  @OnEvent('meeting.updated')
  async onMeetingUpdated(event: MeetingUpdatedEvent) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId: event.teamId, userId: { not: event.organizerId } },
      select: { userId: true },
    });

    await this.prisma.notification.createMany({
      data: members.map((member) => ({
        userId: member.userId,
        type: NotificationType.MEETING_UPDATED,
        title: 'Reunión actualizada',
        body: `"${event.title}" fue modificada.`,
        metadata: { meetingId: event.meetingId },
      })),
    });
  }

  @OnEvent('meeting.cancelled')
  async onMeetingCancelled(event: MeetingCancelledEvent) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId: event.teamId, userId: { not: event.organizerId } },
      select: { userId: true },
    });

    await this.prisma.notification.createMany({
      data: members.map((member) => ({
        userId: member.userId,
        type: NotificationType.MEETING_CANCELLED,
        title: 'Reunión cancelada',
        body: `"${event.title}" fue cancelada.`,
        metadata: { meetingId: event.meetingId },
      })),
    });
  }

  @OnEvent('task.assigned')
  async onTaskAssigned(event: TaskAssignedEvent) {
    if (event.assigneeId === event.creatorId) {
      return;
    }

    await this.prisma.notification.create({
      data: {
        userId: event.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Tarea asignada',
        body: `Te asignaron "${event.title}".`,
        metadata: { taskId: event.taskId },
      },
    });
  }

  @OnEvent('decision.created')
  async onDecisionCreated(event: DecisionCreatedEvent) {
    const participants = await this.prisma.meetingParticipant.findMany({
      where: { meetingId: event.meetingId, userId: { not: event.authorId } },
      select: { userId: true },
    });

    await this.prisma.notification.createMany({
      data: participants.map((participant) => ({
        userId: participant.userId,
        type: NotificationType.DECISION_CREATED,
        title: 'Nueva decisión',
        body: `Se registró "${event.title}" en la reunión.`,
        metadata: { decisionId: event.decisionId, meetingId: event.meetingId },
      })),
    });
  }
}
