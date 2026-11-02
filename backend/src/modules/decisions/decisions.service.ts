import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { dispatchDomainEvent } from '../../common/events/dispatch-domain-event';
import {
  DecisionCreatedEvent,
  DecisionUpdatedEvent,
} from '../../common/events/domain-events';
import { DECISIONS_REPOSITORY } from './decisions.tokens';
import { DecisionsRepository } from './decisions.repository';

type MeetingRef = {
  id: string;
  teamId: string;
  organizerId: string;
};

/** Título y contenido juntos, que es lo que se indexa y puede citar a alguien. */
function searchableTextOf(title: string, content?: string | null): string {
  return [title, content].filter(Boolean).join(' ');
}

@Injectable()
export class DecisionsService {
  constructor(
    @Inject(DECISIONS_REPOSITORY)
    private readonly decisionsRepository: DecisionsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private readonly logger = new Logger(DecisionsService.name);

  private dispatch(event: string, payload: unknown): Promise<void> {
    return dispatchDomainEvent(this.eventEmitter, this.logger, event, payload);
  }

  async list(meetingRef: MeetingRef) {
    return this.decisionsRepository.listByMeeting(meetingRef.id);
  }

  async create(
    userId: string,
    meetingRef: MeetingRef,
    data: { title: string; content?: string },
  ) {
    await this.assertParticipant(userId, meetingRef.id);

    const decision = await this.decisionsRepository.create(
      meetingRef.id,
      userId,
      data.title,
      data.content,
    );

    const searchable = searchableTextOf(decision.title, decision.content);

    await this.dispatch(
      'decision.created',
      new DecisionCreatedEvent(
        decision.id,
        meetingRef.id,
        meetingRef.teamId,
        userId,
        decision.title,
        searchable,
      ),
    );

    return decision;
  }

  async update(
    userId: string,
    meetingRef: MeetingRef,
    decisionId: string,
    data: { title?: string; content?: string },
  ) {
    const decision = await this.decisionOrThrow(meetingRef.id, decisionId);
    this.assertCanModify(userId, meetingRef, decision.authorId);

    const title = data.title ?? decision.title;
    const content =
      data.content !== undefined ? data.content : decision.content;

    const updated = await this.decisionsRepository.update(
      decision.id,
      title,
      content,
    );

    // El texto anterior viaja en el evento para que el módulo de
    // notificaciones avise solo de las menciones nuevas.
    await this.dispatch(
      'decision.updated',
      new DecisionUpdatedEvent(
        updated.id,
        meetingRef.id,
        meetingRef.teamId,
        userId,
        searchableTextOf(title, content),
        searchableTextOf(decision.title, decision.content),
      ),
    );

    return updated;
  }

  async remove(userId: string, meetingRef: MeetingRef, decisionId: string) {
    const decision = await this.decisionOrThrow(meetingRef.id, decisionId);
    this.assertCanModify(userId, meetingRef, decision.authorId);

    await this.decisionsRepository.delete(decision.id);
  }

  private assertCanModify(
    userId: string,
    meetingRef: MeetingRef,
    authorId: string,
  ): void {
    if (authorId === userId || meetingRef.organizerId === userId) {
      return;
    }

    throw new ForbiddenException(
      'Solo el autor o el organizador pueden modificar esta decisión',
    );
  }

  private async assertParticipant(
    userId: string,
    meetingId: string,
  ): Promise<void> {
    if (
      !(await this.decisionsRepository.isMeetingParticipant(meetingId, userId))
    ) {
      throw new ForbiddenException(
        'Solo los participantes de la reunión pueden crear decisiones',
      );
    }
  }

  private async decisionOrThrow(meetingId: string, decisionId: string) {
    const decision = await this.decisionsRepository.findByMeeting(
      meetingId,
      decisionId,
    );

    if (!decision) {
      throw new NotFoundException('Decisión no encontrada');
    }

    return decision;
  }
}
