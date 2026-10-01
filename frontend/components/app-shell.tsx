'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/auth/use-session';
import { notificationsApi } from '@/lib/api/entities';

function NotificationsBell() {
  const session = useSession();

  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    enabled: Boolean(session.data?.user),
  });

  const unread = (notifications.data ?? []).filter((item) => !item.read).length;

  return (
    <Link
      href="/notifications"
      className="relative flex items-center gap-1 text-slate-600 hover:text-slate-900"
      aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ''}`}
    >
      <span aria-hidden="true">🔔</span>
      {unread > 0 && (
        <span className="rounded-full bg-red-600 px-1.5 text-xs font-medium text-white">
          {unread}
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useSession();

  const handleLogout = () => {
    sessionStorage.removeItem('meetflow.access_token');
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/meetings" className="text-lg font-semibold tracking-tight">
            MeetFlow
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/meetings" className="text-slate-600 hover:text-slate-900">
              Reuniones
            </Link>
            <Link href="/tasks" className="text-slate-600 hover:text-slate-900">
              Tareas
            </Link>
            <Link href="/teams" className="text-slate-600 hover:text-slate-900">
              Equipos
            </Link>
            <NotificationsBell />
            {session.data?.user && (
              <span className="text-slate-400">
                {session.data.user.name}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-500 hover:text-slate-900"
            >
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}