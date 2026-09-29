import { TeamRole } from '@meetflow/types';

export const TeamAction = {
  EDIT_TEAM: 'EDIT_TEAM',
  INVITE_MEMBERS: 'INVITE_MEMBERS',
  CHANGE_MEMBER_ROLE: 'CHANGE_MEMBER_ROLE',
  REMOVE_MEMBER: 'REMOVE_MEMBER',
  CREATE_MEETING: 'CREATE_MEETING',
  VIEW_MEETINGS: 'VIEW_MEETINGS',
  CANCEL_OTHER_MEETING: 'CANCEL_OTHER_MEETING',
  VIEW_NOTES: 'VIEW_NOTES',
  CREATE_TASKS: 'CREATE_TASKS',
  TRANSFER_OWNERSHIP: 'TRANSFER_OWNERSHIP',
  DELETE_TEAM: 'DELETE_TEAM',
} as const;
export type TeamAction = (typeof TeamAction)[keyof typeof TeamAction];

export const TEAM_PERMISSIONS: Record<TeamAction, TeamRole[]> = {
  [TeamAction.EDIT_TEAM]: ['OWNER', 'ADMIN'],
  [TeamAction.INVITE_MEMBERS]: ['OWNER', 'ADMIN'],
  [TeamAction.CHANGE_MEMBER_ROLE]: ['OWNER', 'ADMIN'],
  [TeamAction.REMOVE_MEMBER]: ['OWNER', 'ADMIN'],
  [TeamAction.CREATE_MEETING]: ['OWNER', 'ADMIN', 'MEMBER'],
  [TeamAction.VIEW_MEETINGS]: ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'],
  [TeamAction.CANCEL_OTHER_MEETING]: ['OWNER', 'ADMIN'],
  [TeamAction.VIEW_NOTES]: ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'],
  [TeamAction.CREATE_TASKS]: ['OWNER', 'ADMIN', 'MEMBER'],
  [TeamAction.TRANSFER_OWNERSHIP]: ['OWNER'],
  [TeamAction.DELETE_TEAM]: ['OWNER'],
};

export function roleCan(role: TeamRole, action: TeamAction): boolean {
  const allowed = TEAM_PERMISSIONS[action];
  return Array.isArray(allowed) && allowed.includes(role);
}

export const ROLE_HIERARCHY: TeamRole[] = [
  TeamRole.OWNER,
  TeamRole.ADMIN,
  TeamRole.MEMBER,
  TeamRole.GUEST,
];
