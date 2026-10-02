import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { setupSwagger } from '../src/swagger';

const uniqueEmail = (prefix: string) =>
  `${prefix}-${randomUUID()}@meetflow.test`;

// Palabra rara: si el indice no estuviera poblado en espanol, la busqueda falla.
const RARE = 'trazabilidad';

describe('Auditoria y busqueda (e2e)', () => {
  let app: INestApplication;

  const register = async (prefix: string) => {
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
  });

  const createTeam = async (token: string, name: string) => {
    const response = await authed(token)
      .post('/teams')
      .send({ name })
      .expect(201);
    return response.body.data.id as string;
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

  describe('GET /audit', () => {
    it('requiere autenticación', async () => {
      await request(app.getHttpServer()).get('/audit').expect(401);
    });

    it('registra el login, la creación de reunión y la tarea completada', async () => {
      const user = await register('audit-user');
      const token = user.accessToken;

      // El login emite user.authenticated.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'Meetflow123!' })
        .expect(200);

      const teamId = await createTeam(token, 'Equipo auditoría');

      const meeting = await authed(token)
        .post('/meetings')
        .send({
          title: `Plan de ${RARE}`,
          description: `Revisamos la ${RARE} del sistema`,
          teamId,
          startTime: new Date(Date.now() + 86_400_000).toISOString(),
          endTime: new Date(Date.now() + 90_000_000).toISOString(),
        })
        .expect(201);

      const meetingId = meeting.body.data.id as string;

      const task = await authed(token)
        .post('/tasks')
        .send({
          title: `Tarea de ${RARE}`,
          description: `Detalle sobre ${RARE}`,
          teamId,
        })
        .expect(201);

      await authed(token)
        .patch(`/tasks/${task.body.data.id}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      await authed(token)
        .patch(`/tasks/${task.body.data.id}`)
        .send({ status: 'DONE' })
        .expect(200);

      const audit = await authed(token).get('/audit?limit=200').expect(200);
      const actions = audit.body.data.items.map(
        (item: { action: string }) => item.action,
      );

      expect(actions).toContain('USER_LOGIN');
      expect(actions).toContain('MEETING_CREATED');
      expect(actions).toContain('TASK_CREATED');
      expect(actions).toContain('TASK_COMPLETED');

      const meetingLog = audit.body.data.items.find(
        (item: { entityId: string }) => item.entityId === meetingId,
      );
      expect(meetingLog).toMatchObject({
        userId: user.userId,
        entity: 'MEETING',
        action: 'MEETING_CREATED',
      });
      expect(meetingLog.user.email).toBe(user.email);
    });

    it('filtra por acción y no expone equipos ajenos', async () => {
      const owner = await register('audit-owner');
      const intruder = await register('audit-intruder');

      await authed(owner.accessToken)
        .post('/auth/login')
        .send({ email: owner.email, password: 'Meetflow123!' })
        .expect(200);

      const filtered = await authed(intruder.accessToken)
        .get('/audit?action=USER_LOGIN&limit=200')
        .expect(200);

      const logins = filtered.body.data.items.filter(
        (item: { entityId: string }) => item.entityId === owner.userId,
      );
      expect(logins).toHaveLength(0);
    });

    it('rechaza una acción inválida con 422', async () => {
      const user = await register('audit-invalid');
      await authed(user.accessToken).get('/audit?action=NO_EXISTE').expect(422);
    });
  });

  describe('GET /search', () => {
    it('requiere autenticación', async () => {
      await request(app.getHttpServer()).get(`/search?q=${RARE}`).expect(401);
    });

    it('devuelve 422 con una consulta demasiado corta', async () => {
      const user = await register('search-short');
      await authed(user.accessToken).get('/search?q=a').expect(422);
    });

    it('encuentra reuniones y tareas por full-text en español', async () => {
      const user = await register('search-user');
      const token = user.accessToken;
      const teamId = await createTeam(token, 'Equipo búsqueda');

      const meeting = await authed(token)
        .post('/meetings')
        .send({
          title: `Comité de ${RARE}`,
          description: 'Punto único de la sesión',
          teamId,
          startTime: new Date(Date.now() + 86_400_000).toISOString(),
          endTime: new Date(Date.now() + 90_000_000).toISOString(),
        })
        .expect(201);

      await authed(token)
        .post('/tasks')
        .send({ title: `Informe de ${RARE}`, teamId })
        .expect(201);

      const response = await authed(token)
        .get(`/search?q=${RARE}&limit=50`)
        .expect(200);

      const ids = {
        meetings: response.body.data.groups.meetings.map(
          (item: { id: string }) => item.id,
        ),
        tasks: response.body.data.groups.tasks.map(
          (item: { id: string }) => item.id,
        ),
      };

      expect(ids.meetings).toContain(meeting.body.data.id);
      expect(ids.tasks.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.total).toBe(
        response.body.data.groups.meetings.length +
          response.body.data.groups.tasks.length +
          (response.body.data.groups.decisions?.length ?? 0) +
          (response.body.data.groups.notes?.length ?? 0) +
          (response.body.data.groups.users?.length ?? 0),
      );
    });

    it('aplica el stemming español (busca el plural y encuentra el singular)', async () => {
      const user = await register('search-stem');
      const token = user.accessToken;
      const teamId = await createTeam(token, 'Equipo stemming');

      await authed(token)
        .post('/meetings')
        .send({
          title: 'Revisión de decisiones',
          description: 'Documento de trazabilidad',
          teamId,
          startTime: new Date(Date.now() + 86_400_000).toISOString(),
          endTime: new Date(Date.now() + 90_000_000).toISOString(),
        })
        .expect(201);

      // "trazabilidades" se reduce a la misma raiz que "trazabilidad".
      const plural = await authed(token)
        .get('/search?q=trazabilidades&type=meetings')
        .expect(200);

      expect(plural.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('filtra por tipo, prioridad y estado', async () => {
      const user = await register('search-filters');
      const token = user.accessToken;
      const teamId = await createTeam(token, 'Equipo filtros');

      const high = await authed(token)
        .post('/tasks')
        .send({ title: `Urgente de ${RARE}`, teamId, priority: 'HIGH' })
        .expect(201);

      await authed(token)
        .post('/tasks')
        .send({ title: `Baja de ${RARE}`, teamId, priority: 'LOW' })
        .expect(201);

      const byPriority = await authed(token)
        .get(`/search?q=${RARE}&type=tasks&priority=HIGH`)
        .expect(200);

      expect(byPriority.body.data.groups.tasks).toHaveLength(1);
      expect(byPriority.body.data.groups.tasks[0].id).toBe(high.body.data.id);

      const byStatus = await authed(token)
        .get(`/search?q=${RARE}&type=tasks&status=TODO`)
        .expect(200);
      expect(byStatus.body.data.total).toBe(2);

      const byStatusAndPriority = await authed(token)
        .get(`/search?q=${RARE}&type=tasks&status=TODO&priority=LOW`)
        .expect(200);
      expect(byStatusAndPriority.body.data.total).toBe(1);
    });

    it('no encuentra nada si el término no aparece', async () => {
      const user = await register('search-empty');
      await authed(user.accessToken)
        .get('/search?q=palabradequeexistemediamil')
        .expect(200)
        .expect((response) => {
          expect(response.body.data.total).toBe(0);
        });
    });

    it('acota la búsqueda a los equipos del usuario', async () => {
      const owner = await register('search-owner');
      const intruder = await register('search-intruder');

      const teamId = await createTeam(owner.accessToken, 'Equipo privado');
      await authed(owner.accessToken)
        .post('/meetings')
        .send({
          title: `Secreto de ${RARE}`,
          teamId,
          startTime: new Date(Date.now() + 86_400_000).toISOString(),
          endTime: new Date(Date.now() + 90_000_000).toISOString(),
        })
        .expect(201);

      const response = await authed(intruder.accessToken)
        .get(`/search?q=${RARE}&type=meetings&limit=100`)
        .expect(200);

      expect(response.body.data.total).toBe(0);
    });
  });
});
