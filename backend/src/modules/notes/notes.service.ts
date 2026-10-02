import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MentionsService } from '../notifications/mentions.service';

type MeetingRef = {
  id: string;
  teamId: string;
  organizerId: string;
};

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mentions: MentionsService,
  ) {}

  async list(meetingRef: MeetingRef) {
    return this.prisma.meetingNote.findMany({
      where: { meetingId: meetingRef.id },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, meetingRef: MeetingRef, content: string) {
    await this.assertParticipant(userId, meetingRef.id);

    const note = await this.prisma.meetingNote.create({
      data: { meetingId: meetingRef.id, authorId: userId, content },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    await this.mentions.notifyMentions(
      meetingRef.teamId,
      userId,
      content,
      'NOTE',
      note.id,
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

    return this.prisma.meetingNote.update({
      where: { id: note.id },
      data: { content },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async remove(userId: string, meetingRef: MeetingRef, noteId: string) {
    const note = await this.noteOrThrow(meetingRef.id, noteId);
    this.assertCanModify(userId, meetingRef, note.authorId);

    await this.prisma.meetingNote.delete({ where: { id: note.id } });
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
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
      select: { id: true },
    });

    if (!participant) {
      throw new ForbiddenException(
        'Solo los participantes de la reunión pueden crear notas',
      );
    }
  }

  private async noteOrThrow(meetingId: string, noteId: string) {
    const note = await this.prisma.meetingNote.findFirst({
      where: { id: noteId, meetingId },
    });

    if (!note) {
      throw new NotFoundException('Nota no encontrada');
    }

    return note;
  }
}
