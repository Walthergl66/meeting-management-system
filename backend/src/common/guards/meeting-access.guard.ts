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
import { TeamMembershipContext } from './team-role.guard';

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
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<
      import('@meetflow/config').TeamAction | undefined
    >(TEAM_ACTION_KEY, [context.getHandler(), context.getClass()]);

    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedUser;
      params: Record<string, string>;
      body: { teamId?: string };
      meeting?: { id: string; teamId: string; organizerId: string };
      teamMembership?: TeamMembershipContext;
    }>();

    const { user, params, body } = request;

    let teamId = params.teamId;

    if (!teamId && params.id) {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: params.id },
        select: { id: true, teamId: true, organizerId: true },
      });

      if (!meeting) {
        throw new NotFoundException('Reunión no encontrada');
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

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    request.teamMembership = { teamId, role: membership.role };

    if (action && !roleCan(membership.role, action)) {
      throw new ForbiddenException(`Tu rol en el equipo no permite: ${action}`);
    }

    return true;
  }
}
