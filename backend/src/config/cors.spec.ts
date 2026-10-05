import { resolveCorsOrigins } from './cors';

describe('resolveCorsOrigins', () => {
  it('devuelve los orígenes declarados, sin espacios sobrantes', () => {
    const origins = resolveCorsOrigins(
      [' https://app.ejemplo.com ', 'https://admin.ejemplo.com'],
      true,
    );

    expect(origins).toEqual([
      'https://app.ejemplo.com',
      'https://admin.ejemplo.com',
    ]);
  });

  it('rechaza el comodín porque la API responde con credenciales', () => {
    expect(() => resolveCorsOrigins(['*'], true)).toThrow(
      /no admite el comodín/,
    );
  });

  it('rechaza el comodín aunque venga acompañado de orígenes válidos', () => {
    expect(() =>
      resolveCorsOrigins(['https://app.ejemplo.com', '*'], true),
    ).toThrow(/no admite el comodín/);
  });

  it('impide arrancar en producción sin orígenes declarados', () => {
    expect(() => resolveCorsOrigins([], true)).toThrow(
      /CORS_ORIGINS es obligatorio en producción/,
    );
  });

  it('descarta entradas vacías antes de decidir', () => {
    expect(() => resolveCorsOrigins(['', '  '], true)).toThrow(
      /CORS_ORIGINS es obligatorio en producción/,
    );
  });

  it('en desarrollo cae en el origen local en lugar de reflejar cualquiera', () => {
    expect(resolveCorsOrigins([], false)).toEqual(['http://localhost:3001']);
  });

  it('en desarrollo también rechaza el comodín', () => {
    expect(() => resolveCorsOrigins(['*'], false)).toThrow(
      /no admite el comodín/,
    );
  });
});
