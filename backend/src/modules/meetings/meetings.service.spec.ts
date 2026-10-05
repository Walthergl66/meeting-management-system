import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TeamRole } from '../../shared';
import { PrismaService } from '../../prisma/prisma.service';
import { MeetingsService } from './meetings.service';

const memberMembership = { teamId: 'team_1', role: TeamRole.MEMBER };
const adminMembership = { teamId: 'team_1', role: TeamRole.ADMIN };

const meetingRow = {
  id: 'mtg_1',
  title: 'Sincronizacion semanal',
  description: null,
  teamId: 'team_1',
  organizerId: 'usr_1',
  status: 'DRAFT',
  startTime: new Date('2026-10-05T16:00:00.000Z'),
  endTime: new Date('2026-10-05T16:30:00.000Z'),
  timezone: 'America/Mexico_City',
  location: null,
  meetingUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  team: { id: 'team_1', name: 'Producto Cero' },
  organizer: { id: 'usr_1', name: 'Organizador', email: 'org@correo.com' },
};

describe('MeetingsService', () => {
  let service: MeetingsService;
  let prisma: {
    meeting: Record<string, jest.Mock>;
    teamMember: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      meeting: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      teamMember: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: EventEmitter2,
          useValue: { emitAsync: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get(MeetingsService);
  });

  describe('create', () => {
    it('crea la reunion como DRAFT en UTC con la hora local normalizada', async () => {
      const dto = {
        title: 'Sincronizacion semanal',
        teamId: 'team_1',
        startTime: '2026-10-05T10:00:00',
        endTime: '2026-10-05T10:30:00',
        timezone: 'America/Mexico_City',
      };

      prisma.meeting.create.mockResolvedValue(meetingRow);

      const result = await service.create('usr_1', 'UTC', dto);

      expect(prisma.meeting.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DRAFT',
            organizerId: 'usr_1',
            startTime: new Date('2026-10-05T16:00:00.000Z'),
            endTime: new Date('2026-10-05T16:30:00.000Z'),
          }),
        }),
      );
      expect(result.id).toBe('mtg_1');
    });

    it('rechaza endTime anterior o igual a startTime con 400', async () => {
      const dto = {
        title: 'Reunion invalida',
        teamId: 'team_1',
        startTime: '2030-10-05T16:00:00',
        endTime: '2030-10-05T16:00:00',
        timezone: 'UTC',
      };

      await expect(service.create('usr_1', 'UTC', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.meeting.create).not.toHaveBeenCalled();
    });

    it('rechaza una reunion que comienza en el pasado con 400', async () => {
      const dto = {
        title: 'Reunion pasada',
        teamId: 'team_1',
        startTime: '2020-01-01T10:00:00',
        endTime: '2020-01-01T11:00:00',
        timezone: 'UTC',
      };

      await expect(service.create('usr_1', 'UTC', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getForUser', () => {
    it('lanza 404 si la reunion no existe', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      await expect(
        service.getForUser('usr_1', {
          id: 'mtg_x',
          teamId: 'team_1',
          organizerId: 'usr_9',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza 403 si el usuario no pertenece al equipo de la reunion', async () => {
      prisma.meeting.findUnique.mockResolvedValue(meetingRow);
      prisma.teamMember.findUnique.mockResolvedValue(null);

      await expect(
        service.getForUser('usr_foraneo', {
          id: 'mtg_1',
          teamId: 'team_1',
          organizerId: 'usr_1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.meeting.findUnique.mockResolvedValue(meetingRow);
    });

    it('rechaza la transicion de COMPLETED a CANCELLED con 409', async () => {
      prisma.meeting.findUnique.mockResolvedValue({
        ...meetingRow,
        status: 'COMPLETED',
      });

      await expect(
        service.update(
          'usr_1',
          { id: 'mtg_1', teamId: 'team_1', organizerId: 'usr_1' },
          memberMembership,
          { status: 'CANCELLED' },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('permite que el organizador agende una reunion DRAFT', async () => {
      prisma.meeting.update.mockResolvedValue({
        ...meetingRow,
        status: 'SCHEDULED',
      });

      await service.update(
        'usr_1',
        { id: 'mtg_1', teamId: 'team_1', organizerId: 'usr_1' },
        memberMembership,
        { status: 'SCHEDULED' },
      );

      expect(prisma.meeting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SCHEDULED' }),
        }),
      );
    });

    it('impide que un miembro edite una reunion ajena con 403', async () => {
      await expect(
        service.update(
          'usr_member',
          { id: 'mtg_1', teamId: 'team_1', organizerId: 'usr_1' },
          memberMembership,
          { title: 'Cambio ajeno' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite que un ADMIN cancele una reunion ajena', async () => {
      prisma.meeting.findFirst.mockResolvedValue(null);
      prisma.meeting.update.mockResolvedValue({
        ...meetingRow,
        status: 'CANCELLED',
      });

      await service.update(
        'usr_admin',
        { id: 'mtg_1', teamId: 'team_1', organizerId: 'usr_1' },
        adminMembership,
        { status: 'CANCELLED' },
      );

      expect(prisma.meeting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('detecta conflicto de horario del organizador con 409', async () => {
      prisma.meeting.findFirst.mockResolvedValue({
        id: 'mtg_otra',
        title: 'Otra reunion',
      });

      await expect(
        service.update(
          'usr_1',
          { id: 'mtg_1', teamId: 'team_1', organizerId: 'usr_1' },
          memberMembership,
          { status: 'SCHEDULED' },
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('impide que un miembro borre una reunion ajena con 403', async () => {
      prisma.meeting.findUnique.mockResolvedValue(meetingRow);

      await expect(
        service.delete(
          'usr_member',
          { id: 'mtg_1', teamId: 'team_1', organizerId: 'usr_1' },
          memberMembership,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite que el organizador borre su reunion', async () => {
      prisma.meeting.findUnique.mockResolvedValue(meetingRow);
      prisma.meeting.delete.mockResolvedValue(meetingRow);

      await service.delete(
        'usr_1',
        { id: 'mtg_1', teamId: 'team_1', organizerId: 'usr_1' },
        memberMembership,
      );

      expect(prisma.meeting.delete).toHaveBeenCalledWith({
        where: { id: 'mtg_1' },
      });
    });
  });
});
