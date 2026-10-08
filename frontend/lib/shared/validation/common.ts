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
