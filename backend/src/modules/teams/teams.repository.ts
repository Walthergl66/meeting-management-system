import { TeamRole } from '../../shared';
import { TeamMembershipContext } from '../../common/types/team-membership-context';

export interface TeamRecord {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMemberRecord {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface TeamSummary extends TeamRecord {
  role: TeamRole;
  memberCount: number;
  members?: Array<{
    id: string;
    teamId: string;
    userId: string;
    role: TeamRole;
    joinedAt: Date;
    user: NonNullable<TeamMemberRecord['user']>;
  }>;
}
export type TeamDetailRecord = TeamSummary & {
  members: NonNullable<TeamSummary['members']>;
};
export type TeamMemberWithUserRecord = TeamMemberRecord & {
  user: NonNullable<TeamMemberRecord['user']>;
};

export interface TeamsRepository {
  findMembership(
    teamId: string,
    userId: string,
  ): Promise<TeamMembershipContext | null>;
  findMemberUserIds(teamId: string, userIds: string[]): Promise<string[]>;
  listMemberUserIds(teamId: string, excludeUserId?: string): Promise<string[]>;
  findMemberUserIdsByEmails(teamId: string, excludeUserId: string, emails: string[]): Promise<string[]>;
  createWithOwner(
    userId: string,
    data: { name: string; description?: string },
  ): Promise<TeamSummary>;
  listForUser(userId: string, limit: number): Promise<TeamSummary[]>;
  findForUser(userId: string, teamId: string): Promise<TeamSummary | null>;
  findTeamById(teamId: string): Promise<TeamRecord | null>;
  updateTeam(
    teamId: string,
    data: { name?: string; description?: string },
  ): Promise<TeamRecord & { memberCount: number }>;
  deleteTeam(teamId: string): Promise<void>;
  findMembershipRecord(
    teamId: string,
    userId: string,
  ): Promise<TeamMemberRecord | null>;
  requireMembershipRecord(teamId: string, userId: string): Promise<void>;
  createMembership(
    teamId: string,
    userId: string,
    role: TeamRole,
  ): Promise<TeamMemberRecord>;
  updateMembership(
    memberId: string,
    data: { role?: TeamRole },
  ): Promise<TeamMemberRecord>;
  deleteMembership(memberId: string): Promise<void>;
  findMemberById(
    teamId: string,
    memberId: string,
  ): Promise<TeamMemberRecord | null>;
  transferOwnership(
    teamId: string,
    currentOwnerMembershipId: string,
    newOwnerMembershipId: string,
    newOwnerId: string,
  ): Promise<void>;
}
