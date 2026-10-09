import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { setupSwagger } from '../src/swagger';
import { registerBody } from './register-request';
import { NotificationSchedulerService } from '../src/modules/notifications/notification-scheduler.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NOTIFICATION_SCHEDULER } from '../src/shared';

const uniqueEmail = (prefix: string) =>
  `${prefix}-${randomUUID()}@meetflow.test`;

/**
 * El barrido programado se dispara con un `@Interval`, así que no hay endpoint
 * que lo alcance: el test toma el provider del contenedor y lo llama. Es la
 * única forma de comprobar contra Postgres la consulta de idempotencia, que
 * con un mock de Prisma siempre "pasa".
 */
describe('Barrido de notificaciones (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let scheduler: NotificationSchedulerService;

  const register = async (prefix: string) => {
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
    post: (url: string) =>
      request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`),
    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set('Authorization', `Bearer ${token}`),
  });

  /**
   * Reunión que empieza en `minutes` minutos. El barrido solo mira la ventana
   * [REMINDER_MINUTES, REMINDER_MINUTES + 5), así que los minutos tienen que
   * caer dentro de ese rango para que la reunión sea candidata al aviso.
   */
  const startingIn = (minutes: number) => ({
    startTime: new Date(Date.now() + minutes * 60_000).toISOString(),
    endTime: new Date(Date.now() + (minutes + 60) * 60_000).toISOString(),
  });

  /** Las reuniones nacen en DRAFT; el barrido solo mira las programadas. */
  const schedule = async (token: string, meetingId: string) => {
    await authed(token)
      .patch(`/meetings/${meetingId}`)
      .send({ status: 'SCHEDULED' })
      .expect(200);
  };

  const countReminders = async (userId: string, meetingId: string) =>
    prisma.notification.count({
      where: {
        userId,
        type: 'MEETING_REMINDER',
        metadata: { path: ['meetingId'], equals: meetingId },
      },
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleFixture.createNestApplication());
    setupSwagger(app);
    await app.init();

    prisma = app.get(PrismaService);
    scheduler = app.get(NotificationSchedulerService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('notifica cada reunión en ventana una sola vez, aunque repita el barrido', async () => {
    const owner = await register('sweep-owner');
    const guest = await register('sweep-guest');
    const coOrganizer = await register('sweep-coorganizer');

    const team = await authed(owner.accessToken)
      .post('/teams')
      .send({ name: 'Equipo barrido' })
      .expect(201);
    const teamId = team.body.data.id as string;

    for (const member of [guest, coOrganizer]) {
      await authed(owner.accessToken)
        .post(`/teams/${teamId}/members`)
        .send({ email: member.email })
        .expect(201);
    }

    // Dos reuniones dentro de la ventana, en el mismo horario: cada una con un
    // organizador distinto porque el sistema no permite solaparlas para el
    // mismo. El invitado participa en ambas, así que acumula dos recordatorios
    // del mismo tipo y la comprobación de idempotencia tiene que distinguir una
    // entidad de la otra.
    const first = await authed(owner.accessToken)
      .post('/meetings')
      .send({
        title: 'Primera reunión',
        teamId,
        ...startingIn(NOTIFICATION_SCHEDULER.MEETING_REMINDER_MINUTES + 1),
      })
      .expect(201);

    const second = await authed(coOrganizer.accessToken)
      .post('/meetings')
      .send({
        title: 'Segunda reunión',
        teamId,
        ...startingIn(NOTIFICATION_SCHEDULER.MEETING_REMINDER_MINUTES + 1),
      })
      .expect(201);

    const meetings = [
      { id: first.body.data.id, organizer: owner.accessToken },
      { id: second.body.data.id, organizer: coOrganizer.accessToken },
    ];

    for (const meeting of meetings) {
      await authed(meeting.organizer)
        .post(`/meetings/${meeting.id}/participants`)
        .send({ userIds: [guest.userId] })
        .expect(201);
      await schedule(meeting.organizer, meeting.id);
    }

    await scheduler.sweep();

    for (const meeting of meetings) {
      expect(await countReminders(guest.userId, meeting.id)).toBe(1);
    }

    // Segundo barrido sin cambios: la idempotencia real vive en la consulta.
    await scheduler.sweep();

    for (const meeting of meetings) {
      expect(await countReminders(guest.userId, meeting.id)).toBe(1);
    }

    const total = await prisma.notification.count({
      where: { userId: guest.userId, type: 'MEETING_REMINDER' },
    });
    expect(total).toBe(2);
  });

  it('no duplica el aviso de una tarea al repetir el barrido', async () => {
    const owner = await register('sweep-task-owner');

    const team = await authed(owner.accessToken)
      .post('/teams')
      .send({ name: 'Equipo tareas' })
      .expect(201);

    const task = await authed(owner.accessToken)
      .post('/tasks')
      .send({
        title: 'Redactar el acta',
        teamId: team.body.data.id,
        dueDate: new Date(Date.now() + 2 * 3_600_000).toISOString(),
      })
      .expect(201);

    await authed(owner.accessToken)
      .patch(`/tasks/${task.body.data.id}`)
      .send({ assigneeId: owner.userId })
      .expect(200);

    await scheduler.sweep();
    await scheduler.sweep();

    const count = await prisma.notification.count({
      where: {
        userId: owner.userId,
        type: 'TASK_DUE_SOON',
        metadata: { path: ['taskId'], equals: task.body.data.id },
      },
    });

    expect(count).toBe(1);
  });

  it('distingue el aviso de una tarea del de una reunión', async () => {
    const owner = await register('sweep-mix');

    const team = await authed(owner.accessToken)
      .post('/teams')
      .send({ name: 'Equipo mixto' })
      .expect(201);
    const teamId = team.body.data.id as string;

    const meeting = await authed(owner.accessToken)
      .post('/meetings')
      .send({
        title: 'Reunión mixta',
        teamId,
        ...startingIn(NOTIFICATION_SCHEDULER.MEETING_REMINDER_MINUTES + 2),
      })
      .expect(201);

    await authed(owner.accessToken)
      .post(`/meetings/${meeting.body.data.id}/participants`)
      .send({ userIds: [owner.userId] })
      .expect(201);
    await schedule(owner.accessToken, meeting.body.data.id);

    const task = await authed(owner.accessToken)
      .post('/tasks')
      .send({
        title: 'Tarea mixta',
        teamId,
        dueDate: new Date(Date.now() + 3_600_000).toISOString(),
      })
      .expect(201);

    await authed(owner.accessToken)
      .patch(`/tasks/${task.body.data.id}`)
      .send({ assigneeId: owner.userId })
      .expect(200);

    await scheduler.sweep();

    expect(await countReminders(owner.userId, meeting.body.data.id)).toBe(1);
    expect(
      await prisma.notification.count({
        where: {
          userId: owner.userId,
          type: 'TASK_DUE_SOON',
          metadata: { path: ['taskId'], equals: task.body.data.id },
        },
      }),
    ).toBe(1);
  });
});
