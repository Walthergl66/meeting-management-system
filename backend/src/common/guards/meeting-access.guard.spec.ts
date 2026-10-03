import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { TeamAction, TeamRole } from '../../shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user';
import { MeetingAccessGuard } from './meeting-access.guard';

const user = { id: 'usr_1', email: 'ana@correo.com' } as AuthenticatedUser;

const meetingRow = {
  id: 'mtg_1',
  teamId: 'team_1',
  organizerId: 'usr_owner',
  status: 'SCHEDULED',
};

describe('MeetingAccessGuard', () => {
  let guard: MeetingAccessGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: {
    meeting: Record<string, jest.Mock>;
    meetingNote: Record<string, jest.Mock>;
    decision: Record<string, jest.Mock>;
    agendaItem: Record<string, jest.Mock>;
    teamMember: Record<string, jest.Mock>;
  };

  const contextWith = (
    action: TeamAction | undefined,
    request: {
      params?: Record<string, string>;
      body?: { teamId?: string };
    },
  ): ExecutionContext => {
    const full = {
      user,
      params: request.params ?? {},
      body: request.body ?? {},
    };

    return {
      switchToHttp: () => ({ getRequest: () => full }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = {
      meeting: { findUnique: jest.fn() },
      meetingNote: { findUnique: jest.fn() },
      decision: { findUnique: jest.fn() },
      agendaItem: { findUnique: jest.fn() },
      teamMember: { findUnique: jest.fn() },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingAccessGuard,
        { provide: Reflector, useValue: reflector },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = moduleFixture.get(MeetingAccessGuard);
  });

  it('deja pasar el listado sin ámbito: no hay acción ni teamId', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(
      guard.canActivate(contextWith(undefined, { params: {} })),
    ).resolves.toBe(true);
    expect(prisma.teamMember.findUnique).not.toHaveBeenCalled();
  });

  it('usa params.teamId cuando viene en la ruta', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.VIEW_MEETINGS);
    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.GUEST });

    await expect(
      guard.canActivate(
        contextWith(TeamAction.VIEW_MEETINGS, { params: { teamId: 'team_1' } }),
      ),
    ).resolves.toBe(true);
    expect(prisma.meeting.findUnique).not.toHaveBeenCalled();
  });

  it('resuelve el equipo desde params.id y deja la reunión en la petición', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.VIEW_MEETINGS);
    prisma.meeting.findUnique.mockResolvedValue(meetingRow);
    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.MEMBER });

    const context = contextWith(TeamAction.VIEW_MEETINGS, {
      params: { id: 'mtg_1' },
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);

    // Los controladores leen request.meeting para validar al organizador.
    expect(context.switchToHttp().getRequest().meeting).toEqual(meetingRow);
    expect(prisma.teamMember.findUnique).toHaveBeenCalledWith({
      where: { teamId_userId: { teamId: 'team_1', userId: 'usr_1' } },
      select: { role: true },
    });
  });

  it('lanza NotFound si params.id no corresponde a ninguna reunión', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.VIEW_MEETINGS);
    prisma.meeting.findUnique.mockResolvedValue(null);
    prisma.meetingNote.findUnique.mockResolvedValue(null);
    prisma.decision.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        contextWith(TeamAction.VIEW_MEETINGS, { params: { id: 'no_existe' } }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('cae en la nota cuando el id no es de reunión', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.VIEW_NOTES);
    prisma.meeting.findUnique.mockResolvedValue(null);
    prisma.meetingNote.findUnique.mockResolvedValue({ meeting: meetingRow });
    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.MEMBER });

    const context = contextWith(TeamAction.VIEW_NOTES, {
      params: { id: 'note_1' },
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest().meeting).toEqual(meetingRow);
  });

  it('cae en la decisión cuando tampoco hay nota', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.VIEW_NOTES);
    prisma.meeting.findUnique.mockResolvedValue(null);
    prisma.meetingNote.findUnique.mockResolvedValue(null);
    prisma.decision.findUnique.mockResolvedValue({ meeting: meetingRow });
    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.MEMBER });

    const context = contextWith(TeamAction.VIEW_NOTES, {
      params: { id: 'dec_1' },
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest().meeting).toEqual(meetingRow);
  });

  it('resuelve el equipo desde params.itemId (punto de agenda)', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.MANAGE_AGENDA);
    prisma.agendaItem.findUnique.mockResolvedValue({ meeting: meetingRow });
    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.OWNER });

    const context = contextWith(TeamAction.MANAGE_AGENDA, {
      params: { itemId: 'itm_1' },
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.agendaItem.findUnique).toHaveBeenCalled();
  });

  it('lanza NotFound si el punto de agenda no existe', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.MANAGE_AGENDA);
    prisma.agendaItem.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        contextWith(TeamAction.MANAGE_AGENDA, { params: { itemId: 'x' } }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('usa body.teamId en la creación de reuniones', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.CREATE_MEETING);
    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.MEMBER });

    await expect(
      guard.canActivate(
        contextWith(TeamAction.CREATE_MEETING, {
          body: { teamId: 'team_1' },
        }),
      ),
    ).resolves.toBe(true);
  });

  it('lanza Forbidden si no se pertenece al equipo resuelto', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.VIEW_MEETINGS);
    prisma.teamMember.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        contextWith(TeamAction.VIEW_MEETINGS, { params: { teamId: 'team_1' } }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lanza Forbidden si el rol no permite la acción', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.MANAGE_AGENDA);
    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.MEMBER });

    await expect(
      guard.canActivate(
        contextWith(TeamAction.MANAGE_AGENDA, { params: { teamId: 'team_1' } }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('anota la pertenencia aunque la acción no se llegue a comprobar', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.GUEST });

    const context = contextWith(undefined, { params: { teamId: 'team_1' } });
    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(context.switchToHttp().getRequest().teamMembership).toEqual({
      teamId: 'team_1',
      role: TeamRole.GUEST,
    });
  });
});
