import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import { PwaRegister } from '@/components/pwa-register';
import { RouteProgress } from '@/components/route-progress';

import { ThemeProvider } from './theme-provider';
import './globals.css';

// Tipografia oficial da marca Edu On Way.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Edu On Way',
  description:
    'Ensine com inteligência, do plano de aula ao boletim. A plataforma completa para professores e escolas, com o agente WayOn ao seu lado.',
  appleWebApp: { capable: true, title: 'Edu On Way', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#13152E',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={jakarta.className}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <RouteProgress />
        <ThemeProvider>{children}</ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
