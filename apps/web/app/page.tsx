import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">MeetFlow</h1>
        <p className="text-slate-600">
          Plataforma profesional de gestión de reuniones.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Crear cuenta
        </Link>
      </div>

      <p className="text-xs text-slate-400">
        FASE 1 · Infraestructura base
      </p>
    </main>
  );
}
