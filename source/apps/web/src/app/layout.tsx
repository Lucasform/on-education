import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { PwaRegister } from '@/components/pwa-register';

import { ThemeProvider } from './theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Edu On Way',
  description:
    'Ensine com inteligência, do plano de aula ao boletim. A plataforma completa para professores e escolas, com o agente WayOn ao seu lado.',
  appleWebApp: { capable: true, title: 'Edu On Way', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#130f1f',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
