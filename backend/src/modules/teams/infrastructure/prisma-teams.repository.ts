import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TeamRole } from '../../../shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { TeamMembershipContext } from '../../../common/types/team-membership-context';
import {
  TeamMemberRecord,
  TeamRecord,
  TeamSummary,
  TeamsRepository,
} from '../teams.repository';

const memberUser = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
};

@Injectable()
export class PrismaTeamsRepository implements TeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMembership(
    teamId: string,
    userId: string,
  ): Promise<TeamMembershipContext | null> {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    });
    return membership ? { teamId, role: membership.role } : null;
  }

  async findMemberUserIds(
    teamId: string,
    userIds: string[],
  ): Promise<string[]> {
    if (userIds.length === 0) return [];
    const memberships = await this.prisma.teamMember.findMany({
      where: { teamId, userId: { in: userIds } },
      select: { userId: true },
    });
    return memberships.map(({ userId }) => userId);
  }

  async listMemberUserIds(
    teamId: string,
    excludeUserId?: string,
  ): Promise<string[]> {
    const memberships = await this.prisma.teamMember.findMany({
      where: {
        teamId,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { userId: true },
    });
    return memberships.map(({ userId }) => userId);
  }

  async findMemberUserIdsByEmails(
    teamId: string,
    excludeUserId: string,
    emails: string[],
  ): Promise<string[]> {
    if (emails.length === 0) return [];
    const memberships = await this.prisma.teamMember.findMany({
      where: {
        teamId,
        userId: { not: excludeUserId },
        user: { email: { in: emails, mode: 'insensitive' } },
      },
      select: { userId: true },
    });
    return memberships.map(({ userId }) => userId);
  }

  createWithOwner(
    userId: string,
    data: { name: string; description?: string },
  ): Promise<TeamSummary> {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { ...data, ownerId: userId },
      });
      await tx.teamMember.create({
        data: { teamId: team.id, userId, role: TeamRole.OWNER },
      });
      return this.teamWithRole(tx, team.id, userId);
    });
  }

  async listForUser(userId: string, limit: number): Promise<TeamSummary[]> {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: { team: { include: { _count: { select: { members: true } } } } },
      orderBy: { joinedAt: 'asc' },
      take: limit,
    });
    return memberships.map(({ team, role }) => ({
      ...team,
      role,
      memberCount: team._count.members,
    }));
  }

  async findForUser(
    userId: string,
    teamId: string,
  ): Promise<TeamSummary | null> {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      include: {
        team: {
          include: {
            _count: { select: { members: true } },
            members: {
              include: { user: { select: memberUser } },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
      },
    });
    if (!membership) return null;
    const { team, role } = membership;
    return { ...team, role, memberCount: team._count.members };
  }

  findTeamById(teamId: string): Promise<TeamRecord | null> {
    return this.prisma.team.findUnique({ where: { id: teamId } });
  }

  async updateTeam(
    teamId: string,
    data: { name?: string; description?: string },
  ): Promise<TeamRecord & { memberCount: number }> {
    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data,
      include: { _count: { select: { members: true } } },
    });
    return { ...updated, memberCount: updated._count.members };
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.prisma.team.delete({ where: { id: teamId } });
  }

  findMembershipRecord(
    teamId: string,
    userId: string,
  ): Promise<TeamMemberRecord | null> {
    return this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
  }

  async requireMembershipRecord(teamId: string, userId: string): Promise<void> {
    await this.prisma.teamMember.findUniqueOrThrow({
      where: { teamId_userId: { teamId, userId } },
    });
  }

  createMembership(
    teamId: string,
    userId: string,
    role: TeamRole,
  ): Promise<TeamMemberRecord> {
    return this.prisma.teamMember.create({
      data: { teamId, userId, role },
      include: { user: { select: memberUser } },
    });
  }

  updateMembership(
    memberId: string,
    data: { role?: TeamRole },
  ): Promise<TeamMemberRecord> {
    return this.prisma.teamMember.update({ where: { id: memberId }, data });
  }

  async deleteMembership(memberId: string): Promise<void> {
    await this.prisma.teamMember.delete({ where: { id: memberId } });
  }

  findMemberById(
    teamId: string,
    memberId: string,
  ): Promise<TeamMemberRecord | null> {
    return this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
    });
  }

  async transferOwnership(
    teamId: string,
    currentOwnerMembershipId: string,
    newOwnerMembershipId: string,
    newOwnerId: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.teamMember.update({
        where: { id: currentOwnerMembershipId },
        data: { role: TeamRole.ADMIN },
      }),
      this.prisma.teamMember.update({
        where: { id: newOwnerMembershipId },
        data: { role: TeamRole.OWNER },
      }),
      this.prisma.team.update({
        where: { id: teamId },
        data: { ownerId: newOwnerId },
      }),
    ]);
  }

  private async teamWithRole(
    executor: Prisma.TransactionClient,
    teamId: string,
    userId: string,
  ): Promise<TeamSummary> {
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
