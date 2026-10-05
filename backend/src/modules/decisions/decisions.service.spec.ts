import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DecisionCreatedEvent,
  DecisionUpdatedEvent,
} from '../../common/events/domain-events';
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
  let eventEmitter: { emitAsync: jest.Mock };

  beforeEach(async () => {
    eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };
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
        { provide: EventEmitter2, useValue: eventEmitter },
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

    it('emite decision.created con el texto buscable', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue({ id: 'prt_1' });
      prisma.decision.create.mockResolvedValue({
        ...decisionRow,
        title: 'Título',
        content: 'Se lo pedimos a @ana@correo.com',
      });

      await service.create('usr_2', meetingRef, {
        title: 'Título',
        content: 'Se lo pedimos a @ana@correo.com',
      });

      const [name, event] = eventEmitter.emitAsync.mock.calls[0];
      expect(name).toBe('decision.created');
      expect(event).toBeInstanceOf(DecisionCreatedEvent);
      expect(event).toMatchObject({
        decisionId: 'dec_1',
        teamId: 'team_1',
        authorId: 'usr_2',
        // Título y contenido juntos: es lo que puede citar a alguien.
        searchableText: 'Título Se lo pedimos a @ana@correo.com',
      });
    });

    it('no conoce el módulo de notificaciones al crear', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue({ id: 'prt_1' });
      prisma.decision.create.mockResolvedValue(decisionRow);

      await service.create('usr_2', meetingRef, { title: 'Título' });

      expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emitAsync.mock.calls[0][0]).toBe('decision.created');
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

    it('emite decision.updated con el texto anterior y el nuevo', async () => {
      prisma.decision.findFirst.mockResolvedValue({
        ...decisionRow,
        authorId: 'usr_2',
        title: 'Título viejo',
        content: 'contenido viejo',
      });
      prisma.decision.update.mockResolvedValue({
        ...decisionRow,
        title: 'Título nuevo',
        content: 'contenido nuevo',
      });

      await service.update('usr_2', meetingRef, 'dec_1', {
        title: 'Título nuevo',
        content: 'contenido nuevo',
      });

      const [name, event] = eventEmitter.emitAsync.mock.calls[0];
      expect(name).toBe('decision.updated');
      expect(event).toBeInstanceOf(DecisionUpdatedEvent);
      expect(event).toMatchObject({
        decisionId: 'dec_1',
        teamId: 'team_1',
        authorId: 'usr_2',
        searchableText: 'Título nuevo contenido nuevo',
        previousSearchableText: 'Título viejo contenido viejo',
      });
    });

    it('conserva el contenido anterior si la edición solo cambia el título', async () => {
      prisma.decision.findFirst.mockResolvedValue({
        ...decisionRow,
        authorId: 'usr_2',
        title: 'Título viejo',
        content: 'detalle',
      });
      prisma.decision.update.mockResolvedValue(decisionRow);

      await service.update('usr_2', meetingRef, 'dec_1', {
        title: 'Título nuevo',
      });

      const [, event] = eventEmitter.emitAsync.mock.calls[0];
      expect(event.searchableText).toBe('Título nuevo detalle');
      expect(event.previousSearchableText).toBe('Título viejo detalle');
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
