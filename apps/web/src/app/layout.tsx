import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { PwaRegister } from '@/components/pwa-register';

import { ThemeProvider } from './theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'On Way Education',
  description:
    'Ensine com inteligência, do plano de aula ao boletim. A plataforma completa para professores e escolas, com o agente EduON ao seu lado.',
  appleWebApp: { capable: true, title: 'On Way Edu', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
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
