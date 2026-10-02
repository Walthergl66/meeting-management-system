import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [DecisionsController],
  providers: [DecisionsService],
})
export class DecisionsModule {}
