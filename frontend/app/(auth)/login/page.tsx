'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { loginSchema, LoginInput } from '@/lib/shared/validation';
import { authApi } from '@/lib/api/entities';
import { tokenStore } from '@/lib/auth/token-store';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: ({ email, password }: LoginInput) =>
      authApi.login(email, password),
    onSuccess: (session) => {
      tokenStore.set(session.tokens.accessToken);
      router.replace('/meetings');
    },
  });

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Inicia sesión
        </h1>
        <p className="text-sm text-slate-600">
          Accede a tu espacio de reuniones.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="mt-8 flex flex-col gap-5"
        noValidate
      >
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
          label="Contraseña"
          htmlFor="password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
            {...register('password')}
          />
        </FormField>

        {mutation.isError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {(mutation.error as Error).message}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          isLoading={mutation.isPending}
          className="w-full"
        >
          Iniciar sesión
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        ¿No tienes cuenta?{' '}
        <Link
          href="/register"
          className="font-medium text-brand-600 hover:underline"
        >
          Crea una gratis
        </Link>
      </p>
    </>
  );
}