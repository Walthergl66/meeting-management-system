import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamAction } from '../../shared';
import { TEAM_ACTION_KEY } from '../../common/decorators/team-action.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { TeamMembershipContext } from '../../common/types/team-membership-context';
import { TeamAuthorizationService } from '../teams/team-authorization.service';
import { MeetingAccessService } from './meeting-access.service';

/**
 * Guard para rutas de reuniones. Resuelve el teamId desde:
 * - params.teamId (rutas de equipo),
 * - body.teamId (POST /meetings),
 * - el registro de la reunion (rutas /meetings/:id), dejando la reunion
 *   cargada en request.meeting para validaciones de organizador.
 */
@Injectable()
export class MeetingAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly meetingAccessService: MeetingAccessService,
    private readonly teamAuthorizationService: TeamAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<TeamAction | undefined>(
      TEAM_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedUser;
      params: Record<string, string>;
      body: { teamId?: string };
      meeting?: {
        id: string;
        teamId: string;
        organizerId: string;
        status: string;
      };
      teamMembership?: TeamMembershipContext;
    }>();

    const { user, params, body } = request;

    let teamId = params.teamId;

    if (!teamId && params.id) {
      const meeting = await this.meetingAccessService.findByResourceId(
        params.id,
      );

      if (!meeting) {
        throw new NotFoundException('Reunión no encontrada');
      }

      request.meeting = meeting;
      teamId = meeting.teamId;
    }

    if (!teamId && params.itemId) {
      const meeting = await this.meetingAccessService.findByAgendaItemId(
        params.itemId,
      );

      if (!meeting) {
        throw new NotFoundException('Punto de agenda no encontrado');
      }

      request.meeting = meeting;
      teamId = meeting.teamId;
    }

    if (!teamId && body?.teamId) {
      teamId = body.teamId;
    }

    // Rutas de listado sin ambito de equipo (GET /meetings) no exigen rol.
    if (!action && !teamId) {
      return true;
    }

    if (!teamId) {
      throw new NotFoundException('Equipo no encontrado');
    }

    request.teamMembership = await this.teamAuthorizationService.authorize(
      teamId,
      user.id,
      action,
    );

    return true;
  }
}
