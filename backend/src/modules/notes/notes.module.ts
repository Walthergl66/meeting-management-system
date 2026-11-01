import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeamsModule } from '../teams/teams.module';
import { MeetingAccessModule } from '../meetings/meeting-access.module';
import { MeetingAccessGuard } from '../meetings/meeting-access.guard';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
  imports: [PrismaModule, TeamsModule, MeetingAccessModule],
  controllers: [NotesController],
  providers: [NotesService, MeetingAccessGuard],
})
export class NotesModule {}
