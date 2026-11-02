import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeamsModule } from '../teams/teams.module';
import { MeetingAccessModule } from '../meetings/meeting-access.module';
import { MeetingAccessGuard } from '../meetings/meeting-access.guard';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { NOTES_REPOSITORY } from './notes.tokens';
import { PrismaNotesRepository } from './infrastructure/prisma-notes.repository';

@Module({
  imports: [PrismaModule, TeamsModule, MeetingAccessModule],
  controllers: [NotesController],
  providers: [
    NotesService,
    MeetingAccessGuard,
    { provide: NOTES_REPOSITORY, useClass: PrismaNotesRepository },
  ],
})
export class NotesModule {}
