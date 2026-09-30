import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { roleCan } from '@meetflow/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user';
import { TEAM_ACTION_KEY } from '../decorators/team-action.decorator';

export interface TeamMembershipContext {
  teamId: string;
  role: import('@meetflow/types').TeamRole;
}

@Injectable()
export class TeamRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<
      import('@meetflow/config').TeamAction | undefined
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

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    if (!roleCan(membership.role, action)) {
      throw new ForbiddenException(`Tu rol en el equipo no permite: ${action}`);
    }

    request.teamMembership = { teamId, role: membership.role };
    return true;
  }
}
