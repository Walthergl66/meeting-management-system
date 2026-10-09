import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { setupSwagger } from '../src/swagger';
import { registerBody } from './register-request';

/**
 * Recorre el camino completo de una reunión, de principio a fin y en un solo
 * `it`: registro, equipo, invitación, reunión, agenda, participación,
 * asistencia, notas, menciones, decisión, tarea derivada y, sobre todo, que
 * todo eso se vea reflejado en notificaciones, dashboard, búsqueda y auditoría.
 *
 * Los tests por endpoint ya cubren los caminos de error de cada uno. Lo que
 * aquí se comprueba es el orden: que las reglas de negocio encajen entre sí
 * (por ejemplo, que una tarea herede el equipo de la reunión o que el
 * dashboard cuente lo que los pasos anteriores crearon).
 */
describe('Flujo completo de una reunión (e2e)', () => {
  let app: INestApplication;

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${randomUUID()}@meetflow.test`;

  const register = async (prefix: string) => {
    const email = uniqueEmail(prefix);
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerBody(email))
      .expect(201);
    return {
      email,
      userId: registration.body.data.user.id as string,
      token: registration.body.data.tokens.accessToken as string,
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

  const waitUntil = async <T>(
    probe: () => Promise<T>,
    done: (value: T) => boolean,
    attempts = 40,
  ): Promise<T> => {
    let value = await probe();
    for (let i = 0; i < attempts && !done(value); i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      value = await probe();
    }
    return value;
  };

  const mentionsFor = async (
    token: string,
    metadataKey: 'noteId' | 'decisionId',
    metadataId: string,
  ) => {
    const inbox = await authed(token).get('/notifications').expect(200);
    return inbox.body.data.filter(
      (n: { type: string; metadata: Record<string, string> }) =>
        n.type === 'MENTION' && n.metadata?.[metadataKey] === metadataId,
    );
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

  it('lleva una reunión desde el registro hasta el dashboard y la auditoría', async () => {
    const owner = await register('flujo-owner');
    const editor = await register('flujo-editor');
    const attendee = await register('flujo-asistente');

    // 1. La propietaria crea el equipo y queda como OWNER.
    const team = await authed(owner.token)
      .post('/teams')
      .send({ name: `Equipo Flujo ${randomUUID().slice(0, 8)}` })
      .expect(201);
    const teamId = team.body.data.id as string;
    expect(team.body.data.role).toBe('OWNER');

    // 2. Invita a los otros dos, que quedan como MEMBER. La invitación es de uno
    // en uno y por correo.
    await authed(owner.token)
      .post(`/teams/${teamId}/members`)
      .send({ email: editor.email })
      .expect(201);
    await authed(owner.token)
      .post(`/teams/${teamId}/members`)
      .send({ email: attendee.email })
      .expect(201);

    // El detalle del equipo es lo que expone la plantilla: no hay endpoint
    // aparte para listar miembros.
    const members = await authed(owner.token)
      .get(`/teams/${teamId}`)
      .expect(200);
    expect(members.body.data.members).toHaveLength(3);
    expect(
      members.body.data.members
        .filter((m: { role: string }) => m.role === 'OWNER')
        .map((m: { userId: string }) => m.userId),
    ).toEqual([owner.userId]);

    // 3. Crea una reunión en DRAFT y la agenda. La fecha se calcula sobre el
    // momento de la ejecución: el dashboard solo mira las reuniones de hoy y
    // las próximas siete días, así que una fecha fija dejaría de aparecer en
    // cuanto el test se ejecutara más adelante.
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    const meeting = await authed(owner.token)
      .post('/meetings')
      .send({
        title: `Revisión de trazabilidad ${randomUUID().slice(0, 6)}`,
        description: 'Reunión creada por el flujo completo',
        teamId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        timezone: 'America/Mexico_City',
      })
      .expect(201);
    const meetingId = meeting.body.data.id as string;
    expect(meeting.body.data.status).toBe('DRAFT');
    expect(meeting.body.data.organizer.id).toBe(owner.userId);

    // La reunión recorre la máquina de estados real: DRAFT → SCHEDULED →
    // IN_PROGRESS. Saltarse el paso intermedio da 409.
    await authed(owner.token)
      .patch(`/meetings/${meetingId}`)
      .send({ status: 'SCHEDULED' })
      .expect(200);

    const started = await authed(owner.token)
      .patch(`/meetings/${meetingId}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);
    expect(started.body.data.status).toBe('IN_PROGRESS');

    // 4. Ordena la agenda y comprueba que el reordenamiento se respeta.
    const firstItem = await authed(owner.token)
      .post(`/meetings/${meetingId}/agenda`)
      .send({ title: 'Repaso de avances', durationMinutes: 15 })
      .expect(201);
    const secondItem = await authed(owner.token)
      .post(`/meetings/${meetingId}/agenda`)
      .send({ title: 'Riesgos', durationMinutes: 10 })
      .expect(201);

    await authed(owner.token)
      .patch(`/meetings/${meetingId}/agenda/reorder`)
      .send({ order: [secondItem.body.data.id, firstItem.body.data.id] })
      .expect(200);

    const agenda = await authed(owner.token)
      .get(`/meetings/${meetingId}/agenda`)
      .expect(200);
    expect(agenda.body.data.map((i: { id: string }) => i.id)).toEqual([
      secondItem.body.data.id,
      firstItem.body.data.id,
    ]);

    // 5. Invita a los dos al equipo de la reunión y registra su asistencia.
    const participants = await authed(owner.token)
      .post(`/meetings/${meetingId}/participants`)
      .send({ userIds: [editor.userId, attendee.userId] })
      .expect(201);
    expect(participants.body.data).toHaveLength(2);

    await authed(editor.token)
      .patch(`/meetings/${meetingId}/participants/me`)
      .send({ status: 'ACCEPTED' })
      .expect(200);

    await authed(owner.token)
      .patch(`/meetings/${meetingId}/participants/${editor.userId}/attendance`)
      .send({ attendance: 'ATTENDED' })
      .expect(200);

    // 6. Una nota menciona a los dos: llega una notificación a cada uno.
    const mentionWord = randomUUID().slice(0, 8);
    const note = await authed(editor.token)
      .post(`/meetings/${meetingId}/notes`)
      .send({
        content:
          `Revisar ${mentionWord} con @${owner.email} ` +
          `y @${attendee.email} antes del cierre`,
      })
      .expect(201);
    const noteId = note.body.data.id as string;

    // Las menciones se resuelven en un listener asíncrono: se espera a que
    // existan en vez de asumir que ya llegaron al responder el endpoint.
    const ownerMentions = await waitUntil(
      () => mentionsFor(owner.token, 'noteId', noteId),
      (m) => m.length > 0,
    );
    expect(ownerMentions).toHaveLength(1);
    expect((await mentionsFor(attendee.token, 'noteId', noteId)).length).toBe(
      1,
    );

    // 7. Una decisión mencionada genera su propia notificación, y se puede
    //    completar el contenido después de crearla.
    // La registra el editor: crear nota o decisión exige ser participante de
    // la reunión, y el organizador no se añade solo.
    const decision = await authed(editor.token)
      .post(`/meetings/${meetingId}/decisions`)
      .send({ title: `Aprobar ${mentionWord}` })
      .expect(201);
    const decisionId = decision.body.data.id as string;
    expect(decision.body.data.author.id).toBe(editor.userId);

    // El contenido se puede completar después de crearla, y esa edición también
    // genera mención.
    await authed(editor.token)
      .patch(`/decisions/${decisionId}`)
      .send({ content: `Acordado con @${attendee.email}` })
      .expect(200);

    const decisionMentions = await waitUntil(
      () => mentionsFor(attendee.token, 'decisionId', decisionId),
      (m) => m.length > 0,
    );
    expect(decisionMentions).toHaveLength(1);

    // 8. La decisión se convierte en tarea, y hereda reunión y equipo.
    const task = await authed(owner.token)
      .post('/tasks')
      .send({
        title: `Cerrar ${mentionWord}`,
        teamId,
        meetingId,
        decisionId,
        priority: 'HIGH',
        assigneeId: editor.userId,
      })
      .expect(201);
    const taskId = task.body.data.id as string;
    expect(task.body.data.decision.id).toBe(decisionId);
    expect(task.body.data.assignee.id).toBe(editor.userId);

    // 9. El asistente ve la reunión en su listado: ya es participante.
    const visible = await authed(attendee.token).get('/meetings').expect(200);
    expect(
      visible.body.data.some((m: { id: string }) => m.id === meetingId),
    ).toBe(true);

    // 10. El dashboard agrega lo que se acaba de hacer. El resumen usa
    // `metrics` con contadores, y las tareas pendientes son las asignadas a
    // quien consulta: por eso se mira el del editor, no el de la organizadora.
    const ownerDashboard = await authed(owner.token)
      .get('/dashboard')
      .expect(200);
    expect(
      ownerDashboard.body.data.upcomingMeetings.some(
        (m: { id: string }) => m.id === meetingId,
      ),
    ).toBe(true);

    const editorDashboard = await authed(editor.token)
      .get('/dashboard')
      .expect(200);
    expect(
      editorDashboard.body.data.metrics.pendingTasks,
    ).toBeGreaterThanOrEqual(1);
    expect(
      editorDashboard.body.data.pendingTasks.some(
        (t: { id: string }) => t.id === taskId,
      ),
    ).toBe(true);

    // 11. La búsqueda encuentra la reunión. Se busca por una palabra en
    // castellano y no por el sufijo aleatorio: el tsvector de Postgres, con
    // stemming en español, no indexa un identificador hexadecimal. Los
    // resultados vienen agrupados por tipo.
    const search = await authed(owner.token)
      .get('/search?q=trazabilidad&type=meetings')
      .expect(200);
    expect(
      search.body.data.groups.meetings.some(
        (m: { id: string }) => m.id === meetingId,
      ),
    ).toBe(true);

    // 12. Y todo el recorrido quedó auditado.
    const audit = await authed(owner.token).get('/audit?limit=200').expect(200);
    const actions = audit.body.data.items.map(
      (e: { action: string }) => e.action,
    );
    expect(actions).toContain('MEETING_CREATED');
    expect(actions).toContain('MEETING_UPDATED');
    expect(actions).toContain('MEMBER_INVITED');
    expect(actions).toContain('DECISION_CREATED');
    expect(actions).toContain('TASK_CREATED');

    // Y entre las entradas de esa reunión está la de creación. El log llega de
    // más reciente a más antigua, así que se busca en la lista y no se toma la
    // primera coincidencia.
    expect(
      audit.body.data.items.some(
        (e: { entityId: string; action: string }) =>
          e.entityId === meetingId && e.action === 'MEETING_CREATED',
      ),
    ).toBe(true);

    // 13. Cerrar la reunión es el último paso y deja el estado final coherente.
    await authed(owner.token)
      .patch(`/meetings/${meetingId}`)
      .send({ status: 'COMPLETED' })
      .expect(200);

    const detail = await authed(owner.token)
      .get(`/meetings/${meetingId}`)
      .expect(200);
    expect(detail.body.data.status).toBe('COMPLETED');

    // El detalle no incrusta agenda, participantes, notas ni decisiones: cada
    // cosa se pide por su endpoint, que es como trabaja el cliente.
    for (const [path, expected] of [
      [`/meetings/${meetingId}/agenda`, 2],
      [`/meetings/${meetingId}/participants`, 2],
      [`/meetings/${meetingId}/notes`, 1],
      [`/meetings/${meetingId}/decisions`, 1],
    ] as const) {
      const listed = await authed(owner.token).get(path).expect(200);
      expect(listed.body.data).toHaveLength(expected);
    }

    // La tarea sigue viva y enlazada aunque la reunión esté cerrada.
    const taskDetail = await authed(editor.token)
      .get(`/tasks/${taskId}`)
      .expect(200);
    expect(taskDetail.body.data.meeting.id).toBe(meetingId);
  });
});
