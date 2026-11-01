import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MeetingAccessService } from './meeting-access.service';

@Module({
  imports: [PrismaModule],
  providers: [MeetingAccessService],
  exports: [MeetingAccessService],
})
export class MeetingAccessModule {}
