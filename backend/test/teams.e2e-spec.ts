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

describe('Teams (e2e)', () => {
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

  it('sanity: el servidor responde al registro', async () => {
    await registerAndToken('sanity');
  }, 15000);

  it('OWNER crea un equipo y queda como miembro OWNER', async () => {
    const owner = await registerAndToken('owner');

    const response = await authed(owner.accessToken)
      .post('/teams')
      .send({ name: 'Equipo A' })
      .expect(201);

    expect(response.body.data.role).toBe('OWNER');
    expect(response.body.data.memberCount).toBe(1);
  });

  it('un usuario solo ve los equipos a los que pertenece', async () => {
    const owner = await registerAndToken('lista-owner');
    const stranger = await registerAndToken('lista-extra');

    const team = await authed(owner.accessToken)
      .post('/teams')
      .send({ name: 'Equipo Secreto' })
      .expect(201);

    const ownTeams = await authed(owner.accessToken).get('/teams').expect(200);
    expect(ownTeams.body.data.map((t: { id: string }) => t.id)).toContain(
      team.body.data.id,
    );

    const strangerTeams = await authed(stranger.accessToken)
      .get('/teams')
      .expect(200);
    expect(strangerTeams.body.data).toHaveLength(0);

    await authed(stranger.accessToken)
      .get(`/teams/${team.body.data.id}`)
      .expect(403);
  });

  it('se aplica la matriz de roles: MEMBER no puede invitar → 403', async () => {
    const owner = await registerAndToken('matriz-owner');
    const member = await registerAndToken('matriz-miembro');
    const guest = await registerAndToken('matriz-invitado');

    const team = await authed(owner.accessToken)
      .post('/teams')
      .send({ name: 'Equipo Matriz' })
      .expect(201);
    const teamId: string = team.body.data.id;

    await authed(owner.accessToken)
      .post(`/teams/${teamId}/members`)
      .send({ email: member.email })
      .expect(201);

    await authed(member.accessToken)
      .post(`/teams/${teamId}/members`)
      .send({ email: guest.email })
      .expect(403);

    const publicDetail = await authed(member.accessToken)
      .get(`/teams/${teamId}`)
      .expect(200);
    expect(publicDetail.body.data.members).toHaveLength(2);
  });

  it('el OWNER promueve y elimina, y el miembro eliminado deja de ver el equipo', async () => {
    const owner = await registerAndToken('ciclo-owner');
    const member = await registerAndToken('ciclo-miembro');

    const team = await authed(owner.accessToken)
      .post('/teams')
      .send({ name: 'Equipo Ciclo' })
      .expect(201);
    const teamId: string = team.body.data.id;

    const invited = await authed(owner.accessToken)
      .post(`/teams/${teamId}/members`)
      .send({ email: member.email })
      .expect(201);
    const memberId: string = invited.body.data.id;

    await authed(owner.accessToken)
      .patch(`/teams/${teamId}/members/${memberId}`)
      .send({ role: 'ADMIN' })
      .expect(200);

    expect(
      (await authed(member.accessToken).get(`/teams/${teamId}`).expect(200))
        .body.data.role,
    ).toBe('ADMIN');

    await authed(owner.accessToken)
      .delete(`/teams/${teamId}/members/${memberId}`)
      .expect(200);

    await authed(member.accessToken).get(`/teams/${teamId}`).expect(403);
  });

  it('un miembro puede abandonar el equipo', async () => {
    const owner = await registerAndToken('salida-owner');
    const member = await registerAndToken('salida-miembro');

    const team = await authed(owner.accessToken)
      .post('/teams')
      .send({ name: 'Equipo Salida' })
      .expect(201);
    const teamId: string = team.body.data.id;

    await authed(owner.accessToken)
      .post(`/teams/${teamId}/members`)
      .send({ email: member.email })
      .expect(201);

    await authed(member.accessToken).post(`/teams/${teamId}/leave`).expect(200);

    await authed(member.accessToken).get(`/teams/${teamId}`).expect(403);
  });

  it('eliminar el equipo elimina a sus miembros en cascada', async () => {
    const owner = await registerAndToken('borrado-owner');
    const member = await registerAndToken('borrado-miembro');

    const team = await authed(owner.accessToken)
      .post('/teams')
      .send({ name: 'Equipo Borrado' })
      .expect(201);
    const teamId: string = team.body.data.id;

    await authed(owner.accessToken)
      .post(`/teams/${teamId}/members`)
      .send({ email: member.email })
      .expect(201);

    await authed(owner.accessToken).delete(`/teams/${teamId}`).expect(200);

    const remaining = await prisma.teamMember.count({ where: { teamId } });
    expect(remaining).toBe(0);
    expect(await prisma.team.findUnique({ where: { id: teamId } })).toBeNull();
  });

  it('transferencia de ownership: el nuevo OWNER administra y el viejo queda en ADMIN', async () => {
    const owner = await registerAndToken('hereda-owner');
    const heir = await registerAndToken('hereda-destino');

    const team = await authed(owner.accessToken)
      .post('/teams')
      .send({ name: 'Equipo Herencia' })
      .expect(201);
    const teamId: string = team.body.data.id;

    const invited = await authed(owner.accessToken)
      .post(`/teams/${teamId}/members`)
      .send({ email: heir.email })
      .expect(201);
    const heirMemberId: string = invited.body.data.id;

    await authed(owner.accessToken)
      .patch(`/teams/${teamId}/members/${heirMemberId}`)
      .send({ role: 'ADMIN' })
      .expect(200);

    await authed(owner.accessToken)
      .post(`/teams/${teamId}/transfer-ownership`)
      .send({ newOwnerId: heir.userId })
      .expect(200);

    const detail = await authed(heir.accessToken)
      .get(`/teams/${teamId}`)
      .expect(200);
    expect(detail.body.data.role).toBe('OWNER');

    const newbie = await registerAndToken('hereda-nuevo');
    await authed(heir.accessToken)
      .post(`/teams/${teamId}/members`)
      .send({ email: newbie.email })
      .expect(201);

    const extra = await registerAndToken('hereda-extra');
    await authed(owner.accessToken)
      .post(`/teams/${teamId}/members`)
      .send({ email: extra.email })
      .expect(201);
  });
});
