import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { TeamsController } from './teams.controller';
import { TeamRoleGuard } from './team-role.guard';
import { TeamAuthorizationService } from './team-authorization.service';
import { TeamsService } from './teams.service';
import { TEAMS_REPOSITORY } from './teams.tokens';
import { PrismaTeamsRepository } from './infrastructure/prisma-teams.repository';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [TeamsController],
  providers: [
    TeamsService,
    TeamAuthorizationService,
    TeamRoleGuard,
    { provide: TEAMS_REPOSITORY, useClass: PrismaTeamsRepository },
  ],
  exports: [TeamsService, TeamAuthorizationService],
})
export class TeamsModule {}
