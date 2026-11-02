import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { dispatchDomainEvent } from '../../common/events/dispatch-domain-event';
import { PAGINATION } from '../../shared';
import {
  NoteCreatedEvent,
  NoteUpdatedEvent,
} from '../../common/events/domain-events';
import { NOTES_REPOSITORY } from './notes.tokens';
import { NotesRepository } from './notes.repository';

type MeetingRef = {
  id: string;
  teamId: string;
  organizerId: string;
};

@Injectable()
export class NotesService {
  constructor(
    @Inject(NOTES_REPOSITORY) private readonly notesRepository: NotesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private readonly logger = new Logger(NotesService.name);

  private dispatch(event: string, payload: unknown): Promise<void> {
    return dispatchDomainEvent(this.eventEmitter, this.logger, event, payload);
  }

  async list(meetingRef: MeetingRef) {
    return this.notesRepository.listByMeeting(
      meetingRef.id,
      // Cualquier participante puede añadir notas sin limite.
      PAGINATION.MAX_LIMIT,
    );
  }

  async create(userId: string, meetingRef: MeetingRef, content: string) {
    await this.assertParticipant(userId, meetingRef.id);

    const note = await this.notesRepository.create(
      meetingRef.id,
      userId,
      content,
    );

    await this.dispatch(
      'note.created',
      new NoteCreatedEvent(
        note.id,
        meetingRef.id,
        meetingRef.teamId,
        userId,
        content,
      ),
    );

    return note;
  }

  async update(
    userId: string,
    meetingRef: MeetingRef,
    noteId: string,
    content: string,
  ) {
    const note = await this.noteOrThrow(meetingRef.id, noteId);
    this.assertCanModify(userId, meetingRef, note.authorId);

    const updated = await this.notesRepository.update(note.id, content);

    // Se difunde el texto anterior para que el módulo de notificaciones avise
    // solo de las menciones nuevas y no repita las ya notificadas.
    await this.dispatch(
      'note.updated',
      new NoteUpdatedEvent(
        updated.id,
        meetingRef.id,
        meetingRef.teamId,
        userId,
        content,
        note.content,
      ),
    );

    return updated;
  }

  async remove(userId: string, meetingRef: MeetingRef, noteId: string) {
    const note = await this.noteOrThrow(meetingRef.id, noteId);
    this.assertCanModify(userId, meetingRef, note.authorId);

    await this.notesRepository.delete(note.id);
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
      'Solo el autor o el organizador pueden modificar esta nota',
    );
  }

  private async assertParticipant(
    userId: string,
    meetingId: string,
  ): Promise<void> {
    if (!(await this.notesRepository.isMeetingParticipant(meetingId, userId))) {
      throw new ForbiddenException(
        'Solo los participantes de la reunión pueden crear notas',
      );
    }
  }

  private async noteOrThrow(meetingId: string, noteId: string) {
    const note = await this.notesRepository.findByMeeting(meetingId, noteId);

    if (!note) {
      throw new NotFoundException('Nota no encontrada');
    }

    return note;
  }
}
