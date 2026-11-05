import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { MentionsService } from './mentions.service';
import { MentionsListener } from './mentions.listener';
import { NOTIFICATIONS_REPOSITORY } from './notifications.tokens';
import { PrismaNotificationsRepository } from './infrastructure/prisma-notifications.repository';
import { TeamsModule } from '../teams/teams.module';
import { ParticipantsModule } from '../participants/participants.module';

@Module({
  imports: [
    PrismaModule,
    TeamsModule,
    ParticipantsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationSchedulerService,
    MentionsService,
    MentionsListener,
    {
      provide: NOTIFICATIONS_REPOSITORY,
      useClass: PrismaNotificationsRepository,
    },
  ],
})
export class NotificationsModule {}
