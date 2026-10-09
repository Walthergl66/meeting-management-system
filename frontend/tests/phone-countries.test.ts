import { describe, expect, it } from 'vitest';
import {
  defaultPhoneCountry,
  PHONE_COUNTRIES,
} from '@/lib/shared/phone-countries';

describe('catálogo de países telefónicos', () => {
  it('deriva la bandera desde el código ISO', () => {
    expect(PHONE_COUNTRIES.find((c) => c.iso === 'MX')?.flag).toBe('🇲🇽');
    expect(PHONE_COUNTRIES.find((c) => c.iso === 'ES')?.flag).toBe('🇪🇸');
    expect(PHONE_COUNTRIES.find((c) => c.iso === 'AR')?.flag).toBe('🇦🇷');
  });

  it('expone un prefijo E.164 válido y único por ISO', () => {
    for (const country of PHONE_COUNTRIES) {
      expect(country.code).toMatch(/^\+[1-9]\d{0,3}$/);
    }
    const isos = PHONE_COUNTRIES.map((c) => c.iso);
    expect(new Set(isos).size).toBe(isos.length);
  });

  it('detecta el prefijo desde el locale y cae al fallback', () => {
    expect(defaultPhoneCountry('es-MX')).toBe('+52');
    expect(defaultPhoneCountry('es-ES')).toBe('+34');
    expect(defaultPhoneCountry('en-US')).toBe('+1');
    expect(defaultPhoneCountry('pt-BR')).toBe('+55');
    expect(defaultPhoneCountry('es-EC')).toBe('+593');
    expect(defaultPhoneCountry('xx-XX')).toBe('+593');
  });
});