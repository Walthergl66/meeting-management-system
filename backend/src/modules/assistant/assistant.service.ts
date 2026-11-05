import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TeamsService } from '../teams/teams.service';
import { MeetingAccessService } from '../meetings/meeting-access.service';
import { ASSISTANT_SERVICE } from './assistant.tokens';
import {
  IAssistantService,
  AssistantSuggestion,
} from './interfaces/assistant.interface';

/**
 * Fachada del asistente. Es el unico punto que todos los providers (fake,
 * Gemini) tienen atras, asi que es tambien el unico sitio donde se puede
 * exigir pertenencia al equipo antes de dejar que un provider lea datos.
 *
 * No implementa IAssistantService a proposito: ese puerto describe lo que un
 * provider sabe hacer, mientras que esta fachada ademas autentica la peticion.
 * Los providers reciben identificadores de negocio, nunca del usuario; si se
 * invirtiera, cada implementacion tendria que repetir la comprobacion.
 */
@Injectable()
export class AssistantService {
  constructor(
    @Inject(ASSISTANT_SERVICE)
    private readonly assistant: IAssistantService,
    private readonly teamsService: TeamsService,
    private readonly meetingAccess: MeetingAccessService,
  ) {}

  async summarizeMeeting(
    userId: string,
    meetingId: string,
  ): Promise<AssistantSuggestion> {
    const meeting = await this.meetingAccess.findByResourceId(meetingId);

    if (!meeting) {
      throw new NotFoundException('Reunión no encontrada');
    }

    await this.assertMember(userId, meeting.teamId);

    return this.assistant.summarizeMeeting(meetingId);
  }

  async suggestAgenda(
    title: string,
    description?: string,
  ): Promise<AssistantSuggestion[]> {
    // El texto lo aporta el propio usuario: no hay recurso de equipo que aislar.
    return this.assistant.suggestAgenda(title, description);
  }

  async summarizeTasks(
    userId: string,
    teamId: string,
  ): Promise<AssistantSuggestion> {
    const team = await this.teamsService.findTeamById(teamId);

    if (!team) {
      throw new NotFoundException('Equipo no encontrado');
    }

    await this.assertMember(userId, teamId);

    return this.assistant.summarizeTasks(teamId);
  }

  private async assertMember(userId: string, teamId: string): Promise<void> {
    const membership = await this.teamsService.findMembership(teamId, userId);

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }
  }
}
