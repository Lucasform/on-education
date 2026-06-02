import { Button } from '@on-education/ui';

import { ThemeToggle } from '@/components/theme-toggle';

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* brilho de fundo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <header className="mx-auto flex max-w-5xl items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-fuchsia-500" />
          <span className="font-semibold">On Education</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/login">
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
          </a>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Ensine com mais tempo para o que importa.
        </h1>

        <div className="flex flex-col gap-3 sm:flex-row">
          <a href="/signup">
            <Button size="lg">Começar grátis como professor</Button>
          </a>
          <a href="/signup/escola">
            <Button size="lg" variant="outline">
              Sou escola
            </Button>
          </a>
        </div>

        <a
          href="/admin"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Acessar painel admin
        </a>
      </main>
    </div>
  );
}
