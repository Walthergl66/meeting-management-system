import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AttendanceStatus, ParticipantStatus } from '../../shared';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TeamMembershipContext } from '../../common/types/team-membership-context';
import { MeetingParticipantsChangedEvent } from '../../common/events/domain-events';
import { TeamsService } from '../teams/teams.service';
import { PARTICIPANTS_REPOSITORY } from './participants.tokens';
import { ParticipantsRepository } from './participants.repository';

type MeetingRef = {
  id: string;
  teamId: string;
  organizerId: string;
};

@Injectable()
export class ParticipantsService {
  constructor(
    @Inject(PARTICIPANTS_REPOSITORY)
    private readonly participantsRepository: ParticipantsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly teamsService: TeamsService,
  ) {}

  private notifyChanged(meetingRef: MeetingRef): void {
    this.eventEmitter.emit(
      'meeting.participants.changed',
      new MeetingParticipantsChangedEvent(meetingRef.id, meetingRef.teamId),
    );
  }

  async list(meetingRef: MeetingRef) {
    return this.participantsRepository.listByMeeting(meetingRef.id);
  }

  async invite(
    actorId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
    userIds: string[],
  ) {
    this.assertCanManageParticipants(actorId, meetingRef, membership);

    const uniqueIds = [...new Set(userIds)];
    const memberIds = new Set(
      await this.teamsService.findMemberUserIds(meetingRef.teamId, uniqueIds),
    );

    const notMembers = uniqueIds.filter((userId) => !memberIds.has(userId));
    if (notMembers.length > 0) {
      throw new UnprocessableEntityException(
        `Los siguientes usuarios no pertenecen al equipo: ${notMembers.join(', ')}`,
      );
    }

    const existingIds = new Set(
      await this.participantsRepository.findUserIdsByMeeting(
        meetingRef.id,
        uniqueIds,
      ),
    );

    const duplicates = uniqueIds.filter((userId) => existingIds.has(userId));
    if (duplicates.length > 0) {
      throw new ConflictException(
        `Los siguientes usuarios ya son participantes: ${duplicates.join(', ')}`,
      );
    }

    const created = await this.participantsRepository.createMany(
      meetingRef.id,
      uniqueIds,
    );

    this.notifyChanged(meetingRef);

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

    this.notifyChanged(meetingRef);

    return this.participantsRepository.updateStatus(participant.id, status);
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

    this.notifyChanged(meetingRef);

    return this.participantsRepository.updateAttendance(
      participant.id,
      attendance,
    );
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

    await this.participantsRepository.delete(participant.id);

    this.notifyChanged(meetingRef);
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
    const participant =
      await this.participantsRepository.findByMeetingAndUserId(
        meetingId,
        userId,
      );

    if (!participant) {
      throw new NotFoundException('Participante no encontrado');
    }

    return participant;
  }
}
