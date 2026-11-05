import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MeetingAccessService } from './meeting-access.service';
import { MEETINGS_REPOSITORY } from './meetings.tokens';
import { PrismaMeetingsRepository } from './infrastructure/prisma-meetings.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    MeetingAccessService,
    { provide: MEETINGS_REPOSITORY, useClass: PrismaMeetingsRepository },
  ],
  exports: [MeetingAccessService],
})
export class MeetingAccessModule {}
