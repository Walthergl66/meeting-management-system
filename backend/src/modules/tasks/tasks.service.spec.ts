import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '@meetflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { TasksService } from './tasks.service';

const memberMembership = { teamId: 'team_1', role: 'MEMBER' as const };

const taskRow = {
  id: 'task_1',
  title: 'Implementar endpoint',
  description: null,
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  dueDate: null,
  assigneeId: 'usr_2',
  creatorId: 'usr_1',
  teamId: 'team_1',
  meetingId: null,
  decisionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  assignee: { id: 'usr_2', name: 'Responsable', email: 'resp@correo.com' },
  creator: { id: 'usr_1', name: 'Creador', email: 'creador@correo.com' },
  team: { id: 'team_1', name: 'Equipo' },
  meeting: null,
};

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    task: Record<string, jest.Mock>;
    teamMember: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      teamMember: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TasksService);
  });

  describe('create', () => {
    it('crea una tarea sin reunión (tarea suelta)', async () => {
      prisma.teamMember.findUnique.mockResolvedValue(memberMembership);
      prisma.task.create.mockResolvedValue(taskRow);

      const result = await service.create('usr_1', {
        title: 'Tarea suelta',
        teamId: 'team_1',
      });

      expect(result.title).toBe('Implementar endpoint');
    });

    it('rechaza con 422 si el responsable no pertenece al equipo', async () => {
      prisma.teamMember.findUnique.mockResolvedValue(memberMembership);
      prisma.teamMember.findUnique.mockResolvedValueOnce(memberMembership);
      prisma.teamMember.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create('usr_1', {
          title: 'Tarea con responsable ajeno',
          teamId: 'team_1',
          assigneeId: 'usr_9',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rechaza con 403 si no pertenece al equipo', async () => {
      prisma.teamMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create('usr_9', { title: 'X', teamId: 'team_1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('el creador actualiza su tarea', async () => {
      prisma.task.findFirst.mockResolvedValue(taskRow);
      prisma.teamMember.findUnique.mockResolvedValue(memberMembership);
      prisma.task.update.mockResolvedValue(taskRow);

      await service.update('usr_1', 'task_1', { title: 'Nuevo título' });

      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('rechaza transición de estado inválida con 422', async () => {
      prisma.task.findFirst.mockResolvedValue({
        ...taskRow,
        status: TaskStatus.DONE,
      });
      prisma.teamMember.findUnique.mockResolvedValue(memberMembership);

      await expect(
        service.update('usr_1', 'task_1', { status: TaskStatus.BLOCKED }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rechaza con 403 si no es creador ni responsable', async () => {
      prisma.task.findFirst.mockResolvedValue(taskRow);
      prisma.teamMember.findUnique.mockResolvedValue(memberMembership);

      await expect(
        service.update('usr_9', 'task_1', { title: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza con 404 si la tarea no existe', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.update('usr_1', 'task_9', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('el creador elimina su tarea', async () => {
      prisma.task.findFirst.mockResolvedValue(taskRow);
      prisma.teamMember.findUnique.mockResolvedValue(memberMembership);
      prisma.task.delete.mockResolvedValue(undefined);

      await service.remove('usr_1', 'task_1');

      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task_1' },
      });
    });
  });
});
