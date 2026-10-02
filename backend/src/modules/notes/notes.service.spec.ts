import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MentionsService } from '../notifications/mentions.service';
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
  author: { id: 'usr_2', name: 'Autor', email: 'autor@correo.com' },
};

describe('NotesService', () => {
  let service: NotesService;
  let prisma: {
    meetingNote: Record<string, jest.Mock>;
    meetingParticipant: Record<string, jest.Mock>;
  };
  let mentions: { notifyMentions: jest.Mock };

  beforeEach(async () => {
    mentions = { notifyMentions: jest.fn() };
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
        { provide: MentionsService, useValue: mentions },
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
