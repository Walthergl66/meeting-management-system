import { TeamRole } from '../../shared';
import { composeName } from '../../common/utils/user-name';

type TeamSummary = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  role: TeamRole;
  memberCount: number;
};

type TeamMemberUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
};

type TeamWithMembers = TeamSummary & {
  members: Array<{
    id: string;
    role: TeamRole;
    joinedAt: Date;
    user: TeamMemberUser;
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

const toTeamMember = (member: MemberLike): TeamMemberPresented => ({
  id: member.id,
  userId: member.user.id,
  name: composeName(member.user),
  email: member.user.email,
  avatarUrl: member.user.avatarUrl,
  role: member.role,
  joinedAt: member.joinedAt,
});

export function toTeamMemberPresenter(member: MemberLike): TeamMemberPresented {
  return toTeamMember(member);
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
  member: MemberLike,
): TeamMemberPresented {
  return toTeamMember(member);
}
