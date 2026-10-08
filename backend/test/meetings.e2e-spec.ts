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

describe('Meetings (e2e)', () => {
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
    await app.close();
  });

  it('crea una reunion con datos validos y la normaliza a UTC', async () => {
    const owner = await registerAndToken('reunion-owner');
    const teamId = await createTeam(owner.accessToken, 'Equipo Reuniones');

    const created = await authed(owner.accessToken)
      .post('/meetings')
      .send({
        title: 'Sincronizacion semanal',
        teamId,
        startTime: '2030-01-10T10:00:00',
        endTime: '2030-01-10T10:30:00',
        timezone: 'America/Mexico_City',
      })
      .expect(201);

    expect(created.body.data.status).toBe('DRAFT');
    expect(created.body.data.startTime).toBe('2030-01-10T16:00:00.000Z');
    expect(created.body.data.endTime).toBe('2030-01-10T16:30:00.000Z');
    expect(created.body.data.team.id).toBe(teamId);
  });

  it('rechaza una reunion con endTime <= startTime con 400', async () => {
    const owner = await registerAndToken('reunion-rango');
    const teamId = await createTeam(owner.accessToken, 'Equipo Rango');

    await authed(owner.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunion invalida',
        teamId,
        startTime: '2030-01-10T16:00:00',
        endTime: '2030-01-10T16:00:00',
        timezone: 'UTC',
      })
      .expect(400);
  });

  it('rechaza crear reuniones en un equipo al que no pertenece con 403', async () => {
    const outsider = await registerAndToken('reunion-fuera');
    const owner = await registerAndToken('reunion-equipo');
    const teamId = await createTeam(owner.accessToken, 'Equipo Cerrado');

    await authed(outsider.accessToken)
      .post('/meetings')
      .send({
        title: 'Intento de intromision',
        teamId,
        startTime: '2030-01-10T16:00:00',
        endTime: '2030-01-10T17:00:00',
        timezone: 'UTC',
      })
      .expect(403);
  });

  it('impide editar una reunion ajena sin permisos con 403', async () => {
    const organizer = await registerAndToken('reunion-organizador');
    const teamId = await createTeam(
      organizer.accessToken,
      'Equipo Organizador',
    );

    const created = await authed(organizer.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunion con agenda',
        teamId,
        startTime: '2030-02-01T16:00:00',
        endTime: '2030-02-01T17:00:00',
        timezone: 'UTC',
      })
      .expect(201);
    const meetingId: string = created.body.data.id;

    const intruder = await registerAndToken('reunion-intruso');
    await authed(organizer.accessToken)
      .post(`/teams/${teamId}/members`)
      .send({ email: intruder.email })
      .expect(201);

    await authed(intruder.accessToken)
      .patch(`/meetings/${meetingId}`)
      .send({ title: 'Secuestro de reunion' })
      .expect(403);
  });

  it('cancela una reunion completada con 409', async () => {
    const organizer = await registerAndToken('reunion-completada');
    const teamId = await createTeam(organizer.accessToken, 'Equipo Completado');

    const created = await authed(organizer.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunion pasada por agua',
        teamId,
        startTime: '2030-03-01T16:00:00',
        endTime: '2030-03-01T17:00:00',
        timezone: 'UTC',
      })
      .expect(201);
    const meetingId: string = created.body.data.id;

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'COMPLETED' },
    });

    await authed(organizer.accessToken)
      .patch(`/meetings/${meetingId}`)
      .send({ status: 'CANCELLED' })
      .expect(409);
  });

  it('el organizador agenda su reunion DRAFT', async () => {
    const organizer = await registerAndToken('reunion-agenda');
    const teamId = await createTeam(organizer.accessToken, 'Equipo Agenda');

    const created = await authed(organizer.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunion de agenda',
        teamId,
        startTime: '2030-04-01T16:00:00',
        endTime: '2030-04-01T17:00:00',
        timezone: 'UTC',
      })
      .expect(201);
    const meetingId: string = created.body.data.id;

    const updated = await authed(organizer.accessToken)
      .patch(`/meetings/${meetingId}`)
      .send({ status: 'SCHEDULED' })
      .expect(200);

    expect(updated.body.data.status).toBe('SCHEDULED');
  });

  it('lista y elimina reuniones', async () => {
    const organizer = await registerAndToken('reunion-lista');
    const teamId = await createTeam(organizer.accessToken, 'Equipo Lista');

    await authed(organizer.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunion listable',
        teamId,
        startTime: '2030-05-01T16:00:00',
        endTime: '2030-05-01T17:00:00',
        timezone: 'UTC',
      })
      .expect(201);
    const created2 = await authed(organizer.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunion a borrar',
        teamId,
        startTime: '2030-06-01T16:00:00',
        endTime: '2030-06-01T17:00:00',
        timezone: 'UTC',
      })
      .expect(201);
    const meetingId: string = created2.body.data.id;

    const list = await authed(organizer.accessToken)
      .get('/meetings')
      .expect(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(2);

    await authed(organizer.accessToken)
      .delete(`/meetings/${meetingId}`)
      .expect(200);
  });
});
