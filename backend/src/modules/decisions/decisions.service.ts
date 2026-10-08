import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { dispatchDomainEvent } from '../../common/events/dispatch-domain-event';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DecisionCreatedEvent,
  DecisionUpdatedEvent,
} from '../../common/events/domain-events';

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
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private readonly logger = new Logger(DecisionsService.name);

  private dispatch(event: string, payload: unknown): Promise<void> {
    return dispatchDomainEvent(this.eventEmitter, this.logger, event, payload);
  }

  async list(meetingRef: MeetingRef) {
    return this.prisma.decision.findMany({
      where: { meetingId: meetingRef.id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    userId: string,
    meetingRef: MeetingRef,
    data: { title: string; content?: string },
  ) {
    await this.assertParticipant(userId, meetingRef.id);

    const decision = await this.prisma.decision.create({
      data: {
        meetingId: meetingRef.id,
        authorId: userId,
        title: data.title,
        content: data.content,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

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

    const updated = await this.prisma.decision.update({
      where: { id: decision.id },
      data: { title, content },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

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

    await this.prisma.decision.delete({ where: { id: decision.id } });
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
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
      select: { id: true },
    });

    if (!participant) {
      throw new ForbiddenException(
        'Solo los participantes de la reunión pueden crear decisiones',
      );
    }
  }

  private async decisionOrThrow(meetingId: string, decisionId: string) {
    const decision = await this.prisma.decision.findFirst({
      where: { id: decisionId, meetingId },
    });

    if (!decision) {
      throw new NotFoundException('Decisión no encontrada');
    }

    return decision;
  }
}
