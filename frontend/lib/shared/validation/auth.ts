import { z } from 'zod';
import {
  aliasSchema,
  emailSchema,
  firstNameSchema,
  lastNameSchema,
  passwordSchema,
  phoneSchema,
  timezoneSchema,
} from './common';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    alias: aliasSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    timezone: timezoneSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El token es obligatorio').optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'El token es obligatorio'),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  firstName: firstNameSchema.optional(),
  lastName: lastNameSchema.optional(),
  alias: aliasSchema.optional(),
  phone: phoneSchema.optional(),
  timezone: timezoneSchema.optional(),
  locale: z.enum(['es', 'en']).optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;