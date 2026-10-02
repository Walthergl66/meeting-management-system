import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AgendaChangedEvent,
  DecisionCreatedEvent,
  MeetingCancelledEvent,
  MeetingCreatedEvent,
  MeetingParticipantsChangedEvent,
  MeetingUpdatedEvent,
  NotificationCreatedEvent,
  TaskChangedEvent,
} from '../../common/events/domain-events';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Traduce eventos de dominio a eventos WebSocket. Los modulos de negocio solo
 * emiten eventos de dominio: el gateway nunca se inyecta en su logica.
 */
@Injectable()
export class RealtimeBridgeService {
  private readonly logger = new Logger(RealtimeBridgeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  @OnEvent('notification.created')
  onNotificationCreated(event: NotificationCreatedEvent): void {
    this.gateway.emitToUser(event.userId, 'notification:new', {
      id: event.id,
      type: event.type,
      title: event.title,
      body: event.body,
      read: false,
      metadata: event.metadata,
      createdAt: event.createdAt,
    });
  }

  @OnEvent('meeting.created')
  onMeetingCreated(event: MeetingCreatedEvent): void {
    this.gateway.emitToTeam(event.teamId, 'meeting:created', {
      meetingId: event.meetingId,
      title: event.title,
      organizerId: event.organizerId,
    });
  }

  @OnEvent('meeting.updated')
  onMeetingUpdated(event: MeetingUpdatedEvent): void {
    const payload = {
      meetingId: event.meetingId,
      title: event.title,
      teamId: event.teamId,
    };
    this.gateway.emitToMeeting(event.meetingId, 'meeting:updated', payload);
    this.gateway.emitToTeam(event.teamId, 'meeting:updated', payload);
  }

  @OnEvent('meeting.cancelled')
  onMeetingCancelled(event: MeetingCancelledEvent): void {
    const payload = { meetingId: event.meetingId, teamId: event.teamId };
    this.gateway.emitToMeeting(event.meetingId, 'meeting:cancelled', payload);
    this.gateway.emitToTeam(event.teamId, 'meeting:cancelled', payload);
  }

  @OnEvent('meeting.participants.changed')
  onParticipantsChanged(event: MeetingParticipantsChangedEvent): void {
    const payload = { meetingId: event.meetingId, teamId: event.teamId };
    this.gateway.emitToMeeting(
      event.meetingId,
      'meeting:participants:changed',
      payload,
    );
    this.gateway.emitToTeam(
      event.teamId,
      'meeting:participants:changed',
      payload,
    );
  }

  @OnEvent('agenda.changed')
  onAgendaChanged(event: AgendaChangedEvent): void {
    const payload = { meetingId: event.meetingId, teamId: event.teamId };
    this.gateway.emitToMeeting(event.meetingId, 'agenda:changed', payload);
    if (event.broadcastToTeam) {
      this.gateway.emitToTeam(event.teamId, 'agenda:changed', payload);
    }
  }

  @OnEvent('task.changed')
  onTaskChanged(event: TaskChangedEvent): void {
    this.gateway.emitToTeam(event.teamId, 'task:changed', {
      taskId: event.taskId,
      meetingId: event.meetingId,
    });
  }

  @OnEvent('decision.created')
  onDecisionCreated(event: DecisionCreatedEvent): void {
    const payload = {
      decisionId: event.decisionId,
      meetingId: event.meetingId,
    };
    this.gateway.emitToMeeting(event.meetingId, 'decision:created', payload);
    this.gateway.emitToTeam(event.teamId, 'decision:created', payload);
  }

  broadcastToMeeting(meetingId: string, event: string, payload: unknown): void {
    try {
      this.gateway.emitToMeeting(meetingId, event, payload);
    } catch (error) {
      this.logger.warn(`Fallo al emitir ${event}: ${(error as Error).message}`);
    }
  }
}
