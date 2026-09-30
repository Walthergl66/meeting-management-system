'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { registerSchema, RegisterInput } from '@meetflow/validation';
import { authApi } from '@/lib/api/entities';
import { tokenStore } from '@/lib/auth/token-store';

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: RegisterInput) => authApi.register(values as any),
    onSuccess: (session) => {
      tokenStore.set(session.tokens.accessToken);
      router.replace('/meetings');
    },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">MeetFlow</h1>
        <p className="text-slate-600">Crea tu cuenta para gestionar reuniones.</p>
      </div>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
        noValidate
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Nombre</span>
          <input
            type="text"
            {...register('name')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.name && (
            <span className="text-xs text-red-600">{errors.name.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Correo</span>
          <input
            type="email"
            {...register('email')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.email && (
            <span className="text-xs text-red-600">{errors.email.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            Contraseña
          </span>
          <input
            type="password"
            {...register('password')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.password && (
            <span className="text-xs text-red-600">
              {errors.password.message}
            </span>
          )}
        </label>

        {mutation.isError && (
          <p className="text-sm text-red-600">
            {(mutation.error as Error).message}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-brand-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}