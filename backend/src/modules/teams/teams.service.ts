import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TeamRole } from '@meetflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { TeamMembershipContext } from '../../common/guards/team-role.guard';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, data: { name: string; description?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: data.name,
          description: data.description,
          ownerId: userId,
        },
      });

      await tx.teamMember.create({
        data: { teamId: team.id, userId, role: TeamRole.OWNER },
      });

      return this.teamWithRole(tx, team.id, userId);
    });
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: { team: { include: { _count: { select: { members: true } } } } },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map(({ team, role }) => ({
      ...team,
      role,
      memberCount: team._count.members,
    }));
  }

  async getForUser(userId: string, teamId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      include: {
        team: {
          include: {
            _count: { select: { members: true } },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    const { team, role } = membership;
    return { ...team, role, memberCount: team._count.members };
  }

  async update(
    userId: string,
    teamId: string,
    data: { name?: string; description?: string },
    membership: TeamMembershipContext,
  ) {
    void userId;
    if (
      membership.role !== TeamRole.OWNER &&
      membership.role !== TeamRole.ADMIN
    ) {
      throw new ForbiddenException('No puedes editar este equipo');
    }

    await this.teamOrThrow(teamId);

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data,
      include: { _count: { select: { members: true } } },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      ownerId: updated.ownerId,
      createdAt: updated.createdAt,
      role: membership.role,
      memberCount: updated._count.members,
    };
  }

  async delete(userId: string, teamId: string): Promise<void> {
    await this.teamOrThrow(teamId);
    await this.prisma.teamMember.findUniqueOrThrow({
      where: { teamId_userId: { teamId, userId } },
    });

    // El borrado de miembros es en cascada por la relacion de Prisma.
    await this.prisma.team.delete({ where: { id: teamId } });
  }

  async invite(
    userId: string,
    teamId: string,
    email: string,
    membership: TeamMembershipContext,
  ) {
    void userId;
    this.assertCanInvite(membership.role);

    const target = await this.usersService.findByEmail(email);

    if (!target) {
      throw new NotFoundException(
        `No existe una cuenta con el correo ${email}. La invitación vía correo llega en la FASE 10.`,
      );
    }

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: target.id } },
    });

    if (existing) {
      throw new ConflictException(
        'Ese usuario ya pertenece a este equipo en MeetFlow',
      );
    }

    return this.prisma.teamMember.create({
      data: {
        teamId,
        userId: target.id,
        role: TeamRole.MEMBER,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async changeRole(
    actorId: string,
    teamId: string,
    memberId: string,
    newRole: TeamRole,
    membership: TeamMembershipContext,
  ) {
    this.assertCanManageMembers(membership.role);

    const target = await this.memberOrThrow(teamId, memberId);

    this.assertCanModifyMembership(membership.role, target.role);

    if (newRole === TeamRole.OWNER) {
      throw new BadRequestException(
        'Cambia el ownership con transferir-ownership, no con el rol',
      );
    }

    return this.prisma.teamMember.update({
      where: { id: memberId },
      data: { role: newRole },
    });
  }

  async removeMember(
    actorId: string,
    teamId: string,
    memberId: string,
    membership: TeamMembershipContext,
  ) {
    void actorId;
    this.assertCanManageMembers(membership.role);

    const target = await this.memberOrThrow(teamId, memberId);

    if (target.role === TeamRole.OWNER) {
      throw new BadRequestException(
        'El OWNER no se puede eliminar: transfiere la propiedad o borra el equipo',
      );
    }

    this.assertCanModifyMembership(membership.role, target.role);

    await this.prisma.teamMember.delete({ where: { id: memberId } });
  }

  async leave(userId: string, teamId: string): Promise<void> {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    if (membership.role === TeamRole.OWNER) {
      throw new BadRequestException(
        'El OWNER no puede abandonar el equipo: transfiere la propiedad o bórralo',
      );
    }

    await this.prisma.teamMember.delete({ where: { id: membership.id } });
  }

  async transferOwnership(ownerId: string, teamId: string, newOwnerId: string) {
    const team = await this.teamOrThrow(teamId);

    if (team.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Solo el OWNER puede transferir la propiedad',
      );
    }

    const currentOwnership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: ownerId } },
    });

    if (!currentOwnership || currentOwnership.role !== TeamRole.OWNER) {
      throw new ForbiddenException(
        'Solo el OWNER puede transferir la propiedad',
      );
    }

    const newOwnerMember = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: newOwnerId } },
    });

    if (!newOwnerMember || newOwnerMember.role === TeamRole.GUEST) {
      throw new BadRequestException(
        'El nuevo propietario debe ser un miembro del equipo',
      );
    }

    await this.prisma.$transaction([
      this.prisma.teamMember.update({
        where: { id: currentOwnership.id },
        data: { role: TeamRole.ADMIN },
      }),
      this.prisma.teamMember.update({
        where: { id: newOwnerMember.id },
        data: { role: TeamRole.OWNER },
      }),
      this.prisma.team.update({
        where: { id: teamId },
        data: { ownerId: newOwnerId },
      }),
    ]);
  }

  private async teamOrThrow(teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });

    if (!team) {
      throw new NotFoundException('Equipo no encontrado');
    }

    return team;
  }

  private async memberOrThrow(teamId: string, memberId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
    });

    if (!member) {
      throw new NotFoundException('Miembro no encontrado en este equipo');
    }

    return member;
  }

  private assertCanInvite(role: TeamRole): void {
    if (role !== TeamRole.OWNER && role !== TeamRole.ADMIN) {
      throw new ForbiddenException('No puedes invitar miembros');
    }
  }

  private assertCanManageMembers(role: TeamRole): void {
    if (role !== TeamRole.OWNER && role !== TeamRole.ADMIN) {
      throw new ForbiddenException('No puedes administrar los miembros');
    }
  }

  private assertCanModifyMembership(
    actorRole: TeamRole,
    targetRole: TeamRole,
  ): void {
    if (targetRole === TeamRole.OWNER) {
      throw new ForbiddenException('No puedes modificar al OWNER del equipo');
    }

    // Un ADMIN no degrada ni elimina a otro ADMIN.
    if (actorRole === TeamRole.ADMIN && targetRole === TeamRole.ADMIN) {
      throw new ForbiddenException('Un ADMIN no puede modificar a otro ADMIN');
    }
  }

  private async teamWithRole(
    executor: import('@prisma/client').Prisma.TransactionClient,
    teamId: string,
    userId: string,
  ) {
    const [team, roleRow] = await Promise.all([
      executor.team.findUniqueOrThrow({
        where: { id: teamId },
        include: { _count: { select: { members: true } } },
      }),
      executor.teamMember.findUniqueOrThrow({
        where: { teamId_userId: { teamId, userId } },
        select: { role: true },
      }),
    ]);

    return { ...team, role: roleRow.role, memberCount: team._count.members };
  }
}
