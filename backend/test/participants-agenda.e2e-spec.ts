import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupSwagger } from '../src/swagger';
import { registerBody } from './register-request';

const uniqueEmail = (prefix: string) =>
  `${prefix}-${randomUUID()}@meetflow.test`;

describe('Participantes y agenda (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const registerAndToken = async (prefix: string) => {
    const email = uniqueEmail(prefix);
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerBody(email))
      .expect(201);
    return {
      email,
      userId: registration.body.data.user.id as string,
      accessToken: registration.body.data.tokens.accessToken as string,
    };
  };

  const authed = (token: string) => ({
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`),
    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set('Authorization', `Bearer ${token}`),
    delete: (url: string) =>
      request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${token}`),
  });

  const createTeam = async (token: string, name: string) => {
    const team = await authed(token).post('/teams').send({ name }).expect(201);
    return team.body.data.id as string;
  };

  const addMember = async (
    ownerToken: string,
    teamId: string,
    email: string,
  ) => {
    await authed(ownerToken)
      .post(`/teams/${teamId}/members`)
      .send({ email })
      .expect(201);
  };

  const createMeeting = async (token: string, teamId: string) => {
    const meeting = await authed(token)
      .post('/meetings')
      .send({
        title: 'Reunión con participantes',
        teamId,
        startTime: '2030-07-01T16:00:00',
        endTime: '2030-07-01T17:00:00',
        timezone: 'UTC',
      })
      .expect(201);
    return meeting.body.data.id as string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleFixture.createNestApplication());
    setupSwagger(app);
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('invitar participante que no existe en el equipo → 422', async () => {
    const owner = await registerAndToken('part-422-owner');
    const outsider = await registerAndToken('part-422-fuera');
    const teamId = await createTeam(owner.accessToken, 'Equipo 422');
    const meetingId = await createMeeting(owner.accessToken, teamId);

    await authed(owner.accessToken)
      .post(`/meetings/${meetingId}/participants`)
      .send({ userIds: [outsider.userId] })
      .expect(422);
  });

  it('reordenar agenda guarda el orden correcto', async () => {
    const owner = await registerAndToken('agenda-reorder');
    const teamId = await createTeam(owner.accessToken, 'Equipo Reorder');
    const meetingId = await createMeeting(owner.accessToken, teamId);

    const items: string[] = [];
    for (const title of ['Punto A', 'Punto B', 'Punto C']) {
      const item = await authed(owner.accessToken)
        .post(`/meetings/${meetingId}/agenda`)
        .send({ title })
        .expect(201);
      items.push(item.body.data.id);
    }

    const reordered = [items[2], items[0], items[1]];
    const response = await authed(owner.accessToken)
      .patch(`/meetings/${meetingId}/agenda/reorder`)
      .send({ order: reordered })
      .expect(200);

    expect(response.body.data.map((item: { id: string }) => item.id)).toEqual(
      reordered,
    );
    expect(
      response.body.data.map((item: { order: number }) => item.order),
    ).toEqual([1, 2, 3]);
  });

  it('un GUEST invitado puede aceptar su invitación', async () => {
    const owner = await registerAndToken('guest-owner');
    const guest = await registerAndToken('guest-miembro');
    const teamId = await createTeam(owner.accessToken, 'Equipo Guest');
    const meetingId = await createMeeting(owner.accessToken, teamId);

    await prisma.teamMember.create({
      data: { teamId, userId: guest.userId, role: 'GUEST' },
    });

    await authed(owner.accessToken)
      .post(`/meetings/${meetingId}/participants`)
      .send({ userIds: [guest.userId] })
      .expect(201);

    const accepted = await authed(guest.accessToken)
      .patch(`/meetings/${meetingId}/participants/me`)
      .send({ status: 'ACCEPTED' })
      .expect(200);

    expect(accepted.body.data.status).toBe('ACCEPTED');

    const declined = await authed(guest.accessToken)
      .patch(`/meetings/${meetingId}/participants/me`)
      .send({ status: 'DECLINED' })
      .expect(200);

    expect(declined.body.data.status).toBe('DECLINED');
  });

  it('un GUEST invitado no puede invitar a otros participantes → 403', async () => {
    const owner = await registerAndToken('guest-403-owner');
    const guest = await registerAndToken('guest-403-miembro');
    const other = await registerAndToken('guest-403-otro');
    const teamId = await createTeam(owner.accessToken, 'Equipo Guest 403');
    const meetingId = await createMeeting(owner.accessToken, teamId);

    await prisma.teamMember.create({
      data: { teamId, userId: guest.userId, role: 'GUEST' },
    });
    await addMember(owner.accessToken, teamId, other.email);

    await authed(owner.accessToken)
      .post(`/meetings/${meetingId}/participants`)
      .send({ userIds: [guest.userId] })
      .expect(201);

    await authed(guest.accessToken)
      .post(`/meetings/${meetingId}/participants`)
      .send({ userIds: [other.userId] })
      .expect(403);
  });

  it('el organizador registra asistencia y elimina participantes', async () => {
    const owner = await registerAndToken('att-owner');
    const member = await registerAndToken('att-miembro');
    const teamId = await createTeam(owner.accessToken, 'Equipo Asistencia');
    const meetingId = await createMeeting(owner.accessToken, teamId);
    await addMember(owner.accessToken, teamId, member.email);

    await authed(owner.accessToken)
      .post(`/meetings/${meetingId}/participants`)
      .send({ userIds: [member.userId] })
      .expect(201);

    const attended = await authed(owner.accessToken)
      .patch(`/meetings/${meetingId}/participants/${member.userId}/attendance`)
      .send({ attendance: 'ATTENDED' })
      .expect(200);

    expect(attended.body.data.attendance).toBe('ATTENDED');

    await authed(owner.accessToken)
      .delete(`/meetings/${meetingId}/participants/${member.userId}`)
      .expect(200);

    const list = await authed(owner.accessToken)
      .get(`/meetings/${meetingId}/participants`)
      .expect(200);
    expect(list.body.data).toHaveLength(0);
  });

  it('crea, edita y elimina puntos de agenda', async () => {
    const owner = await registerAndToken('agenda-crud');
    const teamId = await createTeam(owner.accessToken, 'Equipo CRUD');
    const meetingId = await createMeeting(owner.accessToken, teamId);

    const created = await authed(owner.accessToken)
      .post(`/meetings/${meetingId}/agenda`)
      .send({ title: 'Punto editable', durationMinutes: 15 })
      .expect(201);
    const itemId: string = created.body.data.id;

    const updated = await authed(owner.accessToken)
      .patch(`/agenda/${itemId}`)
      .send({ title: 'Punto editado', durationMinutes: 30 })
      .expect(200);
    expect(updated.body.data.title).toBe('Punto editado');
    expect(updated.body.data.durationMinutes).toBe(30);

    await authed(owner.accessToken).delete(`/agenda/${itemId}`).expect(200);

    const list = await authed(owner.accessToken)
      .get(`/meetings/${meetingId}/agenda`)
      .expect(200);
    expect(list.body.data).toHaveLength(0);
  });
});
