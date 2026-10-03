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
import { TeamRoleGuard } from './team-role.guard';

const user: AuthenticatedUser = {
  id: 'usr_1',
  email: 'ana@correo.com',
  role: null,
} as unknown as AuthenticatedUser;

describe('TeamRoleGuard', () => {
  let guard: TeamRoleGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { teamMember: Record<string, jest.Mock> };

  const contextWith = (
    action: TeamAction | undefined,
    teamId: string | undefined,
  ): ExecutionContext => {
    const request = {
      user,
      params: teamId === undefined ? {} : { teamId },
    };

    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = { teamMember: { findUnique: jest.fn() } };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        TeamRoleGuard,
        { provide: Reflector, useValue: reflector },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = moduleFixture.get(TeamRoleGuard);
  });

  it('deja pasar cuando la ruta no declara ninguna acción', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(
      guard.canActivate(contextWith(undefined, 'team_1')),
    ).resolves.toBe(true);
    expect(prisma.teamMember.findUnique).not.toHaveBeenCalled();
  });

  it('lanza NotFound si la ruta no trae teamId', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.INVITE_MEMBERS);

    await expect(
      guard.canActivate(contextWith(TeamAction.INVITE_MEMBERS, undefined)),
    ).rejects.toThrow(NotFoundException);
  });

  it('lanza Forbidden si el usuario no pertenece al equipo', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.INVITE_MEMBERS);
    prisma.teamMember.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextWith(TeamAction.INVITE_MEMBERS, 'team_1')),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lanza Forbidden si el rol no permite la acción', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.INVITE_MEMBERS);
    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.MEMBER });

    await expect(
      guard.canActivate(contextWith(TeamAction.INVITE_MEMBERS, 'team_1')),
    ).rejects.toThrow(/no permite/);
  });

  it('deja pasar y anota la pertenencia si el rol lo permite', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.INVITE_MEMBERS);
    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.ADMIN });

    const context = contextWith(TeamAction.INVITE_MEMBERS, 'team_1');
    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(prisma.teamMember.findUnique).toHaveBeenCalledWith({
      where: { teamId_userId: { teamId: 'team_1', userId: 'usr_1' } },
      select: { role: true },
    });

    // El controlador lee la pertenencia de aquí para las reglas de negocio.
    const request = context.switchToHttp().getRequest();
    expect(request.teamMembership).toEqual({
      teamId: 'team_1',
      role: TeamRole.ADMIN,
    });
  });

  it('TRANSFER_OWNERSHIP queda reservada a quien es dueño', async () => {
    reflector.getAllAndOverride.mockReturnValue(TeamAction.TRANSFER_OWNERSHIP);
    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.ADMIN });

    await expect(
      guard.canActivate(contextWith(TeamAction.TRANSFER_OWNERSHIP, 'team_1')),
    ).rejects.toThrow(ForbiddenException);

    prisma.teamMember.findUnique.mockResolvedValue({ role: TeamRole.OWNER });
    await expect(
      guard.canActivate(contextWith(TeamAction.TRANSFER_OWNERSHIP, 'team_1')),
    ).resolves.toBe(true);
  });
});
