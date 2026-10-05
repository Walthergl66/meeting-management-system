import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../users/users.service';
import { JwtPayload, JwtStrategy } from './jwt.strategy';

/**
 * JwtStrategy.validate recibe el payload ya decodificado por passport-jwt: aquí
 * se prueba la lógica de autorización del token, no la firma, que es territorio
 * de jsonwebtoken.
 */
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findActiveById: jest.Mock };

  const accessToken: JwtPayload = {
    sub: 'usr_1',
    email: 'a@b.c',
    type: 'access',
  };

  beforeEach(async () => {
    usersService = {
      findActiveById: jest.fn().mockResolvedValue({
        id: 'usr_1',
        email: 'a@b.c',
        name: 'Ada',
        timezone: 'Europe/Madrid',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'jwt'
                ? { secret: 'secreto-de-prueba-de-32-caracteres' }
                : undefined,
            ),
          },
        },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  it('resuelve el usuario a partir de un token de acceso válido', async () => {
    await expect(strategy.validate(accessToken)).resolves.toEqual({
      id: 'usr_1',
      email: 'a@b.c',
      name: 'Ada',
      timezone: 'Europe/Madrid',
    });
  });

  it('exige que el token sea de tipo access', async () => {
    // El claim existe para separar tipos de token. Hoy solo se emiten access,
    // pero si mañana se firma otro tipo con el mismo secreto, esta comprobación
    // es lo que evita que se acepte como credencial de API.
    await expect(
      strategy.validate({ ...accessToken, type: 'refresh' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('fija el algoritmo de verificación en HS256', () => {
    // passport-jwt guarda las opciones de verificación en _verifOpts y se las
    // pasa a jsonwebtoken. Sin `algorithms`, jsonwebtoken negocia el algoritmo
    // del header del token. Es estado interno a propósito: si la librería
    // cambia el nombre, el test falla en vez de dejar de comprobar nada.
    const verifOpts = (
      strategy as unknown as { _verifOpts?: { algorithms?: string[] } }
    )._verifOpts;

    expect(verifOpts?.algorithms).toEqual(['HS256']);
  });

  it('exige que el claim type esté presente', async () => {
    const { type, ...sinType } = accessToken;

    await expect(strategy.validate(sinType)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token sin subject', async () => {
    await expect(
      strategy.validate({ email: 'a@b.c', type: 'access' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('no consulta la base de datos si el token no es de acceso', async () => {
    await expect(
      strategy.validate({ ...accessToken, type: 'otro' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(usersService.findActiveById).not.toHaveBeenCalled();
  });

  it('falla la validación si el usuario ya no está activo', async () => {
    usersService.findActiveById.mockRejectedValue(
      new UnauthorizedException('Usuario no encontrado'),
    );

    await expect(strategy.validate(accessToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
