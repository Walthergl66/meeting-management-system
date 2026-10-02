import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TeamRole } from '../../shared';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { ParticipantsService } from './participants.service';

const organizerMembership = { teamId: 'team_1', role: TeamRole.MEMBER };
const adminMembership = { teamId: 'team_1', role: TeamRole.ADMIN };

const meetingRef = {
  id: 'mtg_1',
  teamId: 'team_1',
  organizerId: 'usr_1',
};

const participantRow = {
  id: 'prt_1',
  userId: 'usr_2',
  status: 'INVITED',
  attendance: null,
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  user: {
    id: 'usr_2',
    name: 'Participante',
    email: 'participante@correo.com',
    avatarUrl: null,
  },
};

describe('ParticipantsService', () => {
  let service: ParticipantsService;
  let prisma: {
    meetingParticipant: Record<string, jest.Mock>;
    teamMember: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      meetingParticipant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      teamMember: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(ParticipantsService);
  });

  describe('invite', () => {
    it('el organizador invita participantes del equipo', async () => {
      prisma.teamMember.findMany.mockResolvedValue([
        { userId: 'usr_2' },
        { userId: 'usr_3' },
      ]);
      prisma.meetingParticipant.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
        Promise.all(ops),
      );
      prisma.meetingParticipant.create.mockImplementation(
        (args: { data: { meetingId: string; userId: string } }) => ({
          id: `prt_${args.data.userId}`,
          status: 'INVITED',
          attendance: null,
          createdAt: new Date(),
          user: {
            id: args.data.userId,
            name: 'X',
            email: 'x@correo.com',
            avatarUrl: null,
          },
        }),
      );

      const result = await service.invite(
        'usr_1',
        meetingRef,
        organizerMembership,
        ['usr_2', 'usr_3'],
      );

      expect(prisma.meetingParticipant.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('rechaza con 422 cuando un usuario no pertenece al equipo', async () => {
      prisma.teamMember.findMany.mockResolvedValue([{ userId: 'usr_2' }]);

      await expect(
        service.invite('usr_1', meetingRef, organizerMembership, [
          'usr_2',
          'usr_9',
        ]),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rechaza con 409 cuando un usuario ya es participante', async () => {
      prisma.teamMember.findMany.mockResolvedValue([{ userId: 'usr_2' }]);
      prisma.meetingParticipant.findMany.mockResolvedValue([
        { userId: 'usr_2' },
      ]);

      await expect(
        service.invite('usr_1', meetingRef, organizerMembership, ['usr_2']),
      ).rejects.toThrow(ConflictException);
    });

    it('un miembro sin rol administrativo no puede invitar', async () => {
      await expect(
        service.invite('usr_2', meetingRef, organizerMembership, ['usr_3']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('un ADMIN del equipo puede invitar aunque no sea el organizador', async () => {
      prisma.teamMember.findMany.mockResolvedValue([{ userId: 'usr_3' }]);
      prisma.meetingParticipant.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
        Promise.all(ops),
      );
      prisma.meetingParticipant.create.mockResolvedValue(participantRow);

      const result = await service.invite(
        'usr_9',
        meetingRef,
        adminMembership,
        ['usr_3'],
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('respond', () => {
    it('el participante actualiza su propio estado', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue(participantRow);
      prisma.meetingParticipant.update.mockResolvedValue({
        ...participantRow,
        status: 'ACCEPTED',
      });

      const result = await service.respond('usr_2', meetingRef, 'ACCEPTED');

      expect(result.status).toBe('ACCEPTED');
    });

    it('rechaza con 404 si no es participante', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.respond('usr_9', meetingRef, 'ACCEPTED'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordAttendance', () => {
    it('el organizador registra la asistencia', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue(participantRow);
      prisma.meetingParticipant.update.mockResolvedValue({
        ...participantRow,
        attendance: 'ATTENDED',
      });

      const result = await service.recordAttendance(
        'usr_1',
        meetingRef,
        organizerMembership,
        'usr_2',
        'ATTENDED',
      );

      expect(result.attendance).toBe('ATTENDED');
    });

    it('un miembro no puede registrar asistencia', async () => {
      await expect(
        service.recordAttendance(
          'usr_2',
          meetingRef,
          organizerMembership,
          'usr_3',
          'ATTENDED',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('el organizador elimina un participante', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue(participantRow);
      prisma.meetingParticipant.delete.mockResolvedValue(undefined);

      await service.remove('usr_1', meetingRef, organizerMembership, 'usr_2');

      expect(prisma.meetingParticipant.delete).toHaveBeenCalledWith({
        where: { id: 'prt_1' },
      });
    });

    it('rechaza eliminar al organizador', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue({
        ...participantRow,
        userId: 'usr_1',
      });

      await expect(
        service.remove('usr_1', meetingRef, organizerMembership, 'usr_1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
