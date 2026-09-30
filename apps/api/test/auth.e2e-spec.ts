import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomBytes, randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupSwagger } from '../src/swagger';

const uniqueEmail = (prefix: string) =>
  `${prefix}-${randomUUID()}@meetflow.test`;

/** El refresh token viaja solo en la cookie httpOnly: el test lo lee como haria el navegador. */
const refreshTokenFromCookie = (response: request.Response): string => {
  const cookies = response.headers['set-cookie'] as unknown as string[];
  const cookie = cookies.find((item) => item.startsWith('refresh_token='));
  return decodeURIComponent(cookie?.split(';')[0].split('=')[1] ?? '');
};

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const register = (email: string, password = 'Meetflow123!') =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, name: 'Usuario E2E', password })
      .expect(201);

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

  describe('POST /auth/register', () => {
    it('registra un usuario y devuelve tokens → 201', async () => {
      const email = uniqueEmail('registro');

      const response = await register(email);

      expect(response.body.data.user.email).toBe(email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
      expect(response.body.data.tokens.tokenType).toBe('Bearer');
      expect(response.body.data.tokens).not.toHaveProperty('refreshToken');
      const setCookie = response.headers['set-cookie'] as unknown as string[];
      expect(setCookie.join(';')).toContain('refresh_token=');
      expect(setCookie.join(';')).toContain('HttpOnly');
    });

    it('rechaza un email duplicado → 409', async () => {
      const email = uniqueEmail('duplicado');
      await register(email);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, name: 'Otro', password: 'Meetflow123!' });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('correo');
    });

    it('rechaza datos inválidos → 422', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'no-es-correo', name: '', password: '123' });

      expect(response.status).toBe(422);
      expect(response.body.details.length).toBeGreaterThan(0);
    });
  });

  describe('POST /auth/login', () => {
    it('inicia sesión con credenciales correctas → 200 + tokens', async () => {
      const email = uniqueEmail('login');
      await register(email, 'ClaveSegura123!');

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'ClaveSegura123!' })
        .expect(200);

      expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
      expect(response.body.data.tokens.expiresIn).toBe(900);
    });

    it('falla con contraseña incorrecta → 401', async () => {
      const email = uniqueEmail('login-mal');
      await register(email);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'Incorrecta123!' })
        .expect(401);
    });

    it('falla con usuario inexistente → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: uniqueEmail('fantasma'), password: 'Meetflow123!' })
        .expect(401);
    });
  });

  describe('Protección de rutas', () => {
    it('GET /users/me sin token → 401', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('GET /users/me con token válido → 200 y el perfil', async () => {
      const email = uniqueEmail('perfil');
      const registration = await register(email);
      const { accessToken } = registration.body.data.tokens;

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.email).toBe(email);
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('GET /users/me con token inválido → 401', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer token.invalido')
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('renueva el access token con la cookie de sesión', async () => {
      const email = uniqueEmail('refresh');
      const registration = await register(email);
      const refreshToken = refreshTokenFromCookie(registration);

      expect(refreshToken).toHaveLength(96);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(200);

      expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
      expect(refreshTokenFromCookie(response)).not.toBe(refreshToken);
    });

    it('acepta el refresh token en el cuerpo', async () => {
      const email = uniqueEmail('refresh-body');
      const registration = await register(email);
      const refreshToken = refreshTokenFromCookie(registration);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);
    });

    it('sin cookie ni token → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(401);
    });

    it('rechaza un refresh token ya revocado (rotación) → 401', async () => {
      const email = uniqueEmail('refresh-rotado');
      const registration = await register(email);
      const refreshToken = refreshTokenFromCookie(registration);

      const rotado = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      // La reutilizacion revoca la sesion completa, incluido el token rotado.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: refreshTokenFromCookie(rotado) })
        .expect(401);
    });

    it('rechaza un refresh token expirado → 401', async () => {
      const email = uniqueEmail('refresh-expirado');
      const registration = await register(email);
      const refreshToken = refreshTokenFromCookie(registration);

      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revoca el refresh token de la sesión', async () => {
      const email = uniqueEmail('logout');
      const registration = await register(email);
      const refreshToken = refreshTokenFromCookie(registration);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Recuperación de contraseña', () => {
    it('nunca revela si el correo existe', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: uniqueEmail('inexistente') })
        .expect(200);

      expect(response.body.data.message).toContain('Si el correo existe');
    });

    it('genera un token hasheado y no acepta tokens inventados', async () => {
      const email = uniqueEmail('reset');
      const registration = await register(email, 'ClaveVieja123!');

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email })
        .expect(200);

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: registration.body.data.user.id },
      });

      expect(tokenRecord).not.toBeNull();
      expect(tokenRecord).not.toHaveProperty('token');

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'token-enclaro-inexistente',
          password: 'ClaveNueva123!',
        })
        .expect(401);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'ClaveVieja123!' })
        .expect(200);

      expect(loginResponse.body.data.tokens.accessToken).toEqual(
        expect.any(String),
      );
    });

    it('aplica el reset cuando el token es válido', async () => {
      const email = uniqueEmail('reset-valido');
      const registration = await register(email, 'ClaveVieja123!');
      const userId: string = registration.body.data.user.id;

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email })
        .expect(200);

      const generado = await prisma.passwordResetToken.findFirstOrThrow({
        where: { userId },
      });
      expect(generado.tokenHash).toHaveLength(64);
      expect(generado.usedAt).toBeNull();

      // El token en claro solo existe en el correo, asi que el test simula
      // la entrega Replacing it in the database.
      const rawToken = randomBytes(48).toString('hex');
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash: createHash('sha256').update(rawToken).digest('hex'),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: rawToken, password: 'ClaveNueva123!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'ClaveNueva123!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'ClaveVieja123!' })
        .expect(401);

      const usado = await prisma.passwordResetToken.findFirstOrThrow({
        where: { userId },
      });
      expect(usado.usedAt).not.toBeNull();
    });
  });
});
