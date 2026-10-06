import { validateEnv } from './env.validation';

/** Base mínima válida: lo que un .env real siempre trae. */
const base = (extra: Record<string, unknown> = {}) => ({
  DATABASE_URL: 'postgresql://meetflow:meetflow@localhost:5432/meetflow',
  JWT_SECRET: 'secreto-de-prueba-de-32-caracteres-minimo',
  ...extra,
});

describe('validateEnv', () => {
  it('acepta una configuración mínima', () => {
    expect(validateEnv(base())).toMatchObject({ NODE_ENV: 'development' });
  });

  it('rechaza una configuración sin las variables obligatorias', () => {
    expect(() => validateEnv({})).toThrow(/Configuración de entorno inválida/);
  });

  describe('TRUST_PROXY', () => {
    // El compose lo pasa siempre con ${TRUST_PROXY:-}, así que llega vacío en
    // cuanto no se configura. Antes esto reventaba el arranque del stack.
    it('acepta la cadena vacía como "sin proxy"', () => {
      expect(validateEnv(base({ TRUST_PROXY: '' }))).toMatchObject({
        TRUST_PROXY: '',
      });
    });

    it('acepta el literal true y el número de saltos', () => {
      expect(validateEnv(base({ TRUST_PROXY: 'true' }))).toMatchObject({
        TRUST_PROXY: true,
      });
      expect(validateEnv(base({ TRUST_PROXY: '2' }))).toMatchObject({
        TRUST_PROXY: 2,
      });
    });

    it('rechaza un valor que no sea boolean ni número de saltos', () => {
      expect(() => validateEnv(base({ TRUST_PROXY: 'todos' }))).toThrow(
        /TRUST_PROXY/,
      );
      expect(() => validateEnv(base({ TRUST_PROXY: '0' }))).toThrow(
        /TRUST_PROXY/,
      );
    });
  });

  describe('REFRESH_TOKEN_SECRET', () => {
    // Ya no protege nada: los refresh tokens se guardan hasheados. Se admite si
    // existe para no romper despliegues antiguos, pero no se exige.
    it('no se exige y se tolera vacío o ausente', () => {
      expect(validateEnv(base())).not.toHaveProperty('REFRESH_TOKEN_SECRET');
      expect(validateEnv(base({ REFRESH_TOKEN_SECRET: '' }))).toMatchObject({
        REFRESH_TOKEN_SECRET: '',
      });
      expect(
        validateEnv(base({ REFRESH_TOKEN_SECRET: 'resto-antiguo' })),
      ).toMatchObject({ REFRESH_TOKEN_SECRET: 'resto-antiguo' });
    });
  });

  describe('JWT_SECRET', () => {
    it('exige un secreto de 16 caracteres como mínimo', () => {
      expect(() => validateEnv(base({ JWT_SECRET: 'corto' }))).toThrow(
        /JWT_SECRET/,
      );
      expect(() =>
        validateEnv(base({ DATABASE_URL: 'mysql://localhost/x' })),
      ).toThrow(/DATABASE_URL/);
    });
  });
});
