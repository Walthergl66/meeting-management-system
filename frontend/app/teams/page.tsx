'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { teamsApi, TeamPresented } from '@/lib/api/entities';
import { useRequireSession } from '@/lib/auth/use-session';
import { AppShell } from '@/components/app-shell';
import { TEAM_ROLE_LABELS } from '@/lib/utils/labels';

const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre del equipo es obligatorio')
    .max(120, 'Máximo 120 caracteres'),
  description: z.string().trim().max(500).optional(),
});
type CreateTeamInput = z.infer<typeof createTeamSchema>;

export default function TeamsPage() {
  const session = useRequireSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const teams = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
    enabled: Boolean(session.data?.user),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
  });

  const create = useMutation({
    mutationFn: (values: CreateTeamInput) =>
      teamsApi.create({
        name: values.name,
        description: values.description || undefined,
      }),
    onSuccess: (created: TeamPresented) => {
      setError(null);
      reset();
      queryClient.setQueryData<TeamPresented[]>(['teams'], (current) => [
        ...(current ?? []),
        created,
      ]);
    },
    onError: (err) => setError((err as Error).message),
  });

  if (session.isPending || teams.isPending) {
    return <p className="text-sm text-slate-500">Cargando…</p>;
  }

  if (teams.isError) {
    return (
      <p className="text-sm text-red-600">{(teams.error as Error).message}</p>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Equipos</h1>
      </div>

      <form
        onSubmit={handleSubmit((values) => create.mutate(values))}
        className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4"
        noValidate
      >
        <h2 className="text-sm font-medium text-slate-700">Nuevo equipo</h2>
        <div className="flex flex-col gap-1">
          <input
            type="text"
            placeholder="Nombre del equipo"
            {...register('name')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.name && (
            <span className="text-xs text-red-600">{errors.name.message}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input
            type="text"
            placeholder="Descripción (opcional)"
            {...register('description')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.description && (
            <span className="text-xs text-red-600">
              {errors.description.message}
            </span>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={create.isPending}
          className="w-fit rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {create.isPending ? 'Creando…' : 'Crear equipo'}
        </button>
      </form>

      {teams.data?.length === 0 && (
        <p className="text-sm text-slate-500">
          Aún no perteneces a ningún equipo. Crea uno para empezar.
        </p>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {teams.data?.map((team) => (
          <li
            key={team.id}
            className="flex flex-col gap-1 rounded-md border border-slate-200 bg-white p-4"
          >
            <span className="font-medium">{team.name}</span>
            {team.description && (
              <span className="text-sm text-slate-500">{team.description}</span>
            )}
            <span className="text-xs text-slate-400">
              {team.memberCount} miembro{team.memberCount === 1 ? '' : 's'} ·{' '}
              {TEAM_ROLE_LABELS[team.role]}
            </span>
          </li>
        ))}
      </ul>
      </div>
    </AppShell>
  );
}