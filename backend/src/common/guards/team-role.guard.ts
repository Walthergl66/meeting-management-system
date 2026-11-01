import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { roleCan } from '../../shared';
import { TeamsService } from '../../modules/teams/teams.service';
import { AuthenticatedUser } from '../types/authenticated-user';
import { TeamMembershipContext } from '../types/team-membership-context';
import { TEAM_ACTION_KEY } from '../decorators/team-action.decorator';

@Injectable()
export class TeamRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly teamsService: TeamsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<
      import('../../shared').TeamAction | undefined
    >(TEAM_ACTION_KEY, [context.getHandler(), context.getClass()]);

    if (!action) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedUser;
      params: Record<string, string>;
      teamMembership?: TeamMembershipContext;
    }>();
    const { user, params } = request;
    const teamId = params.teamId;

    if (!teamId) {
      throw new NotFoundException('Equipo no encontrado');
    }

    const membership = await this.teamsService.findMembership(teamId, user.id);

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    if (!roleCan(membership.role, action)) {
      throw new ForbiddenException(`Tu rol en el equipo no permite: ${action}`);
    }

    request.teamMembership = membership;
    return true;
  }
}
