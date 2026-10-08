'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { registerSchema, RegisterInput } from '@/lib/shared/validation';
import { authApi } from '@/lib/api/entities';
import { tokenStore } from '@/lib/auth/token-store';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrength } from '@/components/ui/password-strength';

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const password = watch('password');

  const mutation = useMutation({
    mutationFn: (values: RegisterInput) =>
      authApi.register({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        alias: values.alias,
        phone: values.phone,
        password: values.password,
        timezone: values.timezone,
      }),
    onSuccess: (session) => {
      tokenStore.set(session.tokens.accessToken);
      router.replace('/');
    },
  });

  return (
    <div className="flex flex-col gap-2 animate-fade-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Crea tu cuenta
        </h1>
        <p className="text-sm text-slate-600">
          Empieza a gestionar tus reuniones en minutos.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="mt-8 flex flex-col gap-5"
        noValidate
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nombre" htmlFor="firstName" error={errors.firstName?.message}>
            <Input
              id="firstName"
              type="text"
              autoComplete="given-name"
              autoFocus
              placeholder="Ana"
              invalid={Boolean(errors.firstName)}
              {...register('firstName')}
            />
          </FormField>

          <FormField label="Apellido" htmlFor="lastName" error={errors.lastName?.message}>
            <Input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="García"
              invalid={Boolean(errors.lastName)}
              {...register('lastName')}
            />
          </FormField>
        </div>

        <FormField
          label="Alias"
          htmlFor="alias"
          error={errors.alias?.message}
          hint="Único en MeetFlow"
        >
          <Input
            id="alias"
            type="text"
            autoComplete="nickname"
            placeholder="ana_garcia"
            invalid={Boolean(errors.alias)}
            {...register('alias')}
          />
        </FormField>

        <FormField label="Correo" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@empresa.com"
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </FormField>

        

        <FormField
          label="Celular"
          htmlFor="phone"
          error={errors.phone?.message}
          hint="Con código de país, por ejemplo +52 1234 5678"
        >
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+52 1 234 567 890"
            invalid={Boolean(errors.phone)}
            {...register('phone')}
          />
        </FormField>

        <FormField
          label="Contraseña"
          htmlFor="password"
          error={errors.password?.message}
          hint="Mínimo 8 caracteres."
        >
          <div className="flex flex-col gap-2.5">
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="••••••••"
              invalid={Boolean(errors.password)}
              {...register('password')}
            />
            <PasswordStrength password={password ?? ''} />
          </div>
        </FormField>

        <FormField
          label="Confirmar contraseña"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
        </FormField>

        {mutation.isError && (
          <FormAlert title="No pudimos crear tu cuenta">
            {(mutation.error as Error).message}
          </FormAlert>
        )}

        <Button
          type="submit"
          size="lg"
          isLoading={mutation.isPending}
          className="w-full"
        >
          Crear cuenta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="font-medium text-brand-600 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}