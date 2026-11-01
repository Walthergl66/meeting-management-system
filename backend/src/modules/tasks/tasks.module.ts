import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeamsModule } from '../teams/teams.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TASKS_REPOSITORY } from './tasks.tokens';
import { PrismaTasksRepository } from './infrastructure/prisma-tasks.repository';

@Module({
  imports: [PrismaModule, TeamsModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    { provide: TASKS_REPOSITORY, useClass: PrismaTasksRepository },
  ],
})
export class TasksModule {}
