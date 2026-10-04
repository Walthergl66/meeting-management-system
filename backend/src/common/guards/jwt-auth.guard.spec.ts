import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  // El guard hereda de la cadena que construye AuthGuard('jwt') en
  // @nestjs/passport. Ese canActivate real, que sí habla con la estrategia,
  // vive en un ancestro de profundidad variable según la versión, así que se
  // localiza recorriendo el prototipo en vez de fijarla a mano.
  const passportCanActivate = () => {
    let proto: object = Object.getPrototypeOf(JwtAuthGuard.prototype);

    while (proto && proto !== Object.prototype) {
      if (Object.prototype.hasOwnProperty.call(proto, 'canActivate')) {
        return proto;
      }
      proto = Object.getPrototypeOf(proto);
    }

    throw new Error('no se encontró el canActivate de passport');
  };

  let spies: jest.SpyInstance[] = [];

  // El canActivate real vive en el prototipo, que es compartido: si el espía
  // se queda puesto, cada test vería las llamadas de los anteriores.
  const spyOnPassport = (result?: unknown) => {
    const spy = jest.spyOn(
      passportCanActivate() as { canActivate: () => unknown },
      'canActivate',
    );

    if (result !== undefined) {
      spy.mockReturnValue(result);
    }

    spies.push(spy);
    return spy;
  };

  const context = () =>
    ({
      getHandler: () => 'handler',
      getClass: () => 'class',
    }) as unknown as ExecutionContext;

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore());
    spies = [];
  });

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, { provide: Reflector, useValue: reflector }],
    }).compile();

    guard = moduleFixture.get(JwtAuthGuard);
  });

  it('deja pasar las rutas públicas sin tocar passport', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const spy = jest.spyOn(
      passportCanActivate() as { canActivate: () => unknown },
      'canActivate',
    );

    expect(guard.canActivate(context())).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('delega en passport cuando la ruta no es pública', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const spy = spyOnPassport(false);

    expect(guard.canActivate(context())).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('propaga el resultado de passport sin alterarlo', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const spy = spyOnPassport(true);

    expect(guard.canActivate(context())).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('lee el metadato desde el handler y la clase', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    guard.canActivate(context());

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      expect.any(String),
      ['handler', 'class'],
    );
  });
});
