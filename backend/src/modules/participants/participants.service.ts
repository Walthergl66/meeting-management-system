import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AttendanceStatus, ParticipantStatus } from '@meetflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMembershipContext } from '../../common/guards/team-role.guard';

type MeetingRef = {
  id: string;
  teamId: string;
  organizerId: string;
};

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(meetingRef: MeetingRef) {
    return this.prisma.meetingParticipant.findMany({
      where: { meetingId: meetingRef.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(
    actorId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
    userIds: string[],
  ) {
    this.assertCanManageParticipants(actorId, meetingRef, membership);

    const uniqueIds = [...new Set(userIds)];
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { teamId: meetingRef.teamId, userId: { in: uniqueIds } },
      select: { userId: true },
    });
    const memberIds = new Set(teamMembers.map((member) => member.userId));

    const notMembers = uniqueIds.filter((userId) => !memberIds.has(userId));
    if (notMembers.length > 0) {
      throw new UnprocessableEntityException(
        `Los siguientes usuarios no pertenecen al equipo: ${notMembers.join(', ')}`,
      );
    }

    const existing = await this.prisma.meetingParticipant.findMany({
      where: { meetingId: meetingRef.id, userId: { in: uniqueIds } },
      select: { userId: true },
    });
    const existingIds = new Set(
      existing.map((participant) => participant.userId),
    );

    const duplicates = uniqueIds.filter((userId) => existingIds.has(userId));
    if (duplicates.length > 0) {
      throw new ConflictException(
        `Los siguientes usuarios ya son participantes: ${duplicates.join(', ')}`,
      );
    }

    const created = await this.prisma.$transaction(
      uniqueIds.map((userId) =>
        this.prisma.meetingParticipant.create({
          data: { meetingId: meetingRef.id, userId },
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        }),
      ),
    );

    return created;
  }

  async respond(
    userId: string,
    meetingRef: MeetingRef,
    status: ParticipantStatus,
  ) {
    const participant = await this.participantOrThrow(meetingRef.id, userId);

    if (participant.userId !== userId) {
      throw new ForbiddenException(
        'Solo puedes actualizar tu propia participación',
      );
    }

    return this.prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: { status },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async recordAttendance(
    actorId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
    targetUserId: string,
    attendance: AttendanceStatus,
  ) {
    this.assertCanManageParticipants(actorId, meetingRef, membership);

    const participant = await this.participantOrThrow(
      meetingRef.id,
      targetUserId,
    );

    return this.prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: { attendance },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async remove(
    actorId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
    targetUserId: string,
  ) {
    this.assertCanManageParticipants(actorId, meetingRef, membership);

    if (targetUserId === meetingRef.organizerId) {
      throw new ConflictException(
        'No puedes eliminar al organizador de la reunión',
      );
    }

    const participant = await this.participantOrThrow(
      meetingRef.id,
      targetUserId,
    );

    await this.prisma.meetingParticipant.delete({
      where: { id: participant.id },
    });
  }

  private assertCanManageParticipants(
    actorId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
  ): void {
    if (meetingRef.organizerId === actorId) {
      return;
    }

    if (membership.role === 'OWNER' || membership.role === 'ADMIN') {
      return;
    }

    throw new ForbiddenException(
      'Solo el organizador o un administrador del equipo pueden gestionar participantes',
    );
  }

  private async participantOrThrow(meetingId: string, userId: string) {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    });

    if (!participant) {
      throw new NotFoundException('Participante no encontrado');
    }

    return participant;
  }
}
