import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type MeetingRef = {
  id: string;
  teamId: string;
  organizerId: string;
};

@Injectable()
export class DecisionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(meetingRef: MeetingRef) {
    return this.prisma.decision.findMany({
      where: { meetingId: meetingRef.id },
      include: {
        author: { select: { id: true, name: true, email: true } },
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

    return this.prisma.decision.create({
      data: {
        meetingId: meetingRef.id,
        authorId: userId,
        title: data.title,
        content: data.content,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(
    userId: string,
    meetingRef: MeetingRef,
    decisionId: string,
    data: { title?: string; content?: string },
  ) {
    const decision = await this.decisionOrThrow(meetingRef.id, decisionId);
    this.assertCanModify(userId, meetingRef, decision.authorId);

    return this.prisma.decision.update({
      where: { id: decision.id },
      data: {
        title: data.title ?? decision.title,
        content: data.content !== undefined ? data.content : decision.content,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
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
