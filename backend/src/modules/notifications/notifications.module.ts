import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
