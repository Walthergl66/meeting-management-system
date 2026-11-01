import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface MeetingAccessScope {
  id: string;
  teamId: string;
  organizerId: string;
  status: string;
}

@Injectable()
export class MeetingAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async findByResourceId(id: string): Promise<MeetingAccessScope | null> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      select: { id: true, teamId: true, organizerId: true, status: true },
    });

    if (meeting) {
      return meeting;
    }

    const note = await this.prisma.meetingNote.findUnique({
      where: { id },
      select: {
        meeting: {
          select: {
            id: true,
            teamId: true,
            organizerId: true,
            status: true,
          },
        },
      },
    });

    if (note?.meeting) {
      return note.meeting;
    }

    const decision = await this.prisma.decision.findUnique({
      where: { id },
      select: {
        meeting: {
          select: {
            id: true,
            teamId: true,
            organizerId: true,
            status: true,
          },
        },
      },
    });

    return decision?.meeting ?? null;
  }

  async findByAgendaItemId(itemId: string): Promise<MeetingAccessScope | null> {
    const item = await this.prisma.agendaItem.findUnique({
      where: { id: itemId },
      select: {
        meeting: {
          select: { id: true, teamId: true, organizerId: true, status: true },
        },
      },
    });

    return item?.meeting ?? null;
  }
}
