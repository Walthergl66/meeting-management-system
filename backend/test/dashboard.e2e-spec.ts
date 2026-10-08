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

describe('Dashboard (e2e)', () => {
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
  });

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

  it('requiere autenticación', async () => {
    await request(app.getHttpServer()).get('/dashboard').expect(401);
  });

  it('devuelve el resumen con métricas y actividad', async () => {
    const owner = await registerAndToken('dash-owner');
    const member = await registerAndToken('dash-member');

    const team = await authed(owner.accessToken)
      .post('/teams')
      .send({ name: 'Equipo Dashboard' })
      .expect(201);
    const teamId = team.body.data.id as string;

    await authed(owner.accessToken)
      .post(`/teams/${teamId}/members`)
      .send({ email: member.email })
      .expect(201);

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Se agenda una hora en el futuro: cae en "hoy" o en "próximas" según la
    // hora de ejecución del test, por eso se valida la unión de ambos grupos.
    const start = new Date(now.getTime() + 60 * 60 * 1000);

    const meeting = await authed(owner.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunión agenda',
        teamId,
        startTime: start.toISOString(),
        endTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
        timezone: 'UTC',
      })
      .expect(201);
    const meetingId = meeting.body.data.id as string;

    await authed(owner.accessToken)
      .post(`/meetings/${meetingId}/participants`)
      .send({ userIds: [owner.userId, member.userId] })
      .expect(201);

    await authed(owner.accessToken)
      .post(`/meetings/${meetingId}/decisions`)
      .send({ title: 'Decisión reciente', content: 'Se acuerda avanzar.' })
      .expect(201);

    await authed(owner.accessToken)
      .post('/tasks')
      .send({
        title: 'Tarea del propietario',
        teamId,
        assigneeId: owner.userId,
        dueDate: new Date(
          todayStart.getTime() - 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .expect(201);

    const ownerDashboard = await authed(owner.accessToken)
      .get('/dashboard')
      .expect(200);

    const data = ownerDashboard.body.data;
    const scheduled = [...data.todayMeetings, ...data.upcomingMeetings];
    expect(
      data.metrics.todayMeetings + data.metrics.upcomingMeetings,
    ).toBeGreaterThanOrEqual(1);
    expect(scheduled.some((m: { id: string }) => m.id === meetingId)).toBe(
      true,
    );
    expect(scheduled[0].team.name).toBe('Equipo Dashboard');
    expect(data.pendingTasks).toHaveLength(1);
    expect(data.overdueTasks).toHaveLength(1);
    expect(data.recentDecisions[0].title).toBe('Decisión reciente');
    expect(data.recentActivity.length).toBeGreaterThan(0);
    expect(
      data.recentActivity.every(
        (entry: { occurredAt: string }) => entry.occurredAt,
      ),
    ).toBe(true);

    const memberDashboard = await authed(member.accessToken)
      .get('/dashboard')
      .expect(200);

    const memberData = memberDashboard.body.data;
    expect(
      [...memberData.todayMeetings, ...memberData.upcomingMeetings].some(
        (m: { id: string }) => m.id === meetingId,
      ),
    ).toBe(true);
    expect(memberData.recentDecisions[0].title).toBe('Decisión reciente');
    expect(memberData.pendingTasks).toHaveLength(0);
  });

  it('devuelve ceros para un usuario sin equipos', async () => {
    const lonely = await registerAndToken('dash-alone');

    const response = await authed(lonely.accessToken)
      .get('/dashboard')
      .expect(200);

    expect(response.body.data.metrics).toEqual({
      todayMeetings: 0,
      upcomingMeetings: 0,
      pendingTasks: 0,
      overdueTasks: 0,
    });
    expect(response.body.data.recentActivity).toEqual([]);
  });
});
