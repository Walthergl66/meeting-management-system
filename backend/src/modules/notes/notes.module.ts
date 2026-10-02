import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
