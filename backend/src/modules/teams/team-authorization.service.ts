import { ForbiddenException, Injectable } from '@nestjs/common';
import { roleCan, TeamAction } from '../../shared';
import { TeamMembershipContext } from '../../common/types/team-membership-context';
import { TeamsService } from './teams.service';

@Injectable()
export class TeamAuthorizationService {
  constructor(private readonly teamsService: TeamsService) {}

  async authorize(
    teamId: string,
    userId: string,
    action?: TeamAction,
  ): Promise<TeamMembershipContext> {
    const membership = await this.teamsService.findMembership(teamId, userId);

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    if (action && !roleCan(membership.role, action)) {
      throw new ForbiddenException(`Tu rol en el equipo no permite: ${action}`);
    }

    return membership;
  }
}
