import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AgendaItemMutationRecord,
  AgendaItemRecord,
  AgendaRepository,
  CreateAgendaItemRecord,
  UpdateAgendaItemRecord,
} from '../agenda.repository';

const responsibleUser = {
  responsible: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
};

@Injectable()
export class PrismaAgendaRepository implements AgendaRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByMeeting(meetingId: string): Promise<AgendaItemRecord[]> {
    return this.prisma.agendaItem.findMany({
      where: { meetingId },
      include: responsibleUser,
      orderBy: { order: 'asc' },
    });
  }

  async findMaxOrder(meetingId: string): Promise<number | null> {
    const result = await this.prisma.agendaItem.aggregate({
      where: { meetingId },
      _max: { order: true },
    });
    return result._max.order;
  }

  create(
    meetingId: string,
    data: CreateAgendaItemRecord,
    order: number,
  ): Promise<AgendaItemRecord> {
    return this.prisma.agendaItem.create({
      data: { meetingId, ...data, order },
      include: responsibleUser,
    });
  }

  findByMeeting(
    meetingId: string,
    itemId: string,
  ): Promise<AgendaItemMutationRecord | null> {
    return this.prisma.agendaItem.findFirst({
      where: { id: itemId, meetingId },
    });
  }

  update(
    itemId: string,
    data: UpdateAgendaItemRecord,
  ): Promise<AgendaItemRecord> {
    return this.prisma.agendaItem.update({
      where: { id: itemId },
      data,
      include: responsibleUser,
    });
  }

  async delete(itemId: string): Promise<void> {
    await this.prisma.agendaItem.delete({ where: { id: itemId } });
  }

  listIdsByMeeting(meetingId: string): Promise<Array<{ id: string }>> {
    return this.prisma.agendaItem.findMany({
      where: { meetingId },
      select: { id: true },
    });
  }

  async reorder(itemIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      itemIds.map((id, index) =>
        this.prisma.agendaItem.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );
  }
}
