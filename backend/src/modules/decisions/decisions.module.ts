import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeamsModule } from '../teams/teams.module';
import { MeetingAccessModule } from '../meetings/meeting-access.module';
import { MeetingAccessGuard } from '../meetings/meeting-access.guard';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { DECISIONS_REPOSITORY } from './decisions.tokens';
import { PrismaDecisionsRepository } from './infrastructure/prisma-decisions.repository';

@Module({
  imports: [PrismaModule, TeamsModule, MeetingAccessModule],
  controllers: [DecisionsController],
  providers: [
    DecisionsService,
    MeetingAccessGuard,
    { provide: DECISIONS_REPOSITORY, useClass: PrismaDecisionsRepository },
  ],
})
export class DecisionsModule {}
