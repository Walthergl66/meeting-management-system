import { Injectable } from '@nestjs/common';
import { NotificationType } from '@meetflow/types';
import { PrismaService } from '../../prisma/prisma.service';

export type MentionContext = 'NOTE' | 'DECISION';

/**
 * Resuelve menciones `@email` dentro de un texto y notifica a los miembros del
 * equipo citados, sin repetir al autor.
 */
@Injectable()
export class MentionsService {
  private static readonly MENTION_PATTERN = /@([\w.+-]+@[\w-]+\.[\w.-]+)/g;

  constructor(private readonly prisma: PrismaService) {}

  extractEmails(content: string): string[] {
    const matches = content.match(MentionsService.MENTION_PATTERN) ?? [];
    const emails = matches.map((match) => match.slice(1).toLowerCase());
    return [...new Set(emails)];
  }

  async notifyMentions(
    teamId: string,
    authorId: string,
    content: string,
    context: MentionContext,
    entityId: string,
  ): Promise<void> {
    const emails = this.extractEmails(content);
    if (emails.length === 0) {
      return;
    }

    const members = await this.prisma.teamMember.findMany({
      where: {
        teamId,
        userId: { not: authorId },
        user: { email: { in: emails, mode: 'insensitive' } },
      },
      select: { userId: true },
    });

    if (members.length === 0) {
      return;
    }

    const label = context === 'NOTE' ? 'una nota' : 'una decisión';

    await this.prisma.notification.createMany({
      data: members.map((member) => ({
        userId: member.userId,
        type: NotificationType.MENTION,
        title: 'Te mencionaron',
        body: `Te mencionaron en ${label}.`,
        metadata:
          context === 'NOTE' ? { noteId: entityId } : { decisionId: entityId },
      })),
    });
  }
}
