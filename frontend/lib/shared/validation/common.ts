import { PAGINATION, AUTH } from '../constants';
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
});

export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const emailSchema = z
  .string()
  .min(3, 'Debe tener al menos 3 caracteres')
  .max(255, 'Máximo 255 caracteres')
  .email('Debe ser un correo electrónico válido')
  .transform((value) => value.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(AUTH.PASSWORD_MIN_LENGTH, `Mínimo ${AUTH.PASSWORD_MIN_LENGTH} caracteres`)
  .max(AUTH.PASSWORD_MAX_LENGTH, `Máximo ${AUTH.PASSWORD_MAX_LENGTH} caracteres`);

export const nameSchema = z
  .string()
  .min(1, 'El nombre es obligatorio')
  .max(120, 'Máximo 120 caracteres')
  .transform((value) => value.trim());

export const firstNameSchema = z
  .string()
  .min(1, 'El nombre es obligatorio')
  .max(60, 'Máximo 60 caracteres')
  .transform((value) => value.trim());

export const lastNameSchema = z
  .string()
  .min(1, 'El apellido es obligatorio')
  .max(60, 'Máximo 60 caracteres')
  .transform((value) => value.trim());

export const aliasSchema = z
  .string()
  .min(2, 'El alias debe tener al menos 2 caracteres')
  .max(30, 'El alias no puede superar los 30 caracteres')
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    'El alias solo puede contener letras, números y los símbolos . _ -',
  )
  .transform((value) => value.trim().toLowerCase());

export const phoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .refine((value) => value.length > 0, 'El celular es obligatorio')
  .refine(
    (value) => /^\+[1-9]\d{1,14}$/.test(value),
    'Ingresa un celular en formato E.164, por ejemplo +521234567890',
  );

export const idSchema = z
  .string()
  .min(1, 'El identificador es obligatorio')
  .max(64, 'Máximo 64 caracteres');

export const timezoneSchema = z
  .string()
  .min(1, 'La zona horaria es obligatoria')
  .max(64, 'Máximo 64 caracteres')
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Zona horaria IANA inválida' },
  );

export const cuidSchema = z.string().regex(/^c[a-z0-9]{20,}$/, 'Identificador inválido');
