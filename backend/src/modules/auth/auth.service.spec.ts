import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

/** Mismo hash que usa AuthService.hashOpaqueToken para no duplicar el algoritmo. */
const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const buildUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'usr_1',
  email: 'ana@correo.com',
  name: 'Ana',
  avatarUrl: null,
  timezone: 'UTC',
  locale: 'es',
  passwordHash: '',
  isActive: true,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z'),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let eventEmitter: { emit: jest.Mock };
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      'findByEmail' | 'create' | 'findActiveById' | 'updatePasswordHash'
    >
  >;
  let prisma: {
    user: { update: jest.Mock; updateMany: jest.Mock };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    passwordResetToken: {
      create: jest.Mock;
      deleteMany: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    eventEmitter = { emit: jest.fn() };

    usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation(({ email, name, passwordHash: hash, timezone }) =>
          Promise.resolve(
            buildUser({
              email,
              name,
              passwordHash: hash,
              timezone: timezone ?? 'UTC',
            }),
          ),
        ),
      findActiveById: jest.fn(),
      updatePasswordHash: jest.fn(),
    };

    prisma = {
      user: { update: jest.fn(), updateMany: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('jwt-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values = {
                jwt: {
                  secret: 'jwt-secret',
                  expiresIn: 900,
                  refreshExpiresInMs: 604800000,
                },
                app: { isProduction: false },
              };
              return values[key];
            }),
          },
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('emite user.authenticated al iniciar sesión', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'usr_1',
      email: 'ana@correo.com',
      name: 'Ana',
      passwordHash: await bcrypt.hash('Meetflow123!', 10),
      isActive: true,
    } as never);

    await service.login(
      { email: 'ana@correo.com', password: 'Meetflow123!' },
      { ipAddress: '10.0.0.1', userAgent: 'jest' },
    );

    const [name, event] = eventEmitter.emit.mock.calls[0];
    expect(name).toBe('user.authenticated');
    expect(event).toMatchObject({
      userId: 'usr_1',
      ipAddress: '10.0.0.1',
      userAgent: 'jest',
    });
  });

  describe('register', () => {
    it('crea el usuario con la contraseña hasheada', async () => {
      const user = await service.register({
        email: 'ana@correo.com',
        name: 'Ana',
        password: 'Meetflow123!',
      });

      expect(user.email).toBe('ana@correo.com');
      const [createArgs] = usersService.create.mock.calls[0];
      expect(createArgs.passwordHash).not.toBe('Meetflow123!');
      expect(
        await bcrypt.compare('Meetflow123!', createArgs.passwordHash),
      ).toBe(true);
    });

    it('lanza 409 si el correo ya está registrado', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser() as never);

      await expect(
        service.register({
          email: 'ana@correo.com',
          name: 'Ana',
          password: 'Meetflow123!',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('lanza 409 si la base de datos reporta duplicado por carrera', async () => {
      usersService.create.mockRejectedValueOnce({ code: 'P2002' });

      await expect(
        service.register({
          email: 'ana@correo.com',
          name: 'Ana',
          password: 'Meetflow123!',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('devuelve tokens y registra el último acceso', async () => {
      const passwordHash = await bcrypt.hash('Meetflow123!', 10);
      usersService.findByEmail.mockResolvedValue(
        buildUser({ passwordHash }) as never,
      );

      const result = await service.login({
        email: 'ana@correo.com',
        password: 'Meetflow123!',
      });

      expect(result.tokens.accessToken).toBe('jwt-token');
      expect(result.tokens.expiresIn).toBe(900);
      expect(result.tokens.refreshToken).toHaveLength(96);
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'usr_1' }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { lastLoginAt: expect.any(Date) } }),
      );
    });

    it('lanza 401 con contraseña incorrecta', async () => {
      const passwordHash = await bcrypt.hash('OtraClave9!', 10);
      usersService.findByEmail.mockResolvedValue(
        buildUser({ passwordHash }) as never,
      );

      await expect(
        service.login({ email: 'ana@correo.com', password: 'Meetflow123!' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lanza 401 si el usuario no existe', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nadie@correo.com', password: 'Meetflow123!' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('iguala el tiempo de respuesta también cuando el usuario no existe', async () => {
      // Si el correo no existiera sin comparar nada, el login de un correo
      // inexistente tardaría milisegundos y el de uno existente lo que tarda
      // bcrypt: eso permite enumerar los correos registrados.
      usersService.findByEmail.mockResolvedValue(null);
      const comparar = jest.spyOn(bcrypt, 'compare');

      await expect(
        service.login({ email: 'nadie@correo.com', password: 'Meetflow123!' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(comparar).toHaveBeenCalledTimes(1);
      const [, hashComparado] = comparar.mock.calls[0];
      expect(hashComparado).toEqual(expect.stringMatching(/^\$2[aby]\$/));

      comparar.mockRestore();
    });

    it('responde lo mismo si el correo existe con otra contraseña', async () => {
      const passwordHash = await bcrypt.hash('Meetflow123!', 10);
      usersService.findByEmail
        .mockResolvedValueOnce(buildUser({ passwordHash }) as never)
        .mockResolvedValueOnce(null);

      const conUsuario = await service
        .login({ email: 'ana@correo.com', password: 'Equivocada123!' })
        .then(() => null)
        .catch((error: Error) => error.message);
      const sinUsuario = await service
        .login({ email: 'nadie@correo.com', password: 'Meetflow123!' })
        .then(() => null)
        .catch((error: Error) => error.message);

      expect(conUsuario).toBe('Credenciales inválidas');
      expect(sinUsuario).toBe(conUsuario);
    });

    it('lanza 401 si la cuenta está desactivada', async () => {
      const passwordHash = await bcrypt.hash('Meetflow123!', 10);
      usersService.findByEmail.mockResolvedValue(
        buildUser({ passwordHash, isActive: false }) as never,
      );

      await expect(
        service.login({ email: 'ana@correo.com', password: 'Meetflow123!' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const storedToken = (overrides: Record<string, unknown> = {}) => ({
      id: 'rt_1',
      token: 'token-valido',
      tokenFamily: 'fam_1',
      userId: 'usr_1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: buildUser(),
      ...overrides,
    });

    it('rota el token vigente conservando la familia de sesión', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken());

      const result = await service.refresh('token-valido');

      expect(result.tokens.refreshToken).not.toBe('token-valido');
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tokenFamily: 'fam_1' }),
        }),
      );
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
      );
    });

    it('busca el token por su hash y no en claro', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken());

      await service.refresh('token-valido');

      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: sha256('token-valido') },
        }),
      );
    });

    it('guarda el hash del token emitido, nunca el token en claro', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken());

      const result = await service.refresh('token-valido');

      const [{ data }] = prisma.refreshToken.create.mock.calls[0];
      expect(data.token).toBe(sha256(result.tokens.refreshToken));
      expect(data.token).not.toBe(result.tokens.refreshToken);
    });

    it('detecta la reutilización y revoca toda la familia', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        storedToken({ revokedAt: new Date() }),
      );

      await expect(service.refresh('token-valido')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenFamily: 'fam_1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('lanza 401 si no hay token', async () => {
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lanza 401 si el token expiró', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        storedToken({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.refresh('token-vencido')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lanza 401 si la cuenta está desactivada', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        storedToken({ user: buildUser({ isActive: false }) }),
      );

      await expect(service.refresh('token-valido')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revoca la familia completa del token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        tokenFamily: 'fam_1',
        userId: 'usr_1',
      } as never);

      await service.logout('token-1', {
        ipAddress: '10.0.0.2',
        userAgent: 'jest',
      });

      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: sha256('token-1') },
        select: { tokenFamily: true, userId: true },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenFamily: 'fam_1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('emite user.logged_out con la IP y el user agent', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        tokenFamily: 'fam_1',
        userId: 'usr_1',
      } as never);

      await service.logout('token-1', {
        ipAddress: '10.0.0.2',
        userAgent: 'jest',
      });

      const [name, event] = eventEmitter.emit.mock.calls[0];
      expect(name).toBe('user.logged_out');
      expect(event).toMatchObject({
        userId: 'usr_1',
        ipAddress: '10.0.0.2',
        userAgent: 'jest',
      });
    });

    it('no falla si no hay token', async () => {
      await expect(service.logout(undefined)).resolves.toBeUndefined();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('guarda el hash del token, nunca el token en claro', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser() as never);

      await service.forgotPassword({ email: 'ana@correo.com' });

      const [args] = prisma.passwordResetToken.create.mock.calls[0];
      expect(args.data.tokenHash).toHaveLength(64);
      expect(args.data).not.toHaveProperty('token');
      expect(args.data.userId).toBe('usr_1');
    });

    it('no revela si el correo no existe', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'nadie@correo.com' }),
      ).resolves.toBeUndefined();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('registra el token en claro fuera de produccion', async () => {
      const warn = jest
        .spyOn(
          (service as unknown as { logger: { warn: jest.Mock } }).logger,
          'warn',
        )
        .mockImplementation(() => undefined);
      usersService.findByEmail.mockResolvedValue(buildUser() as never);

      await service.forgotPassword({ email: 'ana@correo.com' });

      const [args] = prisma.passwordResetToken.create.mock.calls[0];
      const logged = warn.mock.calls.flat().join(' ');
      expect(logged).toContain('solo desarrollo');
      // El token del log es el que se hasheo, no una cadena vacia.
      const raw = logged.split('desarrollo): ')[1].trim();
      expect(raw).toHaveLength(96);
      expect(args.data.tokenHash).not.toBe(raw);
      warn.mockRestore();
    });

    it('nunca registra el token en produccion', async () => {
      const warn = jest
        .spyOn(
          (service as unknown as { logger: { warn: jest.Mock } }).logger,
          'warn',
        )
        .mockImplementation(() => undefined);
      (
        service as unknown as { configService: { get: jest.Mock } }
      ).configService.get.mockReturnValue({ isProduction: true });
      usersService.findByEmail.mockResolvedValue(buildUser() as never);

      await service.forgotPassword({ email: 'ana@correo.com' });

      const logged = warn.mock.calls.flat().join(' ');
      expect(logged).not.toContain('solo desarrollo');
      warn.mockRestore();
    });
  });

  describe('resetPassword', () => {
    const pendingToken = (overrides: Record<string, unknown> = {}) => ({
      id: 'prt_1',
      tokenHash: 'hash',
      userId: 'usr_1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      ...overrides,
    });

    it('actualiza la contraseña, consume el token y cierra sesiones', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(pendingToken());
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });

      await service.resetPassword('token-enclaro', 'NuevaClave123!');

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prt_1', usedAt: null },
          data: { usedAt: expect.any(Date) },
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        data: { passwordHash: expect.not.stringMatching('NuevaClave123!') },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('consume el token de forma atómica antes de cambiar la contraseña', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(pendingToken());
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });

      await service.resetPassword('token-enclaro', 'NuevaClave123!');

      const consumeOrder =
        prisma.passwordResetToken.updateMany.mock.invocationCallOrder[0];
      const passwordOrder = prisma.user.update.mock.invocationCallOrder[0];
      expect(consumeOrder).toBeLessThan(passwordOrder);
    });

    it('rechaza el token si otra petición lo consumió primero', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(pendingToken());
      // updateMany no encuentra la fila porque usedAt ya no es null: otra
      // petición concurrente se adelantó con el mismo token.
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.resetPassword('token-enclaro', 'NuevaClave123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('lanza 401 si el token ya estaba usado', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(
        pendingToken({ usedAt: new Date('2026-10-01T00:00:00Z') }),
      );

      await expect(
        service.resetPassword('token-enclaro', 'NuevaClave123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('lanza 401 con token expirado', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt_1',
        tokenHash: 'hash',
        userId: 'usr_1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.resetPassword('token-enclaro', 'NuevaClave123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('exige la contraseña actual correcta', async () => {
      const passwordHash = await bcrypt.hash('Meetflow123!', 10);
      usersService.findActiveById.mockResolvedValue(
        buildUser({ passwordHash }) as never,
      );

      await expect(
        service.changePassword('usr_1', 'incorrecta', 'NuevaClave123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(usersService.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('actualiza la contraseña y revoca las sesiones abiertas', async () => {
      const passwordHash = await bcrypt.hash('Meetflow123!', 10);
      usersService.findActiveById.mockResolvedValue(
        buildUser({ passwordHash }) as never,
      );

      await service.changePassword('usr_1', 'Meetflow123!', 'NuevaClave123!');

      expect(usersService.updatePasswordHash).toHaveBeenCalledWith(
        'usr_1',
        expect.not.stringMatching('NuevaClave123!'),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'usr_1', revokedAt: null },
        }),
      );
    });
  });
});
