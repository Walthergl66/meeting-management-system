import { buildSecurityHeadersOptions, resolveTrustProxy } from './security';

describe('buildSecurityHeadersOptions', () => {
  it('desactiva CSP y COEP, que romperían Swagger UI', () => {
    const options = buildSecurityHeadersOptions();

    expect(options.contentSecurityPolicy).toBe(false);
    expect(options.crossOriginEmbedderPolicy).toBe(false);
  });

  it('no desactiva el resto de cabeceras de helmet', () => {
    const options = buildSecurityHeadersOptions();

    expect(options).not.toHaveProperty('strictTransportSecurity', false);
    expect(options).not.toHaveProperty('xFrameOptions', false);
    expect(options).not.toHaveProperty('noSniff', false);
  });
});

describe('resolveTrustProxy', () => {
  it('no confía en cabeceras de reenvío si el entorno no dice nada', () => {
    expect(resolveTrustProxy(undefined)).toBe(false);
    expect(resolveTrustProxy('')).toBe(false);
    expect(resolveTrustProxy('   ')).toBe(false);
  });

  it('acepta el literal true para un único proxy', () => {
    expect(resolveTrustProxy('true')).toBe(true);
    expect(resolveTrustProxy('TRUE')).toBe(true);
    expect(resolveTrustProxy(true)).toBe(true);
  });

  it('acepta el número de saltos de confianza', () => {
    expect(resolveTrustProxy('2')).toBe(2);
    expect(resolveTrustProxy(2)).toBe(2);
  });

  it('acepta el literal false', () => {
    expect(resolveTrustProxy('false')).toBe(false);
    expect(resolveTrustProxy(false)).toBe(false);
  });

  it('cae en false ante un valor inservible, en lugar de confiar de más', () => {
    // Confiar en un valor mal escrito expondría la IP del cliente a spoofing.
    expect(resolveTrustProxy('todos')).toBe(false);
    expect(resolveTrustProxy('0')).toBe(false);
    expect(resolveTrustProxy('-1')).toBe(false);
    expect(resolveTrustProxy('1.5')).toBe(false);
  });
});
