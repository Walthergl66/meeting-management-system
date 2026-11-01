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
import { TeamAuthorizationService } from './team-authorization.service';

@Injectable()
export class TeamRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly teamAuthorizationService: TeamAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<TeamAction | undefined>(
      TEAM_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

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

    request.teamMembership = await this.teamAuthorizationService.authorize(
      teamId,
      user.id,
      action,
    );
    return true;
  }
}
