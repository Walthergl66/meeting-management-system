import { TeamRole } from '@meetflow/types';

type TeamSummary = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  role: TeamRole;
  memberCount: number;
};

type TeamWithMembers = TeamSummary & {
  members: Array<{
    id: string;
    role: TeamRole;
    joinedAt: Date;
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  }>;
};

type MemberLike = TeamWithMembers['members'][number];

export interface TeamPresented {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  role: TeamRole;
  memberCount: number;
  createdAt: Date;
}

export interface TeamMemberPresented {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: TeamRole;
  joinedAt: Date;
}

export function toTeamMemberPresenter(member: MemberLike): TeamMemberPresented {
  return {
    id: member.id,
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
    avatarUrl: member.user.avatarUrl,
    role: member.role,
    joinedAt: member.joinedAt,
  };
}

export function toTeamPresenter(team: TeamSummary): TeamPresented {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    ownerId: team.ownerId,
    role: team.role,
    memberCount: team.memberCount,
    createdAt: team.createdAt,
  };
}

export function toDetailedTeamPresenter(
  team: TeamWithMembers,
): TeamPresented & { members: TeamMemberPresented[] } {
  return {
    ...toTeamPresenter(team),
    members: team.members.map(toTeamMemberPresenter),
  };
}

export function toCreatedMemberPresenter(
  member: MemberLike & {
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  },
): TeamMemberPresented {
  return {
    id: member.id,
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
    avatarUrl: member.user.avatarUrl,
    role: member.role,
    joinedAt: member.joinedAt,
  };
}
