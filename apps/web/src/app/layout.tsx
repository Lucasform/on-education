import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ThemeProvider } from './theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'On Education',
  description: 'SaaS educacional multi-tenant (escola e professor autônomo).',
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
