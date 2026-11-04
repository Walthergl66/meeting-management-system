import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AttachmentRecord,
  AttachmentWithScope,
  AttachmentsRepository,
  CreateAttachmentRecord,
} from '../attachments.repository';

const attachmentTeamScope = {
  meeting: { select: { teamId: true } },
  note: { select: { meeting: { select: { teamId: true } } } },
  task: { select: { teamId: true } },
};

@Injectable()
export class PrismaAttachmentsRepository implements AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMeetingTeamId(meetingId: string): Promise<string | null> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { teamId: true },
    });
    return meeting?.teamId ?? null;
  }

  async findNoteTeamId(noteId: string): Promise<string | null> {
    const note = await this.prisma.meetingNote.findUnique({
      where: { id: noteId },
      select: { meeting: { select: { teamId: true } } },
    });
    return note?.meeting.teamId ?? null;
  }

  async findTaskTeamId(taskId: string): Promise<string | null> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { teamId: true },
    });
    return task?.teamId ?? null;
  }

  create(data: CreateAttachmentRecord): Promise<AttachmentRecord> {
    return this.prisma.attachment.create({ data });
  }

  findByIdWithScope(id: string): Promise<AttachmentWithScope | null> {
    return this.prisma.attachment.findUnique({
      where: { id },
      include: attachmentTeamScope,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.attachment.delete({ where: { id } });
  }
}
