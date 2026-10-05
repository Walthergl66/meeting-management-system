import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AssistantService } from './assistant.service';
import {
  IAssistantService,
  AssistantSuggestion,
} from './interfaces/assistant.interface';

const TEAM_A = 'team_a';
const TEAM_B = 'team_b';
const USER_IN_A = 'usr_a';

const MEETING_IN_A = 'mtg_a';
const MEETING_IN_B = 'mtg_b';

const suggestion: AssistantSuggestion = { content: 'resumen', confidence: 0.5 };

describe('AssistantService', () => {
  let service: AssistantService;
  let provider: jest.Mocked<IAssistantService>;
  let prisma: {
    meeting: { findUnique: jest.Mock };
    team: { findUnique: jest.Mock };
    teamMember: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    provider = {
      summarizeMeeting: jest.fn().mockResolvedValue(suggestion),
      suggestAgenda: jest.fn().mockResolvedValue([suggestion]),
      summarizeTasks: jest.fn().mockResolvedValue(suggestion),
    };

    prisma = {
      meeting: { findUnique: jest.fn() },
      team: { findUnique: jest.fn() },
      teamMember: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        { provide: 'ASSISTANT_SERVICE', useValue: provider },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AssistantService);
  });

  const memberOf = (teamId: string) =>
    prisma.teamMember.findUnique.mockResolvedValue({
      id: `${teamId}_membership`,
    });

  describe('summarizeMeeting', () => {
    it('resume la reunión cuando el usuario pertenece a su equipo', async () => {
      prisma.meeting.findUnique.mockResolvedValue({ teamId: TEAM_A });
      memberOf(TEAM_A);

      const result = await service.summarizeMeeting(USER_IN_A, MEETING_IN_A);

      expect(result).toEqual(suggestion);
      expect(provider.summarizeMeeting).toHaveBeenCalledWith(MEETING_IN_A);
    });

    it('rechaza resumir la reunión de otro equipo sin invocar al provider', async () => {
      prisma.meeting.findUnique.mockResolvedValue({ teamId: TEAM_B });
      prisma.teamMember.findUnique.mockResolvedValue(null);

      await expect(
        service.summarizeMeeting(USER_IN_A, MEETING_IN_B),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(provider.summarizeMeeting).not.toHaveBeenCalled();
    });

    it('devuelve 404 si la reunión no existe', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      await expect(
        service.summarizeMeeting(USER_IN_A, 'mtg_inexistente'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(provider.summarizeMeeting).not.toHaveBeenCalled();
    });
  });

  describe('summarizeTasks', () => {
    it('resume las tareas cuando el usuario pertenece al equipo', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: TEAM_A });
      memberOf(TEAM_A);

      const result = await service.summarizeTasks(USER_IN_A, TEAM_A);

      expect(result).toEqual(suggestion);
      expect(provider.summarizeTasks).toHaveBeenCalledWith(TEAM_A);
    });

    it('rechaza resumir las tareas de otro equipo', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: TEAM_B });
      prisma.teamMember.findUnique.mockResolvedValue(null);

      await expect(
        service.summarizeTasks(USER_IN_A, TEAM_B),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(provider.summarizeTasks).not.toHaveBeenCalled();
    });

    it('devuelve 404 si el equipo no existe', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      await expect(
        service.summarizeTasks(USER_IN_A, 'team_inexistente'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('suggestAgenda', () => {
    it('delega sin comprobar equipo porque el texto es del usuario', async () => {
      const result = await service.suggestAgenda('titulo', 'descripcion');

      expect(result).toEqual([suggestion]);
      expect(provider.suggestAgenda).toHaveBeenCalledWith(
        'titulo',
        'descripcion',
      );
    });
  });
});
