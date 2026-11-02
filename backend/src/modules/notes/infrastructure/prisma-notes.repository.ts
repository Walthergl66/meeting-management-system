import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NoteMutationRecord,
  NoteRecord,
  NotesRepository,
} from '../notes.repository';

const noteAuthor = {
  author: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
};

@Injectable()
export class PrismaNotesRepository implements NotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByMeeting(meetingId: string, limit: number): Promise<NoteRecord[]> {
    return this.prisma.meetingNote.findMany({
      where: { meetingId },
      include: noteAuthor,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async isMeetingParticipant(
    meetingId: string,
    userId: string,
  ): Promise<boolean> {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
      select: { id: true },
    });
    return participant !== null;
  }

  findByMeeting(
    meetingId: string,
    noteId: string,
  ): Promise<NoteMutationRecord | null> {
    return this.prisma.meetingNote.findFirst({
      where: { id: noteId, meetingId },
    });
  }

  create(
    meetingId: string,
    authorId: string,
    content: string,
  ): Promise<NoteRecord> {
    return this.prisma.meetingNote.create({
      data: { meetingId, authorId, content },
      include: noteAuthor,
    });
  }

  update(noteId: string, content: string): Promise<NoteRecord> {
    return this.prisma.meetingNote.update({
      where: { id: noteId },
      data: { content },
      include: noteAuthor,
    });
  }

  async delete(noteId: string): Promise<void> {
    await this.prisma.meetingNote.delete({ where: { id: noteId } });
  }
}
