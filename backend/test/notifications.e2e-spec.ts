import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { setupSwagger } from '../src/swagger';
import { registerBody } from './register-request';

const uniqueEmail = (prefix: string) =>
  `${prefix}-${randomUUID()}@meetflow.test`;

describe('Notificaciones (e2e)', () => {
  let app: INestApplication;

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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleFixture.createNestApplication());
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('crear una reunión notifica a los miembros del equipo', async () => {
    const owner = await registerAndToken('notif-meeting-owner');
    const member = await registerAndToken('notif-meeting-member');
    const teamId = await createTeam(owner.accessToken, 'Equipo Notif Meeting');
    await addMember(owner.accessToken, teamId, member.email);

    await authed(owner.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunión con notificación',
        teamId,
        startTime: '2030-09-01T16:00:00',
        endTime: '2030-09-01T17:00:00',
        timezone: 'UTC',
      })
      .expect(201);

    const notifications = await authed(member.accessToken)
      .get('/notifications')
      .expect(200);

    expect(notifications.body.data).toHaveLength(1);
    expect(notifications.body.data[0].type).toBe('MEETING_INVITATION');
  });

  it('no notifica al organizador de su propia reunión', async () => {
    const owner = await registerAndToken('notif-self-owner');
    const teamId = await createTeam(owner.accessToken, 'Equipo Notif Self');

    await authed(owner.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunión sin auto-notificación',
        teamId,
        startTime: '2030-09-02T16:00:00',
        endTime: '2030-09-02T17:00:00',
        timezone: 'UTC',
      })
      .expect(201);

    const notifications = await authed(owner.accessToken)
      .get('/notifications')
      .expect(200);

    expect(notifications.body.data).toHaveLength(0);
  });

  it('asignar una tarea notifica al responsable', async () => {
    const owner = await registerAndToken('notif-task-owner');
    const assignee = await registerAndToken('notif-task-assignee');
    const teamId = await createTeam(owner.accessToken, 'Equipo Notif Task');
    await addMember(owner.accessToken, teamId, assignee.email);

    await authed(owner.accessToken)
      .post('/tasks')
      .send({
        title: 'Tarea asignada',
        teamId,
        assigneeId: assignee.userId,
      })
      .expect(201);

    const notifications = await authed(assignee.accessToken)
      .get('/notifications')
      .expect(200);

    expect(notifications.body.data).toHaveLength(1);
    expect(notifications.body.data[0].type).toBe('TASK_ASSIGNED');
  });

  it('no permite a un usuario marcar como leída la notificación de otro', async () => {
    const owner = await registerAndToken('notif-cross-owner');
    const other = await registerAndToken('notif-cross-other');
    const teamId = await createTeam(owner.accessToken, 'Equipo Notif Cross');
    await addMember(owner.accessToken, teamId, other.email);

    await authed(owner.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunión con notificación ajena',
        teamId,
        startTime: '2030-11-01T16:00:00',
        endTime: '2030-11-01T17:00:00',
        timezone: 'UTC',
      })
      .expect(201);

    const inbox = await authed(other.accessToken)
      .get('/notifications')
      .expect(200);
    const notificationId = inbox.body.data[0].id as string;

    await authed(owner.accessToken)
      .patch(`/notifications/${notificationId}/read`)
      .expect(404);

    const stillUnread = await authed(other.accessToken)
      .get('/notifications')
      .query({ read: 'false' })
      .expect(200);

    expect(stillUnread.body.data).toHaveLength(1);
  });

  it('marcar notificaciones como leídas', async () => {
    const owner = await registerAndToken('notif-read-owner');
    const member = await registerAndToken('notif-read-member');
    const teamId = await createTeam(owner.accessToken, 'Equipo Notif Read');
    await addMember(owner.accessToken, teamId, member.email);

    await authed(owner.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunión para leer',
        teamId,
        startTime: '2030-10-01T16:00:00',
        endTime: '2030-10-01T17:00:00',
        timezone: 'UTC',
      })
      .expect(201);

    await authed(member.accessToken)
      .patch('/notifications/read-all')
      .expect(200);

    const notifications = await authed(member.accessToken)
      .get('/notifications')
      .query({ read: 'true' })
      .expect(200);

    expect(notifications.body.data.length).toBeGreaterThan(0);
    expect(
      notifications.body.data.every((n: { read: boolean }) => n.read),
    ).toBe(true);
  });
});
