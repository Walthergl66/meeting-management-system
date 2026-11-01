import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeetingStatus, PAGINATION } from '../../shared';
import { TeamMembershipContext } from '../../common/types/team-membership-context';
import { TeamsService } from '../teams/teams.service';
import { MEETINGS_REPOSITORY } from './meetings.tokens';
import { MeetingsRepository } from './meetings.repository';
import { dispatchDomainEvent } from '../../common/events/dispatch-domain-event';
import { toUtcDateTime } from '../../common/utils/timezone.util';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { isAllowedTransition, SCHEDULED_LIKE } from './meeting-transitions';
import {
  MeetingCancelledEvent,
  MeetingCreatedEvent,
  MeetingUpdatedEvent,
} from '../../common/events/domain-events';

type MeetingRef = {
  id: string;
  teamId: string;
  organizerId: string;
};

@Injectable()
export class MeetingsService {
  constructor(
    @Inject(MEETINGS_REPOSITORY)
    private readonly meetingsRepository: MeetingsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly teamsService: TeamsService,
  ) {}

  private readonly logger = new Logger(MeetingsService.name);

  private dispatch(event: string, payload: unknown): Promise<void> {
    return dispatchDomainEvent(this.eventEmitter, this.logger, event, payload);
  }

  async create(
    organizerId: string,
    userTimezone: string,
    dto: CreateMeetingDto,
  ) {
    const timezone = dto.timezone ?? userTimezone ?? 'UTC';
    const startTime = toUtcDateTime(dto.startTime, timezone);
    const endTime = toUtcDateTime(dto.endTime, timezone);

    this.assertStartNotInPast(startTime);
    this.assertRange(startTime, endTime);

    const meeting = await this.meetingsRepository.create({
      title: dto.title,
      description: dto.description,
      teamId: dto.teamId,
      organizerId,
      status: MeetingStatus.DRAFT,
      startTime,
      endTime,
      timezone,
      location: dto.location,
      meetingUrl: dto.meetingUrl,
    });

    await this.dispatch(
      'meeting.created',
      new MeetingCreatedEvent(
        meeting.id,
        meeting.teamId,
        organizerId,
        meeting.title,
      ),
    );

    return meeting;
  }

  async listForUser(userId: string, teamId?: string) {
    // Ver TasksService.list: sin cota esta lista crece sin limite.
    return this.meetingsRepository.listForUser(
      userId,
      teamId,
      PAGINATION.MAX_LIMIT,
    );
  }

  async getForUser(userId: string, meetingRef: MeetingRef) {
    const meeting = await this.meetingOrThrow(meetingRef.id);
    if (!(await this.teamsService.findMembership(meeting.teamId, userId))) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    return meeting;
  }

  async update(
    userId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
    dto: UpdateMeetingDto,
  ) {
    const existing = await this.meetingOrThrow(meetingRef.id);

    if (existing.organizerId !== userId) {
      const canCancel = this.canCancelOther(membership);
      const onlyCancel =
        dto.status !== undefined &&
        dto.status === MeetingStatus.CANCELLED &&
        !this.hasEditableFields(dto);

      if (!canCancel || !onlyCancel) {
        throw new ForbiddenException(
          'Solo el organizador puede editar la reunión',
        );
      }
    }

    const timezone = dto.timezone ?? existing.timezone;
    const startTime = dto.startTime
      ? toUtcDateTime(dto.startTime, timezone)
      : existing.startTime;
    const endTime = dto.endTime
      ? toUtcDateTime(dto.endTime, timezone)
      : existing.endTime;

    if (dto.startTime || dto.endTime) {
      this.assertRange(startTime, endTime);
    }

    const nextStatus = dto.status ?? existing.status;

    if (dto.status && !isAllowedTransition(existing.status, dto.status)) {
      throw new ConflictException(
        `Transición de ${existing.status} a ${dto.status} no permitida`,
      );
    }

    if (
      SCHEDULED_LIKE.includes(nextStatus) &&
      (dto.startTime || dto.endTime || dto.status)
    ) {
      await this.assertNoOrganizerConflict(
        userId,
        startTime,
        endTime,
        existing.id,
      );
    }

    const updated = await this.meetingsRepository.update(existing.id, {
      title: dto.title ?? existing.title,
      description:
        dto.description !== undefined ? dto.description : existing.description,
      startTime,
      endTime,
      timezone,
      status: nextStatus,
      location: dto.location ?? existing.location,
      meetingUrl:
        dto.meetingUrl !== undefined ? dto.meetingUrl : existing.meetingUrl,
    });

    await this.dispatch(
      'meeting.updated',
      new MeetingUpdatedEvent(
        updated.id,
        updated.teamId,
        updated.organizerId,
        updated.title,
      ),
    );

    return updated;
  }

  async delete(
    userId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
  ): Promise<void> {
    const existing = await this.meetingOrThrow(meetingRef.id);

    if (existing.organizerId !== userId && !this.canCancelOther(membership)) {
      throw new ForbiddenException(
        'No puedes eliminar una reunión que no organizas',
      );
    }

    await this.dispatch(
      'meeting.cancelled',
      new MeetingCancelledEvent(
        existing.id,
        existing.teamId,
        existing.organizerId,
        existing.title,
      ),
    );

    await this.meetingsRepository.delete(existing.id);
  }

  private assertStartNotInPast(start: Date): void {
    if (start.getTime() < Date.now() - 60_000) {
      throw new BadRequestException(
        'La reunión no puede comenzar en el pasado',
      );
    }
  }

  private assertRange(start: Date, end: Date): void {
    if (!(end.getTime() > start.getTime())) {
      throw new BadRequestException('endTime debe ser posterior a startTime');
    }
  }

  private async assertNoOrganizerConflict(
    organizerId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await this.meetingsRepository.findOrganizerConflict({
      organizerId,
      startTime,
      endTime,
      statuses: SCHEDULED_LIKE,
      excludeId,
    });

    if (overlapping) {
      throw new ConflictException(
        `El organizador ya tiene "${overlapping.title}" en ese horario`,
      );
    }
  }

  private async meetingOrThrow(id: string) {
    const meeting = await this.meetingsRepository.findById(id);

    if (!meeting) {
      throw new NotFoundException('Reunión no encontrada');
    }

    return meeting;
  }

  private canCancelOther(membership: TeamMembershipContext): boolean {
    return membership.role === 'OWNER' || membership.role === 'ADMIN';
  }

  private hasEditableFields(dto: UpdateMeetingDto): boolean {
    return (
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.startTime !== undefined ||
      dto.endTime !== undefined ||
      dto.timezone !== undefined ||
      dto.location !== undefined ||
      dto.meetingUrl !== undefined
    );
  }
}
