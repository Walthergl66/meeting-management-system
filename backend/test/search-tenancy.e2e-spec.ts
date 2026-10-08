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

const RARE = 'zafiro';

describe('Aislamiento de la busqueda entre equipos (e2e)', () => {
  let app: INestApplication;

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
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`),
    delete: (url: string) =>
      request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${token}`),
  });

  const createTeam = async (token: string, name: string) => {
    const response = await authed(token)
      .post('/teams')
      .send({ name })
      .expect(201);
    return response.body.data.id as string;
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

  const createMeetingWithDecision = async (
    token: string,
    teamId: string,
    userId: string,
    suffix: string,
  ) => {
    const meeting = await authed(token)
      .post('/meetings')
      .send({
        title: `Reunion ${suffix}`,
        teamId,
        startTime: new Date(Date.now() + 86_400_000).toISOString(),
        endTime: new Date(Date.now() + 90_000_000).toISOString(),
      })
      .expect(201);

    const meetingId = meeting.body.data.id as string;

    await authed(token)
      .post(`/meetings/${meetingId}/participants`)
      .send({ userIds: [userId] })
      .expect(201);

    const decision = await authed(token)
      .post(`/meetings/${meetingId}/decisions`)
      .send({ title: `${RARE} ${suffix}`, content: `Detalle ${RARE}` })
      .expect(201);

    return { meetingId, decisionId: decision.body.data.id as string };
  };

  const searchIds = async (token: string, group: 'decisions' | 'meetings') => {
    const response = await authed(token)
      .get(`/search?q=${RARE}&limit=50`)
      .expect(200);

    return (
      (response.body.data.groups[group] ?? []) as Array<{ id: string }>
    ).map((item) => item.id);
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
    await app.close();
  });

  it('no filtra una decision de otro equipo aunque el autor sea companero', async () => {
    const suffix = randomUUID().slice(0, 8);

    const alice = await register('aisla-alice');
    const bob = await register('aisla-bob');

    const teamX = await createTeam(alice.accessToken, `Equipo X ${suffix}`);
    const teamY = await createTeam(bob.accessToken, `Equipo Y ${suffix}`);

    // Bob pasa a estar en X e Y: comparte equipo con Alice sin ser suyo el
    // equipo donde escribe.
    await addMember(alice.accessToken, teamX, bob.email);

    const { meetingId, decisionId } = await createMeetingWithDecision(
      bob.accessToken,
      teamY,
      bob.userId,
      suffix,
    );

    // Alice solo pertenece al equipo X.
    expect(await searchIds(alice.accessToken, 'meetings')).not.toContain(
      meetingId,
    );
    expect(await searchIds(alice.accessToken, 'decisions')).not.toContain(
      decisionId,
    );

    // Bob es miembro de Y: a el si le tiene que aparecer.
    expect(await searchIds(bob.accessToken, 'decisions')).toContain(decisionId);
  });

  it('sigue mostrando al autor la decision que queda huerfana al borrar su reunion', async () => {
    const suffix = randomUUID().slice(0, 8);

    const owner = await register('huerfana-dueno');
    const other = await register('huerfana-otro');
    const teamId = await createTeam(owner.accessToken, `Equipo H ${suffix}`);
    await addMember(owner.accessToken, teamId, other.email);

    const { meetingId, decisionId } = await createMeetingWithDecision(
      owner.accessToken,
      teamId,
      owner.userId,
      suffix,
    );

    expect(await searchIds(owner.accessToken, 'decisions')).toContain(
      decisionId,
    );

    // Al borrar la reunion, ON DELETE SET NULL deja la decision sin meeting_id.
    await authed(owner.accessToken)
      .delete(`/meetings/${meetingId}`)
      .expect(200);

    const trasBorrar = await searchIds(owner.accessToken, 'decisions');
    expect(trasBorrar).toContain(decisionId);
  });
});
