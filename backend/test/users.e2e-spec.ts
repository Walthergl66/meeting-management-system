import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as request from 'supertest';
import { configureApp } from '../src/common/configure-app';
import { AppModule } from '../src/app.module';
import { registerBody } from './register-request';

interface RegisteredUser {
  userId: string;
  email: string;
  accessToken: string;
}

describe('Perfil del usuario (e2e)', () => {
  let app: INestApplication;

  const register = async (tag: string): Promise<RegisteredUser> => {
    const email = `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.com`;
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...registerBody(email),
        firstName: 'Perfil',
        lastName: 'García',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.tokens.accessToken).toBeDefined();

    return {
      userId: res.body.data.user.id,
      email,
      accessToken: res.body.data.tokens.accessToken,
    };
  };

  const authed = (token: string) => ({
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${token}`),
    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set('Authorization', `Bearer ${token}`),
  });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users/me', () => {
    it('devuelve el perfil del token y no el hash', async () => {
      const user = await register('perfil-lectura');

      const res = await authed(user.accessToken).get('/users/me').expect(200);

      expect(res.body.data).toMatchObject({
        id: user.userId,
        email: user.email,
        name: 'Perfil García',
        timezone: 'UTC',
        locale: 'es',
        avatarUrl: null,
      });
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('exige cabecera de autorización', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('PATCH /users/me', () => {
    it('actualiza nombre, zona horaria e idioma', async () => {
      const user = await register('perfil-update');

      const res = await authed(user.accessToken)
        .patch('/users/me')
        .send({
          firstName: 'Nombre',
          lastName: 'Nuevo',
          timezone: 'Europe/Madrid',
          locale: 'en',
        })
        .expect(200);

      expect(res.body.data).toMatchObject({
        id: user.userId,
        name: 'Nombre Nuevo',
        timezone: 'Europe/Madrid',
        locale: 'en',
      });
      expect(res.body.data).not.toHaveProperty('passwordHash');

      // El cambio persiste: una lectura posterior lo confirma.
      const reread = await authed(user.accessToken)
        .get('/users/me')
        .expect(200);
      expect(reread.body.data.name).toBe('Nombre Nuevo');
    });

    it('deja limpiar el avatar', async () => {
      const user = await register('perfil-avatar');

      const res = await authed(user.accessToken)
        .patch('/users/me')
        .send({ avatarUrl: 'https://cdn.example.com/a.png' })
        .expect(200);
      expect(res.body.data.avatarUrl).toBe('https://cdn.example.com/a.png');

      const cleared = await authed(user.accessToken)
        .patch('/users/me')
        .send({ avatarUrl: null })
        .expect(200);
      expect(cleared.body.data.avatarUrl).toBeNull();
    });

    it('rechaza una zona horaria que no existe', async () => {
      const user = await register('perfil-tz');

      const res = await authed(user.accessToken)
        .patch('/users/me')
        .send({ timezone: ''.padStart(65, 'x') })
        .expect(422);

      // El detalle de la validación tiene que ser legible: si aquí saliera
      // "[object Object]" el cliente no podría decir qué campo falló.
      expect(res.body).toMatchObject({
        statusCode: 422,
        message: 'Validation failed',
      });
      expect(res.body.details).toEqual([
        {
          field: 'timezone',
          message: expect.stringContaining('timezone'),
        },
      ]);
      expect(JSON.stringify(res.body)).not.toContain('[object Object]');
    });

    it('rechaza editar el nombre compuesto y otros campos desconocidos → 422', async () => {
      const user = await register('perfil-extra');

      const res = await authed(user.accessToken)
        .patch('/users/me')
        .send({ name: 'Solo Esto' })
        .expect(422);

      expect(res.body).toMatchObject({
        statusCode: 422,
        message: 'Validation failed',
      });
      expect(JSON.stringify(res.body)).toContain('name');
      expect(JSON.stringify(res.body)).not.toContain('[object Object]');
    });

    it('exige autorización', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .send({ firstName: 'X' })
        .expect(401);
    });
  });
});
