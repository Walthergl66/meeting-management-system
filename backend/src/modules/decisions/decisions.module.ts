import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeamsModule } from '../teams/teams.module';
import { MeetingAccessModule } from '../meetings/meeting-access.module';
import { MeetingAccessGuard } from '../meetings/meeting-access.guard';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';

@Module({
  imports: [PrismaModule, TeamsModule, MeetingAccessModule],
  controllers: [DecisionsController],
  providers: [DecisionsService, MeetingAccessGuard],
})
export class DecisionsModule {}
