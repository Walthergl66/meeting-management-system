import { shouldServeSwagger } from './swagger';

describe('shouldServeSwagger', () => {
  it('sirve la documentación fuera de producción', () => {
    expect(shouldServeSwagger(false, undefined)).toBe(true);
    expect(shouldServeSwagger(false, 'false')).toBe(true);
  });

  it('no sirve la documentación en producción por defecto', () => {
    // Publicarla en producción expone endpoints, esquemas y nombres de
    // entidades a cualquiera que alcance la API.
    expect(shouldServeSwagger(true, undefined)).toBe(false);
    expect(shouldServeSwagger(true, 'false')).toBe(false);
    expect(shouldServeSwagger(true, '')).toBe(false);
  });

  it('permite forzarla en producción de forma explícita', () => {
    expect(shouldServeSwagger(true, 'true')).toBe(true);
    expect(shouldServeSwagger(true, 'TRUE')).toBe(true);
    expect(shouldServeSwagger(true, ' true ')).toBe(true);
  });

  it('no interpreta cualquier valor distinto de true como activación', () => {
    expect(shouldServeSwagger(true, '1')).toBe(false);
    expect(shouldServeSwagger(true, 'yes')).toBe(false);
    expect(shouldServeSwagger(true, 'sí')).toBe(false);
  });
});
