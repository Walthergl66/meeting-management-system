import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { toAttachmentResponse } from './attachments.presenter';
import { AttachmentsService } from './attachments.service';

const TEAM_A = 'team_a';
const TEAM_B = 'team_b';
const USER_IN_A = 'usr_a';
const USER_IN_B = 'usr_b';

const pngFile = (overrides: Partial<Express.Multer.File> = {}) =>
  ({
    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
    originalname: 'captura.png',
    mimetype: 'image/png',
    size: 8,
    ...overrides,
  }) as Express.Multer.File;

const attachmentRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'att_1',
  filename: 'captura.png',
  originalName: 'captura.png',
  mimeType: 'image/png',
  sizeBytes: 8,
  storageKey: 'uploads/team_a/att_1.png',
  storageUrl: null,
  meetingId: 'mtg_1',
  noteId: null,
  taskId: null,
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  ...overrides,
});

const meetingScope = (teamId: string) => ({
  meeting: { teamId },
  note: null,
  task: null,
});

const noteScope = (teamId: string) => ({
  meeting: null,
  note: { meeting: { teamId } },
  task: null,
});

const taskScope = (teamId: string) => ({
  meeting: null,
  note: null,
  task: { teamId },
});

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let prisma: {
    attachment: Record<string, jest.Mock>;
    meeting: Record<string, jest.Mock>;
    meetingNote: Record<string, jest.Mock>;
    task: Record<string, jest.Mock>;
    teamMember: Record<string, jest.Mock>;
  };
  let storage: { upload: jest.Mock; delete: jest.Mock; getUrl: jest.Mock };

  beforeEach(async () => {
    prisma = {
      attachment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      meeting: { findUnique: jest.fn() },
      meetingNote: { findUnique: jest.fn() },
      task: { findUnique: jest.fn() },
      teamMember: { findUnique: jest.fn() },
    };

    storage = {
      upload: jest.fn().mockResolvedValue({
        key: 'uploads/team_a/att_1.png',
        url: null,
        filename: 'captura.png',
        mimeType: 'image/png',
        sizeBytes: 8,
      }),
      delete: jest.fn().mockResolvedValue(undefined),
      getUrl: jest.fn().mockReturnValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'STORAGE_SERVICE', useValue: storage },
      ],
    }).compile();

    service = module.get(AttachmentsService);
  });

  /** El usuario pertenece al equipo indicado y a ningun otro. */
  const memberOf = (teamId: string) =>
    prisma.teamMember.findUnique.mockImplementation(
      async ({ where }: { where: { teamId_userId: { teamId: string } } }) =>
        where.teamId_userId.teamId === teamId ? { id: 'mem_1' } : null,
    );

  const outsider = () => prisma.teamMember.findUnique.mockResolvedValue(null);

  describe('upload', () => {
    it('sube el archivo cuando el usuario pertenece al equipo de la reunion', async () => {
      memberOf(TEAM_A);
      prisma.meeting.findUnique.mockResolvedValue({ teamId: TEAM_A });
      prisma.attachment.create.mockResolvedValue(attachmentRow());

      const result = await service.upload(USER_IN_A, pngFile(), {
        meetingId: 'mtg_1',
      });

      expect(result.id).toBe('att_1');
      expect(storage.upload).toHaveBeenCalledTimes(1);
      expect(prisma.attachment.create).toHaveBeenCalledTimes(1);
    });

    it('rechaza subir a una reunion de otro equipo (no escribe nada)', async () => {
      memberOf(TEAM_A);
      prisma.meeting.findUnique.mockResolvedValue({ teamId: TEAM_B });

      await expect(
        service.upload(USER_IN_A, pngFile(), { meetingId: 'mtg_1' }),
      ).rejects.toThrow(ForbiddenException);

      expect(storage.upload).not.toHaveBeenCalled();
      expect(prisma.attachment.create).not.toHaveBeenCalled();
    });

    it('exige membresia tambien cuando el destino es una nota', async () => {
      memberOf(TEAM_A);
      prisma.meetingNote.findUnique.mockResolvedValue({
        meeting: { teamId: TEAM_B },
      });

      await expect(
        service.upload(USER_IN_A, pngFile(), { noteId: 'note_1' }),
      ).rejects.toThrow(ForbiddenException);

      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('exige membresia tambien cuando el destino es una tarea', async () => {
      memberOf(TEAM_A);
      prisma.task.findUnique.mockResolvedValue({ teamId: TEAM_B });

      await expect(
        service.upload(USER_IN_A, pngFile(), { taskId: 'task_1' }),
      ).rejects.toThrow(ForbiddenException);

      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('permite subir a una nota del propio equipo', async () => {
      memberOf(TEAM_A);
      prisma.meetingNote.findUnique.mockResolvedValue({
        meeting: { teamId: TEAM_A },
      });
      prisma.attachment.create.mockResolvedValue(
        attachmentRow({ meetingId: null, noteId: 'note_1' }),
      );

      await service.upload(USER_IN_A, pngFile(), { noteId: 'note_1' });

      expect(prisma.attachment.create).toHaveBeenCalledTimes(1);
    });

    it('permite subir a una tarea del propio equipo', async () => {
      memberOf(TEAM_A);
      prisma.task.findUnique.mockResolvedValue({ teamId: TEAM_A });
      prisma.attachment.create.mockResolvedValue(
        attachmentRow({ meetingId: null, taskId: 'task_1' }),
      );

      await service.upload(USER_IN_A, pngFile(), { taskId: 'task_1' });

      expect(prisma.attachment.create).toHaveBeenCalledTimes(1);
    });

    it('devuelve 404 si la reunion de destino no existe', async () => {
      memberOf(TEAM_A);
      prisma.meeting.findUnique.mockResolvedValue(null);

      await expect(
        service.upload(USER_IN_A, pngFile(), { meetingId: 'nope' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('devuelve 404 si la nota de destino no existe', async () => {
      memberOf(TEAM_A);
      prisma.meetingNote.findUnique.mockResolvedValue(null);

      await expect(
        service.upload(USER_IN_A, pngFile(), { noteId: 'nope' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('devuelve 404 si la tarea de destino no existe', async () => {
      memberOf(TEAM_A);
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(
        service.upload(USER_IN_A, pngFile(), { taskId: 'nope' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza un usuario sin ninguna pertenencia', async () => {
      outsider();
      prisma.meeting.findUnique.mockResolvedValue({ teamId: TEAM_A });

      await expect(
        service.upload(USER_IN_B, pngFile(), { meetingId: 'mtg_1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza un archivo ausente', async () => {
      await expect(
        service.upload(USER_IN_A, undefined, { meetingId: 'mtg_1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza un archivo por encima del limite de tamaño', async () => {
      await expect(
        service.upload(USER_IN_A, pngFile({ size: 11 * 1024 * 1024 }), {
          meetingId: 'mtg_1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza un tipo MIME no permitido', async () => {
      await expect(
        service.upload(
          USER_IN_A,
          pngFile({ mimetype: 'application/x-msdownload' }),
          {
            meetingId: 'mtg_1',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza la peticion sin ningun destino', async () => {
      await expect(service.upload(USER_IN_A, pngFile(), {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza mas de un destino a la vez', async () => {
      await expect(
        service.upload(USER_IN_A, pngFile(), {
          meetingId: 'mtg_1',
          taskId: 'task_1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('devuelve el adjunto a un miembro del equipo dueno', async () => {
      memberOf(TEAM_A);
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow(),
        ...meetingScope(TEAM_A),
      });

      const result = await service.findOne(USER_IN_A, 'att_1');

      expect(result.id).toBe('att_1');
    });

    it('niega la lectura a un usuario de otro equipo', async () => {
      memberOf(TEAM_A);
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow(),
        ...meetingScope(TEAM_B),
      });

      await expect(service.findOne(USER_IN_A, 'att_1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('niega la lectura a un usuario sin pertenencia alguna', async () => {
      outsider();
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow(),
        ...meetingScope(TEAM_A),
      });

      await expect(service.findOne(USER_IN_B, 'att_1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('resuelve el equipo a traves de la nota', async () => {
      memberOf(TEAM_A);
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow({ meetingId: null, noteId: 'note_1' }),
        ...noteScope(TEAM_A),
      });

      await expect(service.findOne(USER_IN_A, 'att_1')).resolves.toBeDefined();
    });

    it('niega un adjunto cuya nota pertenece a otro equipo', async () => {
      memberOf(TEAM_A);
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow({ meetingId: null, noteId: 'note_1' }),
        ...noteScope(TEAM_B),
      });

      await expect(service.findOne(USER_IN_A, 'att_1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('resuelve el equipo a traves de la tarea', async () => {
      memberOf(TEAM_A);
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow({ meetingId: null, taskId: 'task_1' }),
        ...taskScope(TEAM_A),
      });

      await expect(service.findOne(USER_IN_A, 'att_1')).resolves.toBeDefined();
    });

    it('niega un adjunto cuya tarea pertenece a otro equipo', async () => {
      memberOf(TEAM_A);
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow({ meetingId: null, taskId: 'task_1' }),
        ...taskScope(TEAM_B),
      });

      await expect(service.findOne(USER_IN_A, 'att_1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('niega un adjunto huerfano sin ningun equipo resoluble', async () => {
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow({ meetingId: null, noteId: null, taskId: null }),
        meeting: null,
        note: null,
        task: null,
      });

      await expect(service.findOne(USER_IN_A, 'att_1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.teamMember.findUnique).not.toHaveBeenCalled();
    });

    it('devuelve 404 si el adjunto no existe', async () => {
      prisma.attachment.findUnique.mockResolvedValue(null);

      await expect(service.findOne(USER_IN_A, 'att_1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('borra la fila y el objeto del storage para un miembro del equipo', async () => {
      memberOf(TEAM_A);
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow(),
        ...meetingScope(TEAM_A),
      });
      prisma.attachment.delete.mockResolvedValue(attachmentRow());

      await service.delete(USER_IN_A, 'att_1');

      expect(prisma.attachment.delete).toHaveBeenCalledWith({
        where: { id: 'att_1' },
      });
      expect(storage.delete).toHaveBeenCalledWith('uploads/team_a/att_1.png');
    });

    it('niega el borrado a un usuario de otro equipo y no borra nada', async () => {
      memberOf(TEAM_A);
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow(),
        ...meetingScope(TEAM_B),
      });

      await expect(service.delete(USER_IN_A, 'att_1')).rejects.toThrow(
        ForbiddenException,
      );

      expect(prisma.attachment.delete).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('niega el borrado a un usuario sin pertenencia alguna', async () => {
      outsider();
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow(),
        ...meetingScope(TEAM_A),
      });

      await expect(service.delete(USER_IN_B, 'att_1')).rejects.toThrow(
        ForbiddenException,
      );

      expect(prisma.attachment.delete).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('niega el borrado cuando el adjunto pertenece a una tarea ajena', async () => {
      memberOf(TEAM_A);
      prisma.attachment.findUnique.mockResolvedValue({
        ...attachmentRow({ meetingId: null, taskId: 'task_1' }),
        ...taskScope(TEAM_B),
      });

      await expect(service.delete(USER_IN_A, 'att_1')).rejects.toThrow(
        ForbiddenException,
      );

      expect(prisma.attachment.delete).not.toHaveBeenCalled();
    });

    it('devuelve 404 si el adjunto no existe', async () => {
      prisma.attachment.findUnique.mockResolvedValue(null);

      await expect(service.delete(USER_IN_A, 'att_1')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.attachment.delete).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });
  });

  describe('presenter', () => {
    it('no expone la clave interna del storage', () => {
      const response = toAttachmentResponse(
        attachmentRow() as never,
      ) as unknown as Record<string, unknown>;

      expect(response.storageKey).toBeUndefined();
      expect(response.filename).toBe('captura.png');
    });
  });
});
