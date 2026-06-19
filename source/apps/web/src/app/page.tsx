import { Button } from '@on-education/ui';
import {
  BarChart3,
  CalendarDays,
  Check,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  Layers,
  MessageSquare,
  Palette,
  School,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import { AudienceButtons } from '@/components/audience-buttons';
import { LandingMobileMenu } from '@/components/landing-mobile-menu';
import { LogoMark } from '@/components/logo-mark';
import { SplashScreen } from '@/components/splash-screen';
import { PricingCards } from '@/components/pricing-cards';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV = [
  { label: 'Recursos', href: '#recursos' },
  { label: 'Diferenciais', href: '#diferenciais' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Planos', href: '#planos' },
  { label: 'Para escolas', href: '/signup/escola' },
];

// Antes x depois: o contraste do dia a dia (sem a plataforma vs com a plataforma).
const ANTES = [
  'Diário no papel, notas espalhadas e planilhas soltas',
  'Horas montando plano de aula e prova do zero',
  'Comunicação com os pais perdida em grupos de WhatsApp',
  'Boletim e relatórios feitos na mão, um a um',
];
const DEPOIS = [
  'Turmas, diário, chamada, notas e boletim num lugar só',
  'O WayOn cria plano, atividade e correção em segundos',
  'Comunicação organizada e mural para os responsáveis',
  'Relatórios e PDFs prontos, no padrão da sua escola',
];

const DIFERENCIAIS = [
  {
    icon: Sparkles,
    titulo: 'WayOn ao seu lado',
    texto: 'IA que gera rascunhos de plano, atividade e correção. Você revisa e aprova, sempre no controle.',
  },
  {
    icon: Layers,
    titulo: 'Tudo integrado',
    texto: 'Do plano de aula ao boletim, sem ficar pulando entre planilhas e aplicativos.',
  },
  {
    icon: Palette,
    titulo: 'A sua marca',
    texto: 'Logo, cor e um link próprio (eduonway.com/c/sua-escola) para alunos e responsáveis.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Seguro e LGPD',
    texto: 'Cada escola isolada das demais, com proteção reforçada para os dados de menores.',
  },
];

const DESTAQUES = [
  {
    icon: Sparkles,
    titulo: 'WayOn, seu agente',
    texto: 'Planos de aula, atividades, provas e correções em segundos.',
  },
  {
    icon: Users,
    titulo: 'Turmas e alunos',
    texto: 'Cadastro, importação em lote por planilha e ficha completa.',
  },
  {
    icon: ClipboardCheck,
    titulo: 'Diário e boletim',
    texto: 'Chamada, notas e frequência sem planilha.',
  },
  {
    icon: FolderOpen,
    titulo: 'Banco e simulados',
    texto: 'Atividades reutilizáveis e provas com correção automática.',
  },
  {
    icon: MessageSquare,
    titulo: 'Comunicação',
    texto: 'Comunicados, mensagens e mural para os pais.',
  },
  {
    icon: BarChart3,
    titulo: 'Relatórios',
    texto: 'Painel da escola, alunos em risco e documentos em PDF.',
  },
];

const PASSOS = [
  {
    n: '1',
    titulo: 'Crie sua conta',
    texto: 'Professor em um minuto; escola com onboarding guiado e perfis de acesso.',
  },
  {
    n: '2',
    titulo: 'Cadastre turmas e alunos',
    texto: 'Crie na hora ou importe em lote por planilha (CSV/Excel).',
  },
  {
    n: '3',
    titulo: 'Deixe o WayOn trabalhar',
    texto: 'Planeje, corrija e acompanhe tudo num só lugar, no seu padrão.',
  },
];

const FAQ = [
  {
    q: 'Preciso de cartão para testar?',
    a: 'Não. Os planos de professor têm 7 dias grátis e sem fidelidade no mensal.',
  },
  {
    q: 'O WayOn substitui o professor?',
    a: 'Não. Ele gera rascunhos (plano, atividade, correção) que você revisa e aprova. Você no controle, sempre.',
  },
  {
    q: 'Funciona para a escola inteira?',
    a: 'Sim. A escola tem diretor, coordenação, secretaria e professores, com gestão, relatórios e comunicação com os responsáveis.',
  },
  {
    q: 'Meus dados estão seguros?',
    a: 'Sim. Cada escola fica isolada das demais e tratamos os dados seguindo a LGPD, com proteção reforçada para menores.',
  },
];

/** Nome do agente de ensino, com o "On" em destaque na cor da marca (amarra com On Way). */
function WayOn() {
  return (
    <span className="font-semibold">
      Way
      <span className="text-primary">On</span>
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SplashScreen />
      {/* barra de anúncio */}
      <div className="bg-primary px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
        ✨ Conheça o WayOn, o agente que planeja, corrige e organiza com você.
      </div>

      {/* cabeçalho */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-2">
          <LogoMark size={32} />
          <span className="text-lg font-bold tracking-tight">Edu On Way</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className="rounded transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline"
            >
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

      <main className="mx-auto max-w-6xl px-6 pb-20">
        {/* hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-primary/10 p-8 sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Conheça o <WayOn />
              </span>
              <h1 className="mt-5 text-pretty text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Ensine com inteligência.
                <br />
                <span className="text-primary">Do plano de aula ao boletim.</span>
              </h1>
              <p className="mt-5 max-w-md text-balance text-muted-foreground">
                A plataforma completa para professores e escolas. O <WayOn /> planeja, corrige e
                organiza ao seu lado, e você cuida do resto num só lugar.
              </p>
              <AudienceButtons variant="surface" />
            </div>

            {/* mock visual flutuante */}
            <div className="relative hidden lg:block">
              <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-xl backdrop-blur">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">Painel da turma</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { rotulo: 'Plano de aula', valor: 'WayOn' },
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
                <Sparkles className="h-4 w-4 text-primary" />
                Atividade feita pelo WayOn
              </div>
            </div>
          </div>
        </section>

        {/* recursos */}
        <section id="recursos" className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tudo o que a sala de aula precisa, num lugar só.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Do planejamento à comunicação com os pais, com o WayOn acelerando cada etapa.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DESTAQUES.map((d) => (
              <div
                key={d.titulo}
                className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <d.icon className="h-5 w-5" />
                </span>
                <div className="mt-4 font-semibold">{d.titulo}</div>
                <p className="mt-1 text-sm text-muted-foreground">{d.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* antes e depois */}
        <section className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Do caos à clareza</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              O que muda no seu dia a dia quando tudo vive num lugar só.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                Antes
              </span>
              <ul className="mt-5 space-y-3 text-sm">
                {ANTES.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-muted-foreground">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                      <X className="h-3.5 w-3.5" />
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                Com o Edu On Way
              </span>
              <ul className="mt-5 space-y-3 text-sm">
                {DEPOIS.map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* como funciona */}
        <section id="como-funciona" className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Como funciona</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Do cadastro ao dia a dia em três passos.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PASSOS.map((p) => (
              <div
                key={p.n}
                className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {p.n}
                </span>
                <div className="mt-4 font-semibold">{p.titulo}</div>
                <p className="mt-1 text-sm text-muted-foreground">{p.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* diferenciais */}
        <section
          id="diferenciais"
          className="mt-20 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-8 sm:p-12"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Por que o Edu On Way</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Os diferenciais que aparecem na rotina, não só no papel.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DIFERENCIAIS.map((d) => (
              <div
                key={d.titulo}
                className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur transition-colors hover:border-primary/40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <d.icon className="h-5 w-5" />
                </span>
                <div className="mt-4 font-semibold">{d.titulo}</div>
                <p className="mt-1 text-sm text-muted-foreground">{d.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* para quem */}
        <section className="mt-20 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-border bg-card p-8 transition-colors hover:border-primary/40">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserRound className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-xl font-bold">Para professores</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Seu espaço pessoal para organizar turmas e ganhar tempo com o WayOn.
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {[
                'WayOn: planos, atividades, provas e correção',
                'Banco de atividades e portfólio',
                'Diário, chamada, notas e boletim',
                'Comece grátis, evolua quando quiser',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <a href="/signup" className="mt-6">
              <Button className="w-full rounded-full">Testar grátis</Button>
            </a>
          </div>

          <div className="flex flex-col rounded-3xl border border-border bg-card p-8 transition-colors hover:border-primary/40">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <School className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-xl font-bold">Para escolas</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestão completa, com perfis de acesso e visão de direção.
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {[
                'Diretor, coordenação, secretaria e professores',
                'Turmas, disciplinas, diário e boletim',
                'Relatórios de direção, ocorrências e responsáveis',
                'Onboarding e suporte dedicado',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <a href="/signup/escola" className="mt-6">
              <Button variant="outline" className="w-full rounded-full">
                Falar com a gente
              </Button>
            </a>
          </div>
        </section>

        {/* planos */}
        <section id="planos" className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Planos para cada momento
            </h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Comece com 7 dias grátis e evolua quando precisar.
            </p>
          </div>
          <PricingCards />
        </section>

        {/* faq */}
        <section className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Perguntas frequentes</h2>
          </div>
          <div className="mx-auto mt-8 max-w-3xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {FAQ.map((f) => (
              <details key={f.q} className="group p-5 [&_summary]:cursor-pointer">
                <summary className="flex select-none items-center justify-between gap-3 rounded font-medium outline-none marker:content-[''] focus-visible:text-foreground focus-visible:underline">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* cta final */}
        <section className="mt-20 overflow-hidden rounded-3xl bg-primary px-8 py-12 text-center text-white sm:py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Comece hoje, sem complicação.</h2>
          <p className="mx-auto mt-2 max-w-md text-white/80">
            Crie sua conta em minutos ou leve o Edu On Way para a sua escola.
          </p>
          <AudienceButtons />
        </section>
      </main>

      <footer className="mx-auto max-w-6xl border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        © 2026 Edu On Way
      </footer>
    </div>
  );
}
