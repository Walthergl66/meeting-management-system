import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DecisionMutationRecord,
  DecisionRecord,
  DecisionsRepository,
} from '../decisions.repository';

const decisionAuthor = {
  author: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
};

@Injectable()
export class PrismaDecisionsRepository implements DecisionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByMeeting(meetingId: string): Promise<DecisionRecord[]> {
    return this.prisma.decision.findMany({
      where: { meetingId },
      include: decisionAuthor,
      orderBy: { createdAt: 'asc' },
    });
  }

  async isMeetingParticipant(
    meetingId: string,
    userId: string,
  ): Promise<boolean> {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
      select: { id: true },
    });
    return participant !== null;
  }

  findByMeeting(
    meetingId: string,
    decisionId: string,
  ): Promise<DecisionMutationRecord | null> {
    return this.prisma.decision.findFirst({
      where: { id: decisionId, meetingId },
    });
  }

  create(
    meetingId: string,
    authorId: string,
    title: string,
    content?: string,
  ): Promise<DecisionRecord> {
    return this.prisma.decision.create({
      data: { meetingId, authorId, title, content },
      include: decisionAuthor,
    });
  }

  update(
    decisionId: string,
    title: string,
    content: string | null,
  ): Promise<DecisionRecord> {
    return this.prisma.decision.update({
      where: { id: decisionId },
      data: { title, content },
      include: decisionAuthor,
    });
  }

  async delete(decisionId: string): Promise<void> {
    await this.prisma.decision.delete({ where: { id: decisionId } });
  }
}
