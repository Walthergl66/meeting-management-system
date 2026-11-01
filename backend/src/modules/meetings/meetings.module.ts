import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeamsModule } from '../teams/teams.module';
import { MeetingAccessModule } from './meeting-access.module';
import { MeetingAccessGuard } from './meeting-access.guard';
import { MEETINGS_REPOSITORY } from './meetings.tokens';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { PrismaMeetingsRepository } from './infrastructure/prisma-meetings.repository';

@Module({
  imports: [PrismaModule, TeamsModule, MeetingAccessModule],
  controllers: [MeetingsController],
  providers: [
    MeetingsService,
    MeetingAccessGuard,
    {
      provide: MEETINGS_REPOSITORY,
      useClass: PrismaMeetingsRepository,
    },
  ],
})
export class MeetingsModule {}
