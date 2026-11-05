import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  MeetingAccessRecord,
  CreateMeetingRecord,
  MeetingConflictQuery,
  MeetingRecord,
  MeetingsRepository,
  UpdateMeetingRecord,
} from '../meetings.repository';

@Injectable()
export class PrismaMeetingsRepository implements MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAccessByResourceId(
    id: string,
  ): Promise<MeetingAccessRecord | null> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      select: { id: true, teamId: true, organizerId: true, status: true },
    });
    if (meeting) return meeting;
    const note = await this.prisma.meetingNote.findUnique({
      where: { id },
      select: {
        meeting: {
          select: { id: true, teamId: true, organizerId: true, status: true },
        },
      },
    });
    if (note?.meeting) return note.meeting;
    const decision = await this.prisma.decision.findUnique({
      where: { id },
      select: {
        meeting: {
          select: { id: true, teamId: true, organizerId: true, status: true },
        },
      },
    });
    return decision?.meeting ?? null;
  }

  async findAccessByAgendaItemId(
    id: string,
  ): Promise<MeetingAccessRecord | null> {
    const item = await this.prisma.agendaItem.findUnique({
      where: { id },
      select: {
        meeting: {
          select: { id: true, teamId: true, organizerId: true, status: true },
        },
      },
    });
    return item?.meeting ?? null;
  }

  create(data: CreateMeetingRecord): Promise<MeetingRecord> {
    return this.prisma.meeting.create({
      data,
      include: this.meetingInclude(),
    });
  }

  listForUser(
    userId: string,
    teamId: string | undefined,
    limit: number,
  ): Promise<MeetingRecord[]> {
    return this.prisma.meeting.findMany({
      where: {
        ...(teamId ? { teamId } : {}),
        team: { members: { some: { userId } } },
      },
      include: this.meetingInclude(),
      orderBy: { startTime: 'desc' },
      take: limit,
    });
  }

  findById(id: string): Promise<MeetingRecord | null> {
    return this.prisma.meeting.findUnique({
      where: { id },
      include: this.meetingInclude(),
    });
  }

  update(id: string, data: UpdateMeetingRecord): Promise<MeetingRecord> {
    return this.prisma.meeting.update({
      where: { id },
      data,
      include: this.meetingInclude(),
    }) as Promise<MeetingRecord>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.meeting.delete({ where: { id } });
  }

  findOrganizerConflict(
    query: MeetingConflictQuery,
  ): Promise<{ id: string; title: string } | null> {
    return this.prisma.meeting.findFirst({
      where: {
        organizerId: query.organizerId,
        id: query.excludeId ? { not: query.excludeId } : undefined,
        status: { in: query.statuses },
        startTime: { lt: query.endTime },
        endTime: { gt: query.startTime },
      },
      select: { id: true, title: true },
    });
  }

  private meetingInclude() {
    return {
      team: { select: { id: true, name: true } },
      organizer: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    };
  }
}
