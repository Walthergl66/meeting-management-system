import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PAGINATION, TeamRole } from '../../shared';
import { UsersService } from '../users/users.service';
import { TeamMembershipContext } from '../../common/types/team-membership-context';
import { TeamMembershipChangedEvent } from '../../common/events/domain-events';
import { TEAMS_REPOSITORY } from './teams.tokens';
import { TeamDetailRecord, TeamsRepository } from './teams.repository';

@Injectable()
export class TeamsService {
  constructor(
    @Inject(TEAMS_REPOSITORY) private readonly teamsRepository: TeamsRepository,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findMembership(
    teamId: string,
    userId: string,
  ): Promise<TeamMembershipContext | null> {
    return this.teamsRepository.findMembership(teamId, userId);
  }

  async findMemberUserIds(
    teamId: string,
    userIds: string[],
  ): Promise<string[]> {
    return this.teamsRepository.findMemberUserIds(teamId, userIds);
  }

  async listMemberUserIds(
    teamId: string,
    excludeUserId?: string,
  ): Promise<string[]> {
    return this.teamsRepository.listMemberUserIds(teamId, excludeUserId);
  }

  async findMemberUserIdsByEmails(
    teamId: string,
    excludeUserId: string,
    emails: string[],
  ): Promise<string[]> {
    return this.teamsRepository.findMemberUserIdsByEmails(
      teamId,
      excludeUserId,
      emails,
    );
  }

  async create(userId: string, data: { name: string; description?: string }) {
    return this.teamsRepository.createWithOwner(userId, data);
  }

  async listForUser(userId: string) {
    return this.teamsRepository.listForUser(userId, PAGINATION.MAX_LIMIT);
  }

  async getForUser(userId: string, teamId: string) {
    const team = await this.teamsRepository.findForUser(userId, teamId);

    if (!team) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    return team;
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

    const updated = await this.teamsRepository.updateTeam(teamId, data);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      ownerId: updated.ownerId,
      createdAt: updated.createdAt,
      role: membership.role,
      memberCount: updated.memberCount,
    };
  }

  async delete(userId: string, teamId: string): Promise<void> {
    await this.teamOrThrow(teamId);
    await this.teamsRepository.requireMembershipRecord(teamId, userId);

    // El borrado de miembros es en cascada por la relacion de Prisma.
    await this.teamsRepository.deleteTeam(teamId);
  }

  async invite(
    userId: string,
    teamId: string,
    email: string,
    membership: TeamMembershipContext,
  ) {
    this.assertCanInvite(membership.role);

    const target = await this.usersService.findByEmail(email);

    if (!target) {
      throw new NotFoundException(
        `No existe una cuenta con el correo ${email}. La invitación vía correo llega en la FASE 10.`,
      );
    }

    const existing = await this.teamsRepository.findMembershipRecord(
      teamId,
      target.id,
    );

    if (existing) {
      throw new ConflictException(
        'Ese usuario ya pertenece a este equipo en MeetFlow',
      );
    }

    const created = await this.teamsRepository.createMembership(
      teamId,
      target.id,
      TeamRole.MEMBER,
    );

    this.eventEmitter.emit(
      'team.membership.changed',
      new TeamMembershipChangedEvent(teamId, target.id, userId, 'INVITED'),
    );

    return created;
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

    return this.teamsRepository.updateMembership(memberId, { role: newRole });
  }

  async removeMember(
    actorId: string,
    teamId: string,
    memberId: string,
    membership: TeamMembershipContext,
  ) {
    this.assertCanManageMembers(membership.role);

    const target = await this.memberOrThrow(teamId, memberId);

    if (target.role === TeamRole.OWNER) {
      throw new BadRequestException(
        'El OWNER no se puede eliminar: transfiere la propiedad o borra el equipo',
      );
    }

    this.assertCanModifyMembership(membership.role, target.role);

    await this.teamsRepository.deleteMembership(memberId);

    this.eventEmitter.emit(
      'team.membership.changed',
      new TeamMembershipChangedEvent(teamId, target.userId, actorId, 'REMOVED'),
    );
  }

  async leave(userId: string, teamId: string): Promise<void> {
    const membership = await this.teamsRepository.findMembershipRecord(
      teamId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    if (membership.role === TeamRole.OWNER) {
      throw new BadRequestException(
        'El OWNER no puede abandonar el equipo: transfiere la propiedad o bórralo',
      );
    }

    await this.teamsRepository.deleteMembership(membership.id);
  }

  async transferOwnership(ownerId: string, teamId: string, newOwnerId: string) {
    const team = await this.teamOrThrow(teamId);

    if (team.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Solo el OWNER puede transferir la propiedad',
      );
    }

    const currentOwnership = await this.teamsRepository.findMembershipRecord(
      teamId,
      ownerId,
    );

    if (!currentOwnership || currentOwnership.role !== TeamRole.OWNER) {
      throw new ForbiddenException(
        'Solo el OWNER puede transferir la propiedad',
      );
    }

    const newOwnerMember = await this.teamsRepository.findMembershipRecord(
      teamId,
      newOwnerId,
    );

    if (!newOwnerMember || newOwnerMember.role === TeamRole.GUEST) {
      throw new BadRequestException(
        'El nuevo propietario debe ser un miembro del equipo',
      );
    }

    await this.teamsRepository.transferOwnership(
      teamId,
      currentOwnership.id,
      newOwnerMember.id,
      newOwnerId,
    );
  }

  private async teamOrThrow(teamId: string) {
    const team = await this.teamsRepository.findTeamById(teamId);

    if (!team) {
      throw new NotFoundException('Equipo no encontrado');
    }

    return team;
  }

  private async memberOrThrow(teamId: string, memberId: string) {
    const member = await this.teamsRepository.findMemberById(teamId, memberId);

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
}
