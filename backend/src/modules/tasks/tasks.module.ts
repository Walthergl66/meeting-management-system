import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeamsModule } from '../teams/teams.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule, TeamsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
