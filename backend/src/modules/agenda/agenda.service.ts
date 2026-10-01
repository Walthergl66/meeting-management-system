import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMembershipContext } from '../../common/guards/team-role.guard';

type MeetingRef = {
  id: string;
  teamId: string;
  organizerId: string;
};

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  async list(meetingRef: MeetingRef) {
    return this.prisma.agendaItem.findMany({
      where: { meetingId: meetingRef.id },
      include: {
        responsible: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { order: 'asc' },
    });
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

    const lastOrder = await this.prisma.agendaItem.aggregate({
      where: { meetingId: meetingRef.id },
      _max: { order: true },
    });

    return this.prisma.agendaItem.create({
      data: {
        meetingId: meetingRef.id,
        title: data.title,
        description: data.description,
        durationMinutes: data.durationMinutes,
        responsibleId: data.responsibleId,
        order: (lastOrder._max.order ?? 0) + 1,
      },
      include: {
        responsible: {
          select: { id: true, name: true, email: true },
        },
      },
    });
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

    return this.prisma.agendaItem.update({
      where: { id: item.id },
      data: {
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
      },
      include: {
        responsible: {
          select: { id: true, name: true, email: true },
        },
      },
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
    await this.prisma.agendaItem.delete({ where: { id: item.id } });
  }

  async reorder(
    actorId: string,
    meetingRef: MeetingRef,
    membership: TeamMembershipContext,
    order: string[],
  ) {
    this.assertCanManageAgenda(actorId, meetingRef, membership);

    const items = await this.prisma.agendaItem.findMany({
      where: { meetingId: meetingRef.id },
      select: { id: true },
    });
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

    await this.prisma.$transaction(
      uniqueOrder.map((id, index) =>
        this.prisma.agendaItem.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );

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

    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: responsibleId } },
      select: { userId: true },
    });

    if (!member) {
      throw new UnprocessableEntityException(
        'El responsable debe ser un miembro del equipo',
      );
    }
  }

  private async itemOrThrow(meetingId: string, itemId: string) {
    const item = await this.prisma.agendaItem.findFirst({
      where: { id: itemId, meetingId },
    });

    if (!item) {
      throw new NotFoundException('Punto de agenda no encontrado');
    }

    return item;
  }
}
