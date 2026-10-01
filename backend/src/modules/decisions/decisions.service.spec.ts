import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { DecisionsService } from './decisions.service';

const meetingRef = {
  id: 'mtg_1',
  teamId: 'team_1',
  organizerId: 'usr_1',
};

const decisionRow = {
  id: 'dec_1',
  title: 'Usar PostgreSQL FTS',
  content: null,
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  author: { id: 'usr_2', name: 'Autor', email: 'autor@correo.com' },
};

describe('DecisionsService', () => {
  let service: DecisionsService;
  let prisma: {
    decision: Record<string, jest.Mock>;
    meetingParticipant: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      decision: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      meetingParticipant: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DecisionsService);
  });

  describe('create', () => {
    it('un participante registra una decisión', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue({ id: 'prt_1' });
      prisma.decision.create.mockResolvedValue(decisionRow);

      const result = await service.create('usr_2', meetingRef, {
        title: 'Decisión de prueba',
      });

      expect(result.title).toBe('Usar PostgreSQL FTS');
    });

    it('rechaza con 403 si no es participante de la reunión', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.create('usr_9', meetingRef, { title: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('el autor actualiza su decisión', async () => {
      prisma.decision.findFirst.mockResolvedValue({
        ...decisionRow,
        authorId: 'usr_2',
      });
      prisma.decision.update.mockResolvedValue(decisionRow);

      await service.update('usr_2', meetingRef, 'dec_1', {
        title: 'Título nuevo',
      });

      expect(prisma.decision.update).toHaveBeenCalled();
    });

    it('rechaza con 403 si no es autor ni organizador', async () => {
      prisma.decision.findFirst.mockResolvedValue({
        ...decisionRow,
        authorId: 'usr_2',
      });

      await expect(
        service.update('usr_9', meetingRef, 'dec_1', { title: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza con 404 si la decisión no pertenece a la reunión', async () => {
      prisma.decision.findFirst.mockResolvedValue(null);

      await expect(
        service.update('usr_1', meetingRef, 'dec_9', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('el organizador elimina una decisión', async () => {
      prisma.decision.findFirst.mockResolvedValue({
        ...decisionRow,
        authorId: 'usr_2',
      });
      prisma.decision.delete.mockResolvedValue(undefined);

      await service.remove('usr_1', meetingRef, 'dec_1');

      expect(prisma.decision.delete).toHaveBeenCalledWith({
        where: { id: 'dec_1' },
      });
    });
  });
});
