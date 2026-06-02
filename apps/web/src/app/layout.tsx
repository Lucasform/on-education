import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ThemeProvider } from './theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'On Way Education',
  description:
    'Ensine com inteligência, do plano de aula ao boletim. A plataforma completa para professores e escolas, com o agente EduON ao seu lado.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
