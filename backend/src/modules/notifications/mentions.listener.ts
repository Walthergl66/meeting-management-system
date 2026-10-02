import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DecisionCreatedEvent,
  DecisionUpdatedEvent,
  NoteCreatedEvent,
  NoteUpdatedEvent,
} from '../../common/events/domain-events';
import { MentionContext, MentionsService } from './mentions.service';

type MentionPayload = {
  context: MentionContext;
  entityId: string;
  teamId: string;
  authorId: string;
  content: string;
  previousContent?: string | null;
};

/**
 * Puente entre el contenido de una reunión y las notificaciones por mención.
 *
 * Notas y decisiones solo emiten eventos de dominio: no saben nada del módulo de
 * notificaciones. Aquí se decide a quién se avisa, que es una decisión propia de
 * este módulo.
 *
 * La notificación nunca es crítica para la respuesta HTTP, así que se dispara
 * sin await y los fallos se registran en lugar de propagarse.
 */
@Injectable()
export class MentionsListener {
  private readonly logger = new Logger(MentionsListener.name);

  constructor(private readonly mentions: MentionsService) {}

  @OnEvent('note.created')
  onNoteCreated(event: NoteCreatedEvent): void {
    this.handle({
      context: 'NOTE',
      entityId: event.noteId,
      teamId: event.teamId,
      authorId: event.authorId,
      content: event.content,
    });
  }

  @OnEvent('note.updated')
  onNoteUpdated(event: NoteUpdatedEvent): void {
    this.handle({
      context: 'NOTE',
      entityId: event.noteId,
      teamId: event.teamId,
      authorId: event.authorId,
      content: event.content,
      previousContent: event.previousContent,
    });
  }

  @OnEvent('decision.created')
  onDecisionCreated(event: DecisionCreatedEvent): void {
    this.handle({
      context: 'DECISION',
      entityId: event.decisionId,
      teamId: event.teamId,
      authorId: event.authorId,
      content: event.searchableText,
    });
  }

  @OnEvent('decision.updated')
  onDecisionUpdated(event: DecisionUpdatedEvent): void {
    this.handle({
      context: 'DECISION',
      entityId: event.decisionId,
      teamId: event.teamId,
      authorId: event.authorId,
      content: event.searchableText,
      previousContent: event.previousSearchableText,
    });
  }

  private handle(payload: MentionPayload): void {
    const emails = this.mentions.newMentions(
      payload.content,
      payload.previousContent,
    );

    if (emails.length === 0) {
      return;
    }

    void this.mentions
      .notifyEmails(
        payload.teamId,
        payload.authorId,
        emails,
        payload.context,
        payload.entityId,
      )
      .catch((error: Error) => {
        this.logger.error(
          `No se pudo notificar la mención en ${payload.context} ${
            payload.entityId
          }: ${error.message}`,
        );
      });
  }
}
