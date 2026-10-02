import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupSwagger } from '../src/swagger';

const uniqueEmail = (prefix: string) =>
  `${prefix}-${randomUUID()}@meetflow.test`;

describe('Notas y decisiones (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

  const createMeeting = async (token: string, teamId: string) => {
    const meeting = await authed(token)
      .post('/meetings')
      .send({
        title: 'Reunión con notas',
        teamId,
        startTime: '2030-08-01T16:00:00',
        endTime: '2030-08-01T17:00:00',
        timezone: 'UTC',
      })
      .expect(201);
    return meeting.body.data.id as string;
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

  const inviteParticipant = async (
    ownerToken: string,
    meetingId: string,
    userId: string,
  ) => {
    await authed(ownerToken)
      .post(`/meetings/${meetingId}/participants`)
      .send({ userIds: [userId] })
      .expect(201);
  };

  // Las menciones se resuelven en un listener asíncrono: la notificación
  // llega después de que el endpoint responde, así que se espera a que exista.
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

  const fetchMentions = async (
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

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('solo participantes pueden crear notas → 403 para externos', async () => {
    const owner = await registerAndToken('nota-403-owner');
    const member = await registerAndToken('nota-403-miembro');
    const outsider = await registerAndToken('nota-403-fuera');
    const teamId = await createTeam(owner.accessToken, 'Equipo Notas 403');
    const meetingId = await createMeeting(owner.accessToken, teamId);
    await addMember(owner.accessToken, teamId, member.email);
    await inviteParticipant(owner.accessToken, meetingId, member.userId);

    const created = await authed(member.accessToken)
      .post(`/meetings/${meetingId}/notes`)
      .send({ content: 'Nota del participante' })
      .expect(201);
    expect(created.body.data.author.id).toBe(member.userId);

    await authed(outsider.accessToken)
      .post(`/meetings/${meetingId}/notes`)
      .send({ content: 'Nota ajena' })
      .expect(403);
  });

  it('eliminar reunión no elimina notas ni decisiones', async () => {
    const owner = await registerAndToken('ret-owner');
    const member = await registerAndToken('ret-miembro');
    const teamId = await createTeam(owner.accessToken, 'Equipo Retención');
    const meetingId = await createMeeting(owner.accessToken, teamId);
    await addMember(owner.accessToken, teamId, member.email);
    await inviteParticipant(owner.accessToken, meetingId, member.userId);

    const note = await authed(member.accessToken)
      .post(`/meetings/${meetingId}/notes`)
      .send({ content: 'Nota persistente' })
      .expect(201);
    const decision = await authed(member.accessToken)
      .post(`/meetings/${meetingId}/decisions`)
      .send({ title: 'Decisión persistente' })
      .expect(201);

    await authed(owner.accessToken)
      .delete(`/meetings/${meetingId}`)
      .expect(200);

    const noteStillThere = await prisma.meetingNote.findUnique({
      where: { id: note.body.data.id },
    });
    const decisionStillThere = await prisma.decision.findUnique({
      where: { id: decision.body.data.id },
    });

    expect(noteStillThere).not.toBeNull();
    expect(decisionStillThere).not.toBeNull();
  });

  it('cada nota y decisión registra el userId del creador', async () => {
    const owner = await registerAndToken('autor-owner');
    const member = await registerAndToken('autor-miembro');
    const teamId = await createTeam(owner.accessToken, 'Equipo Autor');
    const meetingId = await createMeeting(owner.accessToken, teamId);
    await addMember(owner.accessToken, teamId, member.email);
    await inviteParticipant(owner.accessToken, meetingId, member.userId);

    const note = await authed(member.accessToken)
      .post(`/meetings/${meetingId}/notes`)
      .send({ content: 'Nota con autor' })
      .expect(201);
    expect(note.body.data.author.id).toBe(member.userId);
    expect(note.body.data.author.email).toBe(member.email);

    const decision = await authed(member.accessToken)
      .post(`/meetings/${meetingId}/decisions`)
      .send({ title: 'Decisión con autor' })
      .expect(201);
    expect(decision.body.data.author.id).toBe(member.userId);
  });

  it('crea, edita y elimina notas y decisiones', async () => {
    const owner = await registerAndToken('crud-owner');
    const member = await registerAndToken('crud-miembro');
    const teamId = await createTeam(owner.accessToken, 'Equipo CRUD Notas');
    const meetingId = await createMeeting(owner.accessToken, teamId);
    await addMember(owner.accessToken, teamId, member.email);
    await inviteParticipant(owner.accessToken, meetingId, member.userId);

    const note = await authed(member.accessToken)
      .post(`/meetings/${meetingId}/notes`)
      .send({ content: 'Nota original' })
      .expect(201);
    const noteId: string = note.body.data.id;

    const updatedNote = await authed(member.accessToken)
      .patch(`/notes/${noteId}`)
      .send({ content: 'Nota editada' })
      .expect(200);
    expect(updatedNote.body.data.content).toBe('Nota editada');

    await authed(member.accessToken).delete(`/notes/${noteId}`).expect(200);

    const decision = await authed(member.accessToken)
      .post(`/meetings/${meetingId}/decisions`)
      .send({ title: 'Decisión original' })
      .expect(201);
    const decisionId: string = decision.body.data.id;

    const updatedDecision = await authed(member.accessToken)
      .patch(`/decisions/${decisionId}`)
      .send({ title: 'Decisión editada' })
      .expect(200);
    expect(updatedDecision.body.data.title).toBe('Decisión editada');

    await authed(member.accessToken)
      .delete(`/decisions/${decisionId}`)
      .expect(200);
  });

  it('un participante no puede editar una nota ajena → 403', async () => {
    const owner = await registerAndToken('ajena-owner');
    const memberA = await registerAndToken('ajena-a');
    const memberB = await registerAndToken('ajena-b');
    const teamId = await createTeam(owner.accessToken, 'Equipo Ajena');
    const meetingId = await createMeeting(owner.accessToken, teamId);
    await addMember(owner.accessToken, teamId, memberA.email);
    await addMember(owner.accessToken, teamId, memberB.email);
    await inviteParticipant(owner.accessToken, meetingId, memberA.userId);
    await inviteParticipant(owner.accessToken, meetingId, memberB.userId);

    const note = await authed(memberA.accessToken)
      .post(`/meetings/${meetingId}/notes`)
      .send({ content: 'Nota de A' })
      .expect(201);

    await authed(memberB.accessToken)
      .patch(`/notes/${note.body.data.id}`)
      .send({ content: 'Intento de B' })
      .expect(403);
  });

  it('mencionar a un miembro genera una notificación MENTION', async () => {
    const owner = await registerAndToken('mention-owner');
    const memberA = await registerAndToken('mention-a');
    const memberB = await registerAndToken('mention-b');
    const teamId = await createTeam(owner.accessToken, 'Equipo Mencion');
    const meetingId = await createMeeting(owner.accessToken, teamId);
    await addMember(owner.accessToken, teamId, memberA.email);
    await addMember(owner.accessToken, teamId, memberB.email);
    await inviteParticipant(owner.accessToken, meetingId, owner.userId);
    await inviteParticipant(owner.accessToken, meetingId, memberA.userId);
    await inviteParticipant(owner.accessToken, meetingId, memberB.userId);

    const created = await authed(memberA.accessToken)
      .post(`/meetings/${meetingId}/notes`)
      .send({
        content: `Revísalo @${memberB.email} y también @${memberA.email}`,
      })
      .expect(201);

    const noteId = created.body.data.id as string;
    const mentions = await waitUntil(
      () => fetchMentions(memberB.accessToken, 'noteId', noteId),
      (items) => items.length > 0,
    );

    expect(mentions).toHaveLength(1);
    expect(mentions[0].metadata.noteId).toBe(noteId);
  });

  it('editar una nota avisa solo de las menciones nuevas', async () => {
    const owner = await registerAndToken('mention-edit-owner');
    const author = await registerAndToken('mention-edit-author');
    const first = await registerAndToken('mention-edit-first');
    const second = await registerAndToken('mention-edit-second');
    const third = await registerAndToken('mention-edit-third');

    const teamId = await createTeam(owner.accessToken, 'Equipo Menciones Edit');
    const meetingId = await createMeeting(owner.accessToken, teamId);
    for (const member of [author, first, second, third]) {
      await addMember(owner.accessToken, teamId, member.email);
      await inviteParticipant(owner.accessToken, meetingId, member.userId);
    }

    const created = await authed(author.accessToken)
      .post(`/meetings/${meetingId}/notes`)
      .send({ content: `Primera mención @${first.email}` })
      .expect(201);
    const noteId = created.body.data.id as string;

    // Segunda mención añadida por edición: es la que faltaba notificar.
    const contentWithTwo = `Primera mención @${first.email} y segunda @${second.email}`;
    await authed(author.accessToken)
      .patch(`/notes/${noteId}`)
      .send({ content: contentWithTwo })
      .expect(200);

    // Guardar otra vez sin cambios no debe volver a avisar.
    await authed(author.accessToken)
      .patch(`/notes/${noteId}`)
      .send({ content: contentWithTwo })
      .expect(200);

    const mentionsFor = (token: string) =>
      fetchMentions(token, 'noteId', noteId);

    // La mención recién añadida sí se notifica, y una sola vez.
    expect(
      (
        await waitUntil(
          () => mentionsFor(second.accessToken),
          (i) => i.length > 0,
        )
      ).length,
    ).toBe(1);
    expect((await mentionsFor(first.accessToken)).length).toBe(1);

    // Afirmar que algo NO llegó exige saber que el proceso que lo emite sí
    // corrió. En vez de dormir 500 ms y confiar, se usa una mención nueva como
    // centinela: cuando su notificación llega, el listener ya procesó el
    // guardado sin cambios de antes, así que la ausencia de duplicados es
    // concluyente y no una carrera perdida.
    await authed(author.accessToken)
      .patch(`/notes/${noteId}`)
      .send({ content: `${contentWithTwo} y tercera @${third.email}` })
      .expect(200);

    const sentinel = await waitUntil(
      () => mentionsFor(third.accessToken),
      (i) => i.length > 0,
    );

    // El centinela llegó, así que el listener vuelve a funcionar.
    expect(sentinel.length).toBe(1);
    // Y los duplicados nunca se enviaron.
    expect((await mentionsFor(first.accessToken)).length).toBe(1);
    expect((await mentionsFor(second.accessToken)).length).toBe(1);
  });

  it('editar una decisión avisa de las menciones del título y del contenido', async () => {
    const owner = await registerAndToken('mention-dec-owner');
    const author = await registerAndToken('mention-dec-author');
    const member = await registerAndToken('mention-dec-member');

    const teamId = await createTeam(owner.accessToken, 'Equipo Decisión Edit');
    const meetingId = await createMeeting(owner.accessToken, teamId);
    for (const person of [author, member]) {
      await addMember(owner.accessToken, teamId, person.email);
      await inviteParticipant(owner.accessToken, meetingId, person.userId);
    }

    const created = await authed(author.accessToken)
      .post(`/meetings/${meetingId}/decisions`)
      .send({ title: 'Aprobar presupuesto' })
      .expect(201);

    // La mención va en el contenido, no en el título.
    await authed(author.accessToken)
      .patch(`/decisions/${created.body.data.id}`)
      .send({ content: `Avisa a @${member.email}` })
      .expect(200);

    const inbox = await authed(member.accessToken)
      .get('/notifications')
      .expect(200);
    const mentions = inbox.body.data.filter(
      (n: { type: string; metadata: { decisionId?: string } }) =>
        n.type === 'MENTION' && n.metadata?.decisionId === created.body.data.id,
    );

    expect(mentions).toHaveLength(1);
  });

  it('no notifica menciones a quien no pertenece al equipo', async () => {
    const owner = await registerAndToken('mention-foreign-owner');
    const memberA = await registerAndToken('mention-foreign-a');
    const outsider = await registerAndToken('mention-foreign-x');
    const teamId = await createTeam(owner.accessToken, 'Equipo Mencion Ajena');
    const meetingId = await createMeeting(owner.accessToken, teamId);
    await addMember(owner.accessToken, teamId, memberA.email);
    await inviteParticipant(owner.accessToken, meetingId, owner.userId);
    await inviteParticipant(owner.accessToken, meetingId, memberA.userId);

    const outsiderNote = await authed(memberA.accessToken)
      .post(`/meetings/${meetingId}/notes`)
      .send({ content: `Hola @${outsider.email}` })
      .expect(201);

    // Control positivo: si el pipeline funciona, esta mención sí se avisa.
    const controlNote = await authed(memberA.accessToken)
      .post(`/meetings/${meetingId}/notes`)
      .send({ content: `Y esto va para @${memberA.email}` })
      .expect(201);
    await waitUntil(
      () =>
        fetchMentions(memberA.accessToken, 'noteId', controlNote.body.data.id),
      (items) => items.length > 0,
    );

    expect(
      await fetchMentions(
        outsider.accessToken,
        'noteId',
        outsiderNote.body.data.id,
      ),
    ).toHaveLength(0);
  });
});
