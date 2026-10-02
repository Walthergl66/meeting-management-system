import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { MentionsService } from './mentions.service';
import { MentionsListener } from './mentions.listener';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationSchedulerService,
    MentionsService,
    MentionsListener,
  ],
})
export class NotificationsModule {}
