import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateTaskRecord,
  TaskListFilters,
  TaskMutationRecord,
  TaskRecord,
  TasksRepository,
  UpdateTaskRecord,
} from '../tasks.repository';

const taskRelations = {
  assignee: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  creator: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  team: { select: { id: true, name: true } },
  meeting: { select: { id: true, title: true } },
  decision: { select: { id: true, title: true } },
};

@Injectable()
export class PrismaTasksRepository implements TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(
    userId: string,
    filters: TaskListFilters,
    limit: number,
  ): Promise<TaskRecord[]> {
    return this.prisma.task.findMany({
      where: {
        team: { members: { some: { userId } } },
        ...(filters.teamId ? { teamId: filters.teamId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
        ...(filters.meetingId ? { meetingId: filters.meetingId } : {}),
        ...(filters.from || filters.to
          ? {
              dueDate: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      include: taskRelations,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findByIdForUser(userId: string, taskId: string): Promise<TaskRecord | null> {
    return this.prisma.task.findFirst({
      where: { id: taskId, team: { members: { some: { userId } } } },
      include: taskRelations,
    });
  }

  findForMutation(
    userId: string,
    taskId: string,
  ): Promise<TaskMutationRecord | null> {
    return this.prisma.task.findFirst({
      where: { id: taskId, team: { members: { some: { userId } } } },
    });
  }

  create(data: CreateTaskRecord): Promise<TaskRecord> {
    return this.prisma.task.create({ data, include: taskRelations });
  }

  update(taskId: string, data: UpdateTaskRecord): Promise<TaskRecord> {
    return this.prisma.task.update({
      where: { id: taskId },
      data,
      include: taskRelations,
    });
  }

  async delete(taskId: string): Promise<void> {
    await this.prisma.task.delete({ where: { id: taskId } });
  }
}
