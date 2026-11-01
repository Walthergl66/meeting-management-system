import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeamsModule } from '../teams/teams.module';
import { MeetingAccessModule } from '../meetings/meeting-access.module';
import { MeetingAccessGuard } from '../meetings/meeting-access.guard';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

@Module({
  imports: [PrismaModule, TeamsModule, MeetingAccessModule],
  controllers: [AgendaController],
  providers: [AgendaService, MeetingAccessGuard],
})
export class AgendaModule {}
