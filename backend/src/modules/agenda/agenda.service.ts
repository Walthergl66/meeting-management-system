import {
  ConflictException,
  Inject,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeetingStatus } from '../../shared';
import { TeamMembershipContext } from '../../common/types/team-membership-context';
import { TeamsService } from '../teams/teams.service';
import { AgendaChangedEvent } from '../../common/events/domain-events';
import { AGENDA_REPOSITORY } from './agenda.tokens';
import { AgendaRepository } from './agenda.repository';

type MeetingRef = {
  id: string;
  teamId: string;
  organizerId: string;
  status: string;
};

@Injectable()
export class AgendaService {
  constructor(
    @Inject(AGENDA_REPOSITORY)
    private readonly agendaRepository: AgendaRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly teamsService: TeamsService,
  ) {}

  /**
   * El detalle de la reunion siempre se actualiza en vivo; el broadcast al
   * equipo solo tiene sentido mientras la reunion esta en curso.
   */
  private notifyChanged(meetingRef: MeetingRef): void {
    this.eventEmitter.emit(
      'agenda.changed',
      new AgendaChangedEvent(
        meetingRef.id,
        meetingRef.teamId,
        meetingRef.status === MeetingStatus.IN_PROGRESS,
      ),
    );
  }

  async list(meetingRef: MeetingRef) {
    return this.agendaRepository.listByMeeting(meetingRef.id);
  }

  async create(
    actorId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
    data: {
      title: string;
      description?: string;
      durationMinutes?: number;
      responsibleId?: string;
    },
  ) {
    this.assertCanManageAgenda(actorId, meetingRef, membership);
    await this.assertResponsibleIsTeamMember(
      meetingRef.teamId,
      data.responsibleId,
    );

    const lastOrder = await this.agendaRepository.findMaxOrder(meetingRef.id);

    this.notifyChanged(meetingRef);

    return this.agendaRepository.create(
      meetingRef.id,
      data,
      (lastOrder ?? 0) + 1,
    );
  }

  async update(
    actorId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
    itemId: string,
    data: {
      title?: string;
      description?: string;
      durationMinutes?: number;
      responsibleId?: string;
    },
  ) {
    this.assertCanManageAgenda(actorId, meetingRef, membership);

    const item = await this.itemOrThrow(meetingRef.id, itemId);
    await this.assertResponsibleIsTeamMember(
      meetingRef.teamId,
      data.responsibleId,
    );

    this.notifyChanged(meetingRef);

    return this.agendaRepository.update(item.id, {
      title: data.title ?? item.title,
      description:
        data.description !== undefined ? data.description : item.description,
      durationMinutes:
        data.durationMinutes !== undefined
          ? data.durationMinutes
          : item.durationMinutes,
      responsibleId:
        data.responsibleId !== undefined
          ? data.responsibleId
          : item.responsibleId,
    });
  }

  async remove(
    actorId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
    itemId: string,
  ) {
    this.assertCanManageAgenda(actorId, meetingRef, membership);

    const item = await this.itemOrThrow(meetingRef.id, itemId);
    await this.agendaRepository.delete(item.id);

    this.notifyChanged(meetingRef);
  }

  async reorder(
    actorId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
    order: string[],
  ) {
    this.assertCanManageAgenda(actorId, meetingRef, membership);

    const items = await this.agendaRepository.listIdsByMeeting(meetingRef.id);
    const existingIds = new Set(items.map((item) => item.id));
    const uniqueOrder = [...new Set(order)];

    const unknown = uniqueOrder.filter((id) => !existingIds.has(id));
    if (unknown.length > 0) {
      throw new UnprocessableEntityException(
        `Los siguientes puntos no pertenecen a la agenda: ${unknown.join(', ')}`,
      );
    }

    if (uniqueOrder.length !== existingIds.size) {
      throw new ConflictException(
        'El orden debe incluir exactamente todos los puntos de la agenda',
      );
    }

    await this.agendaRepository.reorder(uniqueOrder);

    this.notifyChanged(meetingRef);

    return this.list(meetingRef);
  }

  private assertCanManageAgenda(
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
      'Solo el organizador o un administrador del equipo pueden gestionar la agenda',
    );
  }

  private async assertResponsibleIsTeamMember(
    teamId: string,
    responsibleId?: string,
  ): Promise<void> {
    if (!responsibleId) {
      return;
    }

    const member = await this.teamsService.findMembership(
      teamId,
      responsibleId,
    );

    if (!member) {
      throw new UnprocessableEntityException(
        'El responsable debe ser un miembro del equipo',
      );
    }
  }

  private async itemOrThrow(meetingId: string, itemId: string) {
    const item = await this.agendaRepository.findByMeeting(meetingId, itemId);

    if (!item) {
      throw new NotFoundException('Punto de agenda no encontrado');
    }

    return item;
  }
}
