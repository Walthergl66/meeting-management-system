import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeamsModule } from '../teams/teams.module';
import { MeetingAccessModule } from './meeting-access.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [PrismaModule, TeamsModule, MeetingAccessModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
