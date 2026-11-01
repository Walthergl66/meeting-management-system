import { TeamRole } from '../../shared';

export interface TeamMembershipContext {
  teamId: string;
  role: TeamRole;
}
