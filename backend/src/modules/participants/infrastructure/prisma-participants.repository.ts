import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttendanceStatus, ParticipantStatus } from '../../../shared';
import {
  ParticipantMutationRecord,
  ParticipantRecord,
  ParticipantsRepository,
} from '../participants.repository';

const participantUser = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
    },
  },
};

@Injectable()
export class PrismaParticipantsRepository implements ParticipantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByMeeting(meetingId: string): Promise<ParticipantRecord[]> {
    return this.prisma.meetingParticipant.findMany({
      where: { meetingId },
      include: participantUser,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findUserIdsByMeeting(
    meetingId: string,
    userIds: string[],
  ): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }
    const participants = await this.prisma.meetingParticipant.findMany({
      where: { meetingId, userId: { in: userIds } },
      select: { userId: true },
    });
    return participants.map(({ userId }) => userId);
  }

  async listUserIdsByMeeting(
    meetingId: string,
    excludeUserId?: string,
  ): Promise<string[]> {
    const participants = await this.prisma.meetingParticipant.findMany({
      where: {
        meetingId,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { userId: true },
    });
    return participants.map(({ userId }) => userId);
  }

  async createMany(
    meetingId: string,
    userIds: string[],
  ): Promise<ParticipantRecord[]> {
    return this.prisma.$transaction(
      userIds.map((userId) =>
        this.prisma.meetingParticipant.create({
          data: { meetingId, userId },
          include: participantUser,
        }),
      ),
    );
  }

  findByMeetingAndUserId(
    meetingId: string,
    userId: string,
  ): Promise<ParticipantMutationRecord | null> {
    return this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    });
  }

  updateStatus(
    participantId: string,
    status: ParticipantStatus,
  ): Promise<ParticipantRecord> {
    return this.prisma.meetingParticipant.update({
      where: { id: participantId },
      data: { status },
      include: participantUser,
    });
  }

  updateAttendance(
    participantId: string,
    attendance: AttendanceStatus,
  ): Promise<ParticipantRecord> {
    return this.prisma.meetingParticipant.update({
      where: { id: participantId },
      data: { attendance },
      include: participantUser,
    });
  }

  async delete(participantId: string): Promise<void> {
    await this.prisma.meetingParticipant.delete({
      where: { id: participantId },
    });
  }
}
