import { describe, expect, it } from 'vitest';
import type { SafeParseReturnType } from 'zod';
import { loginSchema, registerSchema } from '@/lib/shared/validation/auth';
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  timezoneSchema,
} from '@/lib/shared/validation/common';

/** Mensajes por defecto de Zod: si alguno aparece, la UI vuelve a estar en inglés. */
const ZOD_ENGLISH_DEFAULTS = [
  'String must contain at least 1 character(s)',
  'String must contain at least 3 character(s)',
  'String must contain at most 72 character(s)',
  'String must contain at most 120 character(s)',
  'String must contain at most 255 character(s)',
  'String must contain at most 64 character(s)',
];

function messagesOf(result: SafeParseReturnType<unknown, unknown>): string[] {
  if (result.success) {
    throw new Error('la validación debería fallar');
  }
  return result.error.issues.map((issue) => issue.message);
}

describe('mensajes de validación en español', () => {
  const failing = [
    emailSchema.safeParse('ab'),
    nameSchema.safeParse(''),
    passwordSchema.safeParse('corta'),
    passwordSchema.safeParse('x'.repeat(73)),
    timezoneSchema.safeParse(''),
    loginSchema.safeParse({ email: 'x@x.com', password: '' }),
    registerSchema.safeParse({
      email: 'ab',
      firstName: '',
      lastName: '',
      alias: '',
      phoneCountry: '',
      phoneNumber: '',
      phone: '',
      password: 'x',
      confirmPassword: '',
    }),
  ];

  it('ningún mensaje es el texto por defecto de Zod en inglés', () => {
    for (const result of failing) {
      for (const message of messagesOf(result)) {
        expect(ZOD_ENGLISH_DEFAULTS, `se produjo "${message}"`).not.toContain(message);
        expect(message).not.toMatch(/^String must/);
      }
    }
  });

  it('usa carteles en español para los campos de registro y login', () => {
    const register = messagesOf(
      registerSchema.safeParse({
        email: 'ab',
        firstName: '',
        lastName: '',
        alias: '',
        phoneCountry: '',
        phoneNumber: '',
        phone: '',
        password: 'x',
        confirmPassword: '',
      }),
    );
    expect(register).toContain('Debe tener al menos 3 caracteres');
    expect(register).toContain('El nombre es obligatorio');
    expect(register).toContain('El apellido es obligatorio');
    expect(register).toContain('El alias debe tener al menos 2 caracteres');
    expect(register).toContain('Selecciona el código de país');
    expect(register).toContain('El celular es obligatorio');
    expect(register).toContain('Mínimo 8 caracteres');
    expect(register).toContain('Confirma tu contraseña');

    const login = messagesOf(loginSchema.safeParse({ email: 'x@x.com', password: '' }));
    expect(login).toContain('La contraseña es obligatoria');
  });
});