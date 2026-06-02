import { Button } from '@on-education/ui';
import {
  CalendarDays,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  Sparkles,
  Users,
} from 'lucide-react';

import { LandingMobileMenu } from '@/components/landing-mobile-menu';
import { PricingCards } from '@/components/pricing-cards';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV = [
  { label: 'Recursos', href: '#recursos' },
  { label: 'Planos', href: '#planos' },
  { label: 'Para escolas', href: '/signup/escola' },
];

const DESTAQUES = [
  {
    icon: Sparkles,
    titulo: 'EduON, seu agente',
    texto: 'Planos de aula, atividades e correções em segundos.',
  },
  {
    icon: Users,
    titulo: 'Turmas e alunos',
    texto: 'Cadastro, importação em lote e ficha completa.',
  },
  {
    icon: ClipboardCheck,
    titulo: 'Diário e boletim',
    texto: 'Chamada, notas e frequência sem planilha.',
  },
  {
    icon: FolderOpen,
    titulo: 'Simulados',
    texto: 'Questões de múltipla escolha com correção automática.',
  },
];

/** Nome do agente de ensino, com o "ON" em destaque no gradiente da marca. */
function EduON() {
  return (
    <span className="font-semibold">
      Edu
      <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
        ON
      </span>
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* barra de anúncio */}
      <div className="bg-gradient-to-r from-primary to-fuchsia-600 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
        ✨ Conheça o EduON, o agente que planeja, corrige e organiza com você.
      </div>

      {/* cabeçalho */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">On Way Education</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className="transition-colors hover:text-foreground">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href="/login" className="hidden sm:block">
            <Button size="sm" className="rounded-full px-5">
              Entrar
            </Button>
          </a>
          <LandingMobileMenu items={NAV} />
        </div>
      </header>

      {/* hero */}
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-primary/5 to-fuchsia-500/10 p-8 sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Conheça o <EduON />
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Ensine com inteligência.
                <br />
                <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                  Do plano de aula ao boletim.
                </span>
              </h1>
              <p className="mt-5 max-w-md text-balance text-muted-foreground">
                A plataforma completa para professores e escolas. O <EduON /> planeja, corrige e
                organiza ao seu lado, e você cuida do resto num só lugar.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="/signup">
                  <Button size="lg" className="rounded-full px-7">
                    Sou professor
                  </Button>
                </a>
                <a href="/signup/escola">
                  <Button size="lg" variant="outline" className="rounded-full px-7">
                    Sou escola
                  </Button>
                </a>
              </div>
            </div>

            {/* mock visual flutuante */}
            <div className="relative hidden lg:block">
              <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-xl backdrop-blur">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 text-white">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">Painel da turma</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { rotulo: 'Plano de aula', valor: 'EduON' },
                    { rotulo: 'Frequência', valor: '94%' },
                    { rotulo: 'Média geral', valor: '8,3' },
                    { rotulo: 'Simulados', valor: '12' },
                  ].map((c) => (
                    <div
                      key={c.rotulo}
                      className="rounded-xl border border-border bg-background/60 p-3"
                    >
                      <div className="text-xl font-semibold">{c.valor}</div>
                      <div className="text-[11px] text-muted-foreground">{c.rotulo}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -right-4 -top-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
                <CalendarDays className="h-4 w-4 text-primary" />
                Reunião de pais · 19h
              </div>
              <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
                <Sparkles className="h-4 w-4 text-fuchsia-500" />
                Atividade feita pelo EduON
              </div>
            </div>
          </div>
        </section>

        {/* faixa de destaques */}
        <section id="recursos" className="mt-12">
          <div className="grid gap-6 md:grid-cols-[1.2fr_2fr] md:items-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tudo o que a sala de aula precisa, num lugar só.
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {DESTAQUES.map((d) => (
                <div key={d.titulo} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <d.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-semibold">{d.titulo}</div>
                    <p className="text-sm text-muted-foreground">{d.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* planos */}
        <section id="planos" className="mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Planos para cada momento
            </h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Comece com 14 dias grátis e evolua quando precisar.
            </p>
          </div>
          <PricingCards />
        </section>

        {/* cta final */}
        <section className="mt-16 overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-fuchsia-600 px-8 py-12 text-center text-white sm:py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Comece hoje, sem complicação.</h2>
          <p className="mx-auto mt-2 max-w-md text-white/80">
            Crie sua conta em minutos ou leve o On Way Education para a sua escola.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/signup">
              <Button
                size="lg"
                className="rounded-full bg-white px-7 text-primary hover:bg-white/90"
              >
                Sou professor autônomo
              </Button>
            </a>
            <a href="/signup/escola">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-transparent px-7 text-white hover:bg-white/10"
              >
                Tenho uma escola
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-border px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <span>© 2026 On Way Education</span>
        <div className="flex items-center gap-5">
          <a href="/signup/escola" className="hover:text-foreground">
            Para escolas
          </a>
          <a href="/login" className="hover:text-foreground">
            Entrar
          </a>
        </div>
      </footer>
    </div>
  );
}
