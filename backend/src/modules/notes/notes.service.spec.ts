import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NoteCreatedEvent,
  NoteUpdatedEvent,
} from '../../common/events/domain-events';
import { NotesService } from './notes.service';

const meetingRef = {
  id: 'mtg_1',
  teamId: 'team_1',
  organizerId: 'usr_1',
};

const noteRow = {
  id: 'note_1',
  content: 'Texto de la nota',
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  author: {
    id: 'usr_2',
    firstName: 'Autor',
    lastName: '',
    email: 'autor@correo.com',
  },
};

describe('NotesService', () => {
  let service: NotesService;
  let prisma: {
    meetingNote: Record<string, jest.Mock>;
    meetingParticipant: Record<string, jest.Mock>;
  };
  let eventEmitter: { emitAsync: jest.Mock };

  beforeEach(async () => {
    eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };
    prisma = {
      meetingNote: {
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
        NotesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(NotesService);
  });

  describe('create', () => {
    it('un participante crea una nota', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue({ id: 'prt_1' });
      prisma.meetingNote.create.mockResolvedValue({
        ...noteRow,
        content: 'Nueva nota',
      });

      const result = await service.create('usr_2', meetingRef, 'Nueva nota');

      expect(result.content).toBe('Nueva nota');
    });

    it('emite note.created con el contenido para resolver menciones', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue({ id: 'prt_1' });
      prisma.meetingNote.create.mockResolvedValue({
        ...noteRow,
        content: 'Hola @ana@correo.com',
      });

      await service.create('usr_2', meetingRef, 'Hola @ana@correo.com');

      const [name, event] = eventEmitter.emitAsync.mock.calls[0];
      expect(name).toBe('note.created');
      expect(event).toBeInstanceOf(NoteCreatedEvent);
      expect(event).toMatchObject({
        noteId: 'note_1',
        meetingId: 'mtg_1',
        teamId: 'team_1',
        authorId: 'usr_2',
        content: 'Hola @ana@correo.com',
      });
    });

    it('no conoce el módulo de notificaciones al crear', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue({ id: 'prt_1' });
      prisma.meetingNote.create.mockResolvedValue(noteRow);

      await service.create('usr_2', meetingRef, 'Hola');

      // Solo emite el evento: el aviso de menciones lo decide otro módulo.
      expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emitAsync.mock.calls[0][0]).toBe('note.created');
    });

    it('rechaza con 403 si no es participante de la reunión', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.create('usr_9', meetingRef, 'Nota ajena'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('el autor actualiza su nota', async () => {
      prisma.meetingNote.findFirst.mockResolvedValue({
        ...noteRow,
        authorId: 'usr_2',
      });
      prisma.meetingNote.update.mockResolvedValue({
        ...noteRow,
        content: 'Nota actualizada',
      });

      const result = await service.update(
        'usr_2',
        meetingRef,
        'note_1',
        'Nota actualizada',
      );

      expect(result.content).toBe('Nota actualizada');
    });

    it('emite note.updated con el texto anterior y el nuevo', async () => {
      prisma.meetingNote.findFirst.mockResolvedValue({
        ...noteRow,
        authorId: 'usr_2',
        content: 'Texto original',
      });
      prisma.meetingNote.update.mockResolvedValue({
        ...noteRow,
        content: 'Texto nuevo con @luis@correo.com',
      });

      await service.update(
        'usr_2',
        meetingRef,
        'note_1',
        'Texto nuevo con @luis@correo.com',
      );

      const [name, event] = eventEmitter.emitAsync.mock.calls[0];
      expect(name).toBe('note.updated');
      expect(event).toBeInstanceOf(NoteUpdatedEvent);
      expect(event).toMatchObject({
        noteId: 'note_1',
        teamId: 'team_1',
        authorId: 'usr_2',
        content: 'Texto nuevo con @luis@correo.com',
        previousContent: 'Texto original',
      });
    });

    it('el organizador actualiza una nota ajena', async () => {
      prisma.meetingNote.findFirst.mockResolvedValue({
        ...noteRow,
        authorId: 'usr_2',
      });
      prisma.meetingNote.update.mockResolvedValue(noteRow);

      await service.update('usr_1', meetingRef, 'note_1', 'Contenido');

      expect(prisma.meetingNote.update).toHaveBeenCalled();
    });

    it('rechaza con 403 si no es autor ni organizador', async () => {
      prisma.meetingNote.findFirst.mockResolvedValue({
        ...noteRow,
        authorId: 'usr_2',
      });

      await expect(
        service.update('usr_9', meetingRef, 'note_1', 'X'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza con 404 si la nota no pertenece a la reunión', async () => {
      prisma.meetingNote.findFirst.mockResolvedValue(null);

      await expect(
        service.update('usr_1', meetingRef, 'note_9', 'X'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('el autor elimina su nota', async () => {
      prisma.meetingNote.findFirst.mockResolvedValue({
        ...noteRow,
        authorId: 'usr_2',
      });
      prisma.meetingNote.delete.mockResolvedValue(undefined);

      await service.remove('usr_2', meetingRef, 'note_1');

      expect(prisma.meetingNote.delete).toHaveBeenCalledWith({
        where: { id: 'note_1' },
      });
    });
  });
});
