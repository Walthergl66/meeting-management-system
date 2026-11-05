import { Injectable } from '@nestjs/common';
import { NotificationType } from '../../shared';
import { NotificationsService } from './notifications.service';
import { TeamsService } from '../teams/teams.service';

export type MentionContext = 'NOTE' | 'DECISION';

/**
 * Resuelve menciones `@email` dentro de un texto y notifica a los miembros del
 * equipo citados, sin repetir al autor.
 */
@Injectable()
export class MentionsService {
  private static readonly MENTION_PATTERN = /@([\w.+-]+@[\w-]+\.[\w.-]+)/g;

  constructor(
    private readonly notifications: NotificationsService,
    private readonly teamsService: TeamsService,
  ) {}

  extractEmails(content: string): string[] {
    const matches = content.match(MentionsService.MENTION_PATTERN) ?? [];
    const emails = matches.map((match) => match.slice(1).toLowerCase());
    return [...new Set(emails)];
  }

  /**
   * Menciones del texto actual que no estaban en el anterior. Editar una nota
   * para añadir una mención nueva tiene que avisar a esa persona, pero volver a
   * avisar a los ya citados en cada guardado convertiría la nota en spam.
   */
  newMentions(content: string, previousContent?: string | null): string[] {
    const previous = new Set(
      previousContent ? this.extractEmails(previousContent) : [],
    );

    return this.extractEmails(content).filter((email) => !previous.has(email));
  }

  async notifyEmails(
    teamId: string,
    authorId: string,
    emails: string[],
    context: MentionContext,
    entityId: string,
  ): Promise<void> {
    if (emails.length === 0) {
      return;
    }

    const memberIds = await this.teamsService.findMemberUserIdsByEmails(
      teamId,
      authorId,
      emails,
    );

    if (memberIds.length === 0) {
      return;
    }

    const label = context === 'NOTE' ? 'una nota' : 'una decisión';

    await this.notifications.createFor(memberIds, {
      type: NotificationType.MENTION,
      title: 'Te mencionaron',
      body: `Te mencionaron en ${label}.`,
      metadata:
        context === 'NOTE' ? { noteId: entityId } : { decisionId: entityId },
    });
  }
}
