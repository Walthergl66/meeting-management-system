import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';

interface SocketUser {
  userId: string;
  email: string;
}

type AuthedSocket = Socket & {
  data: { user?: SocketUser };
  teamIds: Set<string>;
};

/**
 * Gateway de tiempo real. Solo empuja actualizaciones: la mutacion siempre
 * ocurre por REST (ver FASE 11 del plan).
 *
 * Salas:
 * - `user:<userId>`  eventos personales (notificaciones).
 * - `team:<teamId>`  actividad de los equipos del usuario.
 * - `meeting:<id>`    detalle de una reunion.
 *
 * El origen del handshake lo inyecta main mediante un IoAdapter: el decorador
 * se evalua al importar este archivo, antes de que ConfigModule lea el .env,
 * asi que aqui no puede leerse la configuracion de CORS.
 */
@WebSocketGateway({ namespace: '/realtime' })
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    const token = this.extractToken(client);

    if (!token) {
      client.emit('error', { message: 'Token requerido' });
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const userId = payload.sub as string;
      const email = (payload.email as string) ?? '';

      client.data.user = { userId, email };
      client.teamIds = new Set<string>();

      await client.join(`user:${userId}`);

      const memberships = await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });

      for (const membership of memberships) {
        client.teamIds.add(membership.teamId);
        await client.join(`team:${membership.teamId}`);
      }

      await this.broadcastPresence(userId, true);
      client.emit('connected', { userId, teamIds: [...client.teamIds] });
    } catch {
      client.emit('error', { message: 'Token inválido o expirado' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthedSocket): Promise<void> {
    const user = client.data?.user;
    if (!user) return;

    await this.broadcastPresence(user.userId, false);
  }

  @SubscribeMessage('meeting:join')
  async joinMeeting(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { meetingId?: string },
  ): Promise<{ joined: boolean }> {
    const user = client.data?.user;
    if (!user || !body?.meetingId) {
      return { joined: false };
    }

    const meeting = await this.prisma.meeting.findFirst({
      where: { id: body.meetingId, teamId: { in: [...client.teamIds] } },
      select: { id: true },
    });

    if (!meeting) {
      return { joined: false };
    }

    await client.join(`meeting:${meeting.id}`);
    return { joined: true };
  }

  @SubscribeMessage('meeting:leave')
  async leaveMeeting(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { meetingId?: string },
  ): Promise<{ left: boolean }> {
    if (!body?.meetingId) return { left: false };
    await client.leave(`meeting:${body.meetingId}`);
    return { left: true };
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToTeam(teamId: string, event: string, payload: unknown): void {
    this.server?.to(`team:${teamId}`).emit(event, payload);
  }

  emitToMeeting(meetingId: string, event: string, payload: unknown): void {
    this.server?.to(`meeting:${meetingId}`).emit(event, payload);
  }

  private async broadcastPresence(
    userId: string,
    online: boolean,
  ): Promise<void> {
    try {
      const memberships = await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });

      for (const membership of memberships) {
        this.emitToTeam(membership.teamId, 'presence:changed', {
          userId,
          online,
          at: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo difundir presencia: ${(error as Error).message}`,
      );
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);

    return null;
  }
}
