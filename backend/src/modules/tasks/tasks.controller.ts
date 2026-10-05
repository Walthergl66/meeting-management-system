import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '../../shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { ListTasksQueryDto } from './dto/list-tasks.query.dto';
import { TasksService } from './tasks.service';
import { toTaskPresenter } from './tasks.presenter';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las tareas del usuario autenticado' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTasksQueryDto,
  ) {
    const { from, to, ...filters } = query;
    const tasks = await this.tasksService.list(user.id, {
      ...filters,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    return tasks.map(toTaskPresenter);
  }

  @Post()
  @ApiOperation({ summary: 'Crea una tarea' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    const task = await this.tasksService.create(user.id, {
      title: dto.title,
      description: dto.description,
      priority: dto.priority as TaskPriority,
      dueDate: dto.dueDate,
      assigneeId: dto.assigneeId,
      teamId: dto.teamId,
      meetingId: dto.meetingId,
      decisionId: dto.decisionId,
    });
    return toTaskPresenter(task);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Devuelve el detalle de una tarea' })
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') taskId: string,
  ) {
    const task = await this.tasksService.get(user.id, taskId);
    return toTaskPresenter(task);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualiza una tarea' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(user.id, taskId, {
      title: dto.title,
      description: dto.description,
      status: dto.status as TaskStatus,
      priority: dto.priority as TaskPriority,
      dueDate: dto.dueDate,
      assigneeId: dto.assigneeId,
    });
    return toTaskPresenter(task);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina una tarea' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') taskId: string,
  ): Promise<{ message: string }> {
    await this.tasksService.remove(user.id, taskId);
    return { message: 'Tarea eliminada' };
  }
}
