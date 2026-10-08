import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { PWARegister } from '../components/pwa-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'MeetFlow',
  description: 'Plataforma profesional de gestión de reuniones',
  manifest: '/manifest.json',
  // La app está 100 % en español: evita que el traductor del navegador
  // detecte mal el idioma en pantallas con poco texto y corrompa la UI.
  other: { google: 'notranslate' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#65a30d',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" translate="no">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
        <PWARegister />
      </body>
    </html>
  );
}
