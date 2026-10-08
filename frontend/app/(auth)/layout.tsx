import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-12 lg:flex">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-brand-400/20 blur-2xl"
        />

        <Link href="/" aria-label="MeetFlow — Inicio" className="relative">
          <Logo tone="inverse" />
        </Link>

        <div className="relative max-w-md">
          <blockquote className="text-2xl font-medium leading-snug text-white">
            «MeetFlow nos quitó el caos de las reuniones: cada una termina con
            agenda, decisiones y tareas claras.»
          </blockquote>
          <p className="mt-4 text-sm text-brand-100">
            Equipo de Producto · MeetFlow
          </p>
        </div>

        <p className="relative text-xs text-brand-100/70">
          © {new Date().getFullYear()} MeetFlow
        </p>
      </aside>

      <main className="flex w-full items-center justify-center px-6 pb-16 pt-12 lg:w-1/2">
        <div className="flex w-full max-w-sm flex-col">
          <Link
            href="/"
            aria-label="MeetFlow — Inicio"
            className="mb-10 lg:hidden"
          >
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}