import { SetMetadata } from '@nestjs/common';
import { TeamAction } from '@meetflow/config';

export const TEAM_ACTION_KEY = 'team_action';

/** Exige el permiso de equipo declarado en TEAM_PERMISSIONS para el rol. */
export const RequireTeamAction = (action: TeamAction) =>
  SetMetadata(TEAM_ACTION_KEY, action);
