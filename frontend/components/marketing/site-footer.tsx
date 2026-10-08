import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 py-12 text-center sm:px-6 md:flex-row md:text-left lg:px-10">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Logo size="sm" />
          <p className="text-sm text-slate-500">
            Plataforma profesional de gestión de reuniones.
          </p>
        </div>

        <div className="flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="/login" className="transition-colors hover:text-slate-900">
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="transition-colors hover:text-slate-900"
          >
            Crear cuenta
          </Link>
        </div>

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} MeetFlow
        </p>
      </div>
    </footer>
  );
}