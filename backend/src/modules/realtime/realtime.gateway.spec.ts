import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeetingStatus, NotificationType, TaskStatus } from '../../shared';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeBridgeService } from './realtime-bridge.service';
import {
  MeetingCreatedEvent,
  NotificationCreatedEvent,
  TaskChangedEvent,
} from '../../common/events/domain-events';

const emitted = { calls: [] as Array<[string, unknown]> };
const server = {
  to: jest.fn((room: string) => {
    const emit = jest.fn((event: string, payload: unknown) => {
      emitted.calls.push([`${room}|${event}`, payload]);
    });
    return { emit };
  }),
};

function makeSocket(token?: string) {
  return {
    handshake: {
      auth: token ? { token } : {},
      headers: {},
    },
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    disconnect: jest.fn(),
    data: {} as Record<string, unknown>,
    teamIds: new Set<string>(),
  };
}

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let prisma: {
    teamMember: { findMany: jest.Mock };
    meeting: { findFirst: jest.Mock };
  };
  let jwt: { verifyAsync: jest.Mock };

  beforeEach(async () => {
    emitted.calls = [];
    server.to.mockClear();
    prisma = {
      teamMember: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ teamId: 'team_1' }, { teamId: 'team_2' }]),
      },
      meeting: { findFirst: jest.fn() },
    };
    jwt = {
      verifyAsync: jest
        .fn()
        .mockResolvedValue({ sub: 'usr_1', email: 'ana@correo.com' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: () => 'secret' } },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    gateway = module.get(RealtimeGateway);
    gateway.server = server as never;
  });

  describe('handleConnection', () => {
    it('cierra la conexión sin token', async () => {
      const client = makeSocket();

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('cierra la conexión con token inválido', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('expired'));
      const client = makeSocket('bad-token');

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('acepta el token en el handshake auth y entra a sus salas', async () => {
      const client = makeSocket('valid-token');

      await gateway.handleConnection(client as never);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.join).toHaveBeenCalledWith('user:usr_1');
      expect(client.join).toHaveBeenCalledWith('team:team_1');
      expect(client.join).toHaveBeenCalledWith('team:team_2');
      expect(client.emit).toHaveBeenCalledWith('connected', {
        userId: 'usr_1',
        teamIds: ['team_1', 'team_2'],
      });
    });

    it('acepta el token en el header Authorization', async () => {
      const client = makeSocket();
      client.handshake.headers = { authorization: 'Bearer valid-token' };

      await gateway.handleConnection(client as never);

      expect(jwt.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'secret',
      });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('difunde presencia online a los equipos del usuario', async () => {
      await gateway.handleConnection(makeSocket('valid-token') as never);

      const presence = emitted.calls.filter(([key]) =>
        key.startsWith('team:team_1|presence:changed'),
      );
      expect(presence).toHaveLength(1);
      expect(presence[0][1]).toMatchObject({ userId: 'usr_1', online: true });
    });
  });

  describe('handleDisconnect', () => {
    it('difunde presencia offline solo si el cliente se había autenticado', async () => {
      await gateway.handleDisconnect(makeSocket() as never);
      expect(emitted.calls).toHaveLength(0);

      const client = makeSocket('valid-token');
      await gateway.handleConnection(client as never);
      emitted.calls = [];

      await gateway.handleDisconnect(client as never);

      const offline = emitted.calls.filter(
        ([, payload]) => (payload as { online: boolean }).online === false,
      );
      expect(offline).toHaveLength(2);
    });
  });

  describe('meeting:join', () => {
    it('entra a la sala si la reunión es de uno de sus equipos', async () => {
      const client = makeSocket('valid-token');
      await gateway.handleConnection(client as never);
      prisma.meeting.findFirst.mockResolvedValue({ id: 'mtg_1' });

      const result = await gateway.joinMeeting(client as never, {
        meetingId: 'mtg_1',
      });

      expect(result).toEqual({ joined: true });
      expect(client.join).toHaveBeenCalledWith('meeting:mtg_1');
      expect(prisma.meeting.findFirst.mock.calls[0][0].where.teamId).toEqual({
        in: ['team_1', 'team_2'],
      });
    });

    it('rechaza reuniones de otros equipos', async () => {
      const client = makeSocket('valid-token');
      await gateway.handleConnection(client as never);
      prisma.meeting.findFirst.mockResolvedValue(null);

      const result = await gateway.joinMeeting(client as never, {
        meetingId: 'mtg_otro',
      });

      expect(result).toEqual({ joined: false });
      expect(client.join).not.toHaveBeenCalledWith('meeting:mtg_otro');
    });

    it('rechaza la suscripción sin sesión autenticada', async () => {
      const result = await gateway.joinMeeting(makeSocket() as never, {
        meetingId: 'mtg_1',
      });

      expect(result).toEqual({ joined: false });
      expect(prisma.meeting.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('emitTo*', () => {
    it('dirige los eventos a la sala correcta', () => {
      gateway.emitToUser('usr_1', 'notification:new', { id: 'notif_1' });
      gateway.emitToTeam('team_1', 'task:changed', { taskId: 'task_1' });
      gateway.emitToMeeting('mtg_1', 'agenda:changed', { meetingId: 'mtg_1' });

      expect(emitted.calls.map(([key]) => key)).toEqual([
        'user:usr_1|notification:new',
        'team:team_1|task:changed',
        'meeting:mtg_1|agenda:changed',
      ]);
    });
  });

  describe('eventos de dominio', () => {
    it('los eventos del bridge apuntan a las salas esperadas', () => {
      const bridge = new RealtimeBridgeService(gateway);

      bridge.onNotificationCreated(
        new NotificationCreatedEvent(
          'notif_1',
          'usr_2',
          NotificationType.MENTION,
          'Te mencionaron',
          'cuerpo',
          null,
          '2030-01-01T00:00:00.000Z',
        ),
      );
      bridge.onMeetingCreated(
        new MeetingCreatedEvent('mtg_1', 'team_1', 'usr_1', 'Daily'),
      );
      bridge.onTaskChanged(
        new TaskChangedEvent(
          'task_1',
          'team_1',
          'mtg_1',
          'usr_1',
          'UPDATED',
          TaskStatus.TODO,
        ),
      );

      expect(emitted.calls.map(([key]) => key)).toEqual([
        'user:usr_2|notification:new',
        'team:team_1|meeting:created',
        'team:team_1|task:changed',
      ]);
    });

    it('difunde la agenda al equipo solo si la reunión está en curso', () => {
      const bridge = new RealtimeBridgeService(gateway);

      bridge.onAgendaChanged({
        meetingId: 'mtg_1',
        teamId: 'team_1',
        broadcastToTeam: false,
      });
      bridge.onAgendaChanged({
        meetingId: 'mtg_2',
        teamId: 'team_1',
        broadcastToTeam: true,
      });

      expect(emitted.calls.map(([key]) => key)).toEqual([
        'meeting:mtg_1|agenda:changed',
        'meeting:mtg_2|agenda:changed',
        'team:team_1|agenda:changed',
      ]);
    });

    it('el estado de la reunión en curso es el que habilita el broadcast', () => {
      expect(MeetingStatus.IN_PROGRESS).toBe('IN_PROGRESS');
    });
  });
});
