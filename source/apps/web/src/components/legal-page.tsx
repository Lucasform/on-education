import Link from 'next/link';
import type { ReactNode } from 'react';

import { LogoMark } from '@/components/logo-mark';

/** Casca das páginas legais (Privacidade, Termos): cabeçalho com logo, conteúdo em prosa e rodapé. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="font-semibold">Edu On Way</span>
        </Link>
        <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Início
        </Link>
      </header>

      <article className="mx-auto max-w-2xl space-y-4 px-6 pb-16 pt-2 [&_a]:text-primary [&_a]:underline [&>h2]:mt-8 [&>h2]:text-base [&>h2]:font-semibold [&>h2]:text-foreground [&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-muted-foreground [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-5 [&>ul]:text-sm [&>ul]:text-muted-foreground">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="!text-xs">Última atualização: {updated}</p>
        {children}
      </article>

      <footer className="mx-auto max-w-2xl border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/termos" className="hover:text-foreground">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="hover:text-foreground">
            Política de Privacidade
          </Link>
        </div>
        <p className="mt-3">© 2026 Edu On Way</p>
      </footer>
    </div>
  );
}
