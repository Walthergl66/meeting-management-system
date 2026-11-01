import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeamsModule } from '../teams/teams.module';
import { MeetingAccessModule } from '../meetings/meeting-access.module';
import { MeetingAccessGuard } from '../meetings/meeting-access.guard';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';

@Module({
  imports: [PrismaModule, TeamsModule, MeetingAccessModule],
  controllers: [ParticipantsController],
  providers: [ParticipantsService, MeetingAccessGuard],
})
export class ParticipantsModule {}
