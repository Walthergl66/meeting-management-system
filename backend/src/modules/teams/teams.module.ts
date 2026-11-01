import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { TeamsController } from './teams.controller';
import { TeamRoleGuard } from './team-role.guard';
import { TeamAuthorizationService } from './team-authorization.service';
import { TeamsService } from './teams.service';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [TeamsController],
  providers: [TeamsService, TeamAuthorizationService, TeamRoleGuard],
  exports: [TeamsService, TeamAuthorizationService],
})
export class TeamsModule {}
