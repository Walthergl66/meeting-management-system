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
  .min(3)
  .max(255)
  .email('Debe ser un correo electrónico válido')
  .transform((value) => value.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(AUTH.PASSWORD_MIN_LENGTH, `Mínimo ${AUTH.PASSWORD_MIN_LENGTH} caracteres`)
  .max(AUTH.PASSWORD_MAX_LENGTH);

export const nameSchema = z
  .string()
  .min(1)
  .max(120)
  .transform((value) => value.trim());

export const idSchema = z.string().min(1).max(64);

export const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
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
