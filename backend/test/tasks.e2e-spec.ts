import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { setupSwagger } from '../src/swagger';

const uniqueEmail = (prefix: string) =>
  `${prefix}-${randomUUID()}@meetflow.test`;

describe('Tareas (e2e)', () => {
  let app: INestApplication;

  const registerAndToken = async (prefix: string) => {
    const email = uniqueEmail(prefix);
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, name: `Usuario ${prefix}`, password: 'Meetflow123!' })
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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('crear tarea sin reunión (tarea suelta) → válido', async () => {
    const owner = await registerAndToken('task-suelta');
    const teamId = await createTeam(owner.accessToken, 'Equipo Suelta');

    const task = await authed(owner.accessToken)
      .post('/tasks')
      .send({ title: 'Tarea suelta', teamId })
      .expect(201);

    expect(task.body.data.meeting).toBeNull();
    expect(task.body.data.status).toBe('TODO');
  });

  it('asignar tarea a usuario fuera del equipo → 422', async () => {
    const owner = await registerAndToken('task-422-owner');
    const outsider = await registerAndToken('task-422-fuera');
    const teamId = await createTeam(owner.accessToken, 'Equipo 422');

    await authed(owner.accessToken)
      .post('/tasks')
      .send({
        title: 'Tarea con responsable ajeno',
        teamId,
        assigneeId: outsider.userId,
      })
      .expect(422);
  });

  it('transición de estado inválida (DONE → BLOCKED) → 422', async () => {
    const owner = await registerAndToken('task-transicion');
    const teamId = await createTeam(owner.accessToken, 'Equipo Transición');

    const task = await authed(owner.accessToken)
      .post('/tasks')
      .send({ title: 'Tarea a completar', teamId })
      .expect(201);
    const taskId: string = task.body.data.id;

    await authed(owner.accessToken)
      .patch(`/tasks/${taskId}`)
      .send({ status: 'DONE' })
      .expect(200);

    await authed(owner.accessToken)
      .patch(`/tasks/${taskId}`)
      .send({ status: 'BLOCKED' })
      .expect(422);
  });

  it('tareas con dueDate en el pasado aparecen como vencidas', async () => {
    const owner = await registerAndToken('task-vencida');
    const teamId = await createTeam(owner.accessToken, 'Equipo Vencida');

    const task = await authed(owner.accessToken)
      .post('/tasks')
      .send({
        title: 'Tarea vencida',
        teamId,
        dueDate: '2020-01-01T00:00:00.000Z',
      })
      .expect(201);

    expect(task.body.data.isOverdue).toBe(true);
  });

  it('crea, edita y elimina tareas', async () => {
    const owner = await registerAndToken('task-crud');
    const teamId = await createTeam(owner.accessToken, 'Equipo CRUD Tareas');

    const task = await authed(owner.accessToken)
      .post('/tasks')
      .send({ title: 'Tarea original', teamId, priority: 'HIGH' })
      .expect(201);
    const taskId: string = task.body.data.id;

    const updated = await authed(owner.accessToken)
      .patch(`/tasks/${taskId}`)
      .send({ title: 'Tarea editada', status: 'IN_PROGRESS' })
      .expect(200);
    expect(updated.body.data.title).toBe('Tarea editada');
    expect(updated.body.data.status).toBe('IN_PROGRESS');

    await authed(owner.accessToken).delete(`/tasks/${taskId}`).expect(200);

    await authed(owner.accessToken).get(`/tasks/${taskId}`).expect(404);
  });

  it('lista tareas con filtros', async () => {
    const owner = await registerAndToken('task-filtros');
    const teamId = await createTeam(owner.accessToken, 'Equipo Filtros');

    await authed(owner.accessToken)
      .post('/tasks')
      .send({ title: 'Tarea A', teamId, priority: 'HIGH' })
      .expect(201);
    await authed(owner.accessToken)
      .post('/tasks')
      .send({ title: 'Tarea B', teamId, priority: 'LOW' })
      .expect(201);

    const highOnly = await authed(owner.accessToken)
      .get('/tasks')
      .query({ priority: 'HIGH' })
      .expect(200);
    expect(highOnly.body.data).toHaveLength(1);
    expect(highOnly.body.data[0].title).toBe('Tarea A');
  });

  it('rechaza prioridad o estado inválidos con 422', async () => {
    const owner = await registerAndToken('task-enums');
    const teamId = await createTeam(owner.accessToken, 'Equipo Enums');

    await authed(owner.accessToken)
      .post('/tasks')
      .send({ title: 'Tarea mala', teamId, priority: 'BANANA' })
      .expect(422);

    const created = await authed(owner.accessToken)
      .post('/tasks')
      .send({ title: 'Tarea buena', teamId })
      .expect(201);

    await authed(owner.accessToken)
      .patch(`/tasks/${created.body.data.id}`)
      .send({ status: 'NO_EXISTE' })
      .expect(422);
  });

  it('permite que un ADMIN edite una tarea creada por otro', async () => {
    const owner = await registerAndToken('task-perm-owner');
    const member = await registerAndToken('task-perm-member');
    const teamId = await createTeam(owner.accessToken, 'Equipo Permisos');

    const invited = await authed(owner.accessToken)
      .post(`/teams/${teamId}/members`)
      .send({ email: member.email })
      .expect(201);
    const memberId = invited.body.data.id as string;

    const created = await authed(owner.accessToken)
      .post('/tasks')
      .send({ title: 'Tarea del owner', teamId })
      .expect(201);
    const taskId = created.body.data.id as string;

    await authed(member.accessToken)
      .patch(`/tasks/${taskId}`)
      .send({ title: 'Intento de member' })
      .expect(403);

    await authed(owner.accessToken)
      .patch(`/teams/${teamId}/members/${memberId}`)
      .send({ role: 'ADMIN' })
      .expect(200);

    const byAdmin = await authed(member.accessToken)
      .patch(`/tasks/${taskId}`)
      .send({ title: 'Editada por admin' })
      .expect(200);
    expect(byAdmin.body.data.title).toBe('Editada por admin');

    await authed(member.accessToken).delete(`/tasks/${taskId}`).expect(200);
  });
});
