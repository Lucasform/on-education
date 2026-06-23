import { Button } from '@on-education/ui';
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  HeartHandshake,
  Layers,
  MessageSquare,
  Palette,
  School,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';

import { AudienceButtons } from '@/components/audience-buttons';
import { LandingMobileMenu } from '@/components/landing-mobile-menu';
import { LogoMark } from '@/components/logo-mark';
import { PricingCards } from '@/components/pricing-cards';
import { Reveal } from '@/components/reveal';
import { SplashScreen } from '@/components/splash-screen';
import { ThemeToggle } from '@/components/theme-toggle';
import { WayonChat } from '@/components/wayon-chat';

const NAV = [
  { label: 'Plataforma', href: '#modulos' },
  { label: 'Família e escola', href: '#familia' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Planos', href: '#planos' },
  { label: 'Para escolas', href: '/signup/escola' },
];

const NUMEROS = [
  { n: '8', l: 'módulos integrados' },
  { n: '7 dias', l: 'grátis, sem cartão' },
  { n: '3', l: 'passos para começar' },
  { n: '100%', l: 'LGPD, dados seguros' },
];

const AUDIENCIAS = [
  {
    icon: GraduationCap,
    titulo: 'Para alunos',
    texto: 'Atividades, notas e materiais num lugar simples de acessar.',
  },
  {
    icon: UserRound,
    titulo: 'Para professores',
    texto: 'Planeje e corrija em segundos com o WayOn e ganhe tempo.',
  },
  {
    icon: School,
    titulo: 'Para gestores',
    texto: 'Visão da escola, relatórios e perfis de acesso por função.',
  },
  {
    icon: HeartHandshake,
    titulo: 'Para famílias',
    texto: 'Acompanham notas, frequência e recados em tempo real.',
  },
];

const MODULOS = [
  {
    icon: Sparkles,
    titulo: 'WayOn, seu agente',
    texto: 'Planos de aula, atividades, provas e correções em segundos. Você revisa e aprova.',
  },
  {
    icon: Users,
    titulo: 'Turmas e alunos',
    texto: 'Cadastro, importação em lote por planilha e ficha completa do aluno.',
  },
  {
    icon: ClipboardCheck,
    titulo: 'Diário e boletim',
    texto: 'Chamada, notas e frequência sem planilha, com boletim no seu padrão.',
  },
  {
    icon: FolderOpen,
    titulo: 'Banco e simulados',
    texto: 'Atividades reutilizáveis e provas com correção automática.',
  },
  {
    icon: MessageSquare,
    titulo: 'Comunicação com a família',
    texto: 'Comunicados, mensagens e mural para os pais acompanharem de perto.',
  },
  {
    icon: Wallet,
    titulo: 'Financeiro',
    texto: 'Mensalidades e cobranças por aluno, com visão clara do que entra.',
  },
  {
    icon: School,
    titulo: 'Secretaria e matrícula',
    texto: 'Matrícula, responsáveis e documentos da turma organizados num lugar só.',
  },
  {
    icon: BarChart3,
    titulo: 'Relatórios e direção',
    texto: 'Painel da escola, alunos em risco e documentos em PDF.',
  },
];

const FAMILIA = [
  'Mural e comunicados no lugar dos grupos de WhatsApp',
  'Boletim e frequência no portal do responsável',
  'Um link próprio: eduonway.com/c/sua-escola',
  'Aviso de reunião, evento e ocorrência na hora certa',
];

const ANTES = [
  'Diário no papel, notas espalhadas e planilhas soltas',
  'Horas montando plano de aula e prova do zero',
  'Comunicação com os pais perdida em grupos de WhatsApp',
  'Boletim e relatórios feitos na mão, um a um',
  'Mensalidade controlada no caderno e no improviso',
  'Sem saber quais alunos estão ficando para trás',
  'Cada professor com seu material, nada se reaproveita',
  'Recado importante que some no meio do grupo',
];
const DEPOIS = [
  'Turmas, diário, chamada, notas e boletim num lugar só',
  'O WayOn cria plano, atividade e correção em segundos',
  'Comunicação organizada e mural para os responsáveis',
  'Relatórios e PDFs prontos, no padrão da sua escola',
  'Mensalidades e cobranças controladas por aluno',
  'Alerta de alunos em risco e de turmas sem aluno',
  'Banco coletivo: reaproveite atividades entre escolas',
  'Mural com stories que a família realmente acompanha',
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
      <WayonChat />

      <style>{`
        @keyframes eow-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes eow-float2 { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(12px) rotate(8deg)} }
        .eow-a{animation:eow-float 6s ease-in-out infinite}
        .eow-b{animation:eow-float2 9s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){.eow-a,.eow-b{animation:none}}
      `}</style>

      {/* barra de anúncio */}
      <div className="bg-primary px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
        ✨ Conheça o WayOn, o agente que planeja, corrige e organiza com você.
      </div>

      {/* cabeçalho */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <LogoMark size={32} />
            <span className="text-lg font-bold tracking-tight">
              Edu <span className="text-primary">On Way</span>
            </span>
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
        </div>
      </header>

      <main>
        {/* hero (full-width) */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/10 to-background">
          <Star className="eow-a pointer-events-none absolute left-[6%] top-16 h-6 w-6 text-primary/30" />
          <Zap className="eow-b pointer-events-none absolute right-[10%] top-24 h-7 w-7 text-amber-400/50" />
          <Sparkles className="eow-a pointer-events-none absolute bottom-12 left-[14%] h-5 w-5 text-primary/30" />
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                Uma parceria para a sua escola crescer
              </span>
              <h1 className="mt-5 text-pretty text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Ensine com inteligência.
                <br />
                <span className="text-primary">Do plano de aula ao boletim.</span>
              </h1>
              <p className="mt-5 max-w-md text-balance text-muted-foreground">
                A plataforma completa para professores e escolas. O <WayOn /> planeja, corrige e
                organiza ao seu lado, e a família acompanha tudo de perto, num só lugar.
              </p>
              <AudienceButtons variant="surface" />
            </Reveal>

            <Reveal delay={120} className="relative">
              <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
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
                    <div key={c.rotulo} className="rounded-xl border border-border bg-background/60 p-3">
                      <div className="text-xl font-semibold">{c.valor}</div>
                      <div className="text-[11px] text-muted-foreground">{c.rotulo}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -right-3 -top-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
                <CalendarDays className="h-4 w-4 text-primary" />
                Reunião de pais · 19h
              </div>
              <div className="absolute -bottom-3 -left-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
                <Sparkles className="h-4 w-4 text-primary" />
                Atividade feita pelo WayOn
              </div>
            </Reveal>
          </div>
        </section>

        {/* faixa de confiança / selos (estilo Principia: prova rápida) */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Dados seguros e protegidos</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Login com 2 etapas (2FA)</span>
            <span className="inline-flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-primary" /> Conformidade com a LGPD</span>
            <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" /> IA que aprende com o professor</span>
            <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> No ar em semanas</span>
          </div>
        </section>

        {/* números (full-width, banda escura da marca, no estilo "conquistou o Brasil") */}
        <section className="relative overflow-hidden bg-[#13152E] text-white">
          <Star className="eow-b pointer-events-none absolute right-[8%] top-10 h-6 w-6 text-amber-400/40" />
          <Sparkles className="eow-a pointer-events-none absolute bottom-10 right-[20%] h-5 w-5 text-white/20" />
          <div className="mx-auto max-w-4xl px-6 py-16 text-center">
            <Reveal>
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                Feito para a escola toda crescer.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-white/70">
                Uma plataforma só, do planejamento à comunicação com a família.
              </p>
              <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
                {NUMEROS.map((x) => (
                  <div key={x.l}>
                    <div className="text-3xl font-bold text-primary sm:text-4xl">{x.n}</div>
                    <div className="mt-1 text-sm text-white/70">{x.l}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* para cada público (full-width) */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold text-primary">Para a escola toda</span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Cada pessoa da escola no seu lugar.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Alunos, professores, gestores e famílias, cada um com a visão que precisa.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {AUDIENCIAS.map((d, i) => (
                <Reveal key={d.titulo} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <d.icon className="h-5 w-5" />
                    </span>
                    <div className="mt-4 font-semibold">{d.titulo}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{d.texto}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* módulos (full-width, fundo alternado) */}
        <section id="modulos" className="border-b border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold text-primary">A plataforma</span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Uma plataforma, vários módulos.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Do planejamento à comunicação com os pais, tudo integrado e com o WayOn acelerando
                cada etapa.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {MODULOS.map((d, i) => (
                <Reveal key={d.titulo} delay={(i % 4) * 80}>
                  <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <d.icon className="h-5 w-5" />
                    </span>
                    <div className="mt-4 font-semibold">{d.titulo}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{d.texto}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* família e escola (full-width, foto + lista) */}
        <section id="familia" className="border-b border-border">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-20 md:grid-cols-2">
            <Reveal className="order-2 md:order-1">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-xl">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                    <Bell className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">Mural da escola</span>
                </div>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="rounded-lg border border-border p-3">
                    <div className="font-medium">Reunião de pais</div>
                    <div className="text-[11px] text-muted-foreground">Quinta, 19h · presencial</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="font-medium">Boletim do 2º bimestre</div>
                    <div className="text-[11px] text-muted-foreground">Já disponível no portal</div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-primary">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-[11px] font-medium">3 novos comunicados</span>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={120} className="order-1 md:order-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <HeartHandshake className="h-3.5 w-3.5" />
                Família por perto
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                A escola conectada com a família, em tempo real.
              </h2>
              <p className="mt-2 max-w-md text-muted-foreground">
                Pais e responsáveis acompanham notas, frequência e recados sem precisar de grupo de
                WhatsApp. Cada escola com o seu canal, a sua cara.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {FAMILIA.map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* antes e depois (full-width) */}
        <section className="border-b border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Menos correria, mais tempo para ensinar.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Veja o que muda na rotina quando a escola inteira vive num lugar só.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-3xl border border-border bg-card p-8">
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
              </Reveal>
              <Reveal delay={120}>
                <div className="h-full rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
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
              </Reveal>
            </div>
          </div>
        </section>

        {/* inteligência artificial (full-width, destaque estilo Principia) */}
        <section id="ia" className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Conheça o WayOn
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Inteligência artificial que ensina junto
              </h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                O WayOn planeja, cria, corrige e aprende com o seu jeito de ensinar. Você no comando,
                a IA tirando o trabalho repetitivo do caminho.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Sparkles, t: 'Plano de aula em minutos', d: 'Descreva o tema e receba um plano pronto para ajustar, alinhado à BNCC.' },
                { icon: ClipboardCheck, t: 'Atividades e provas', d: 'Gere exercícios, provas e trabalhos por matéria e faixa etária num clique.' },
                { icon: BarChart3, t: 'Correção e feedback', d: 'A IA ajuda a corrigir e a devolver retorno útil para cada aluno, mais rápido.' },
                { icon: Layers, t: 'Aprende com você', d: 'Quanto mais você usa e avalia, mais o conteúdo fica com a sua cara. É o seu diferencial.' },
                { icon: MessageSquare, t: 'Comunicação pronta', d: 'Rascunhos de comunicados e mensagens para a família, no tom certo.' },
                { icon: ShieldCheck, t: 'Sempre com você no comando', d: 'Nada é publicado sozinho. O professor revisa e aprova antes de tudo.' },
              ].map((f) => (
                <Reveal key={f.t}>
                  <div className="h-full rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{f.t}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* como funciona (full-width) */}
        <section id="como-funciona" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Como funciona</h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Do cadastro ao dia a dia em três passos.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {PASSOS.map((p, i) => (
                <Reveal key={p.n} delay={i * 100}>
                  <div className="h-full rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {p.n}
                    </span>
                    <div className="mt-4 font-semibold">{p.titulo}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.texto}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* diferenciais (full-width) */}
        <section id="diferenciais" className="border-b border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Por que o Edu On Way</h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Os diferenciais que aparecem na rotina, não só no papel.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {DIFERENCIAIS.map((d, i) => (
                <Reveal key={d.titulo} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <d.icon className="h-5 w-5" />
                    </span>
                    <div className="mt-4 font-semibold">{d.titulo}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{d.texto}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* para quem (full-width, com foto) */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="grid gap-6 md:grid-cols-2">
              <Reveal>
                <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card transition-colors hover:border-primary/40">
                  <div className="flex flex-1 flex-col p-8">
                    <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" />
                    </span>
                    <h3 className="text-xl font-bold">Para professores</h3>
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
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card transition-colors hover:border-primary/40">
                  <div className="flex flex-1 flex-col p-8">
                    <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <School className="h-5 w-5" />
                    </span>
                    <h3 className="text-xl font-bold">Para escolas</h3>
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
                        Falar com um consultor
                      </Button>
                    </a>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* planos (full-width) */}
        <section id="planos" className="border-b border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Planos para cada momento
              </h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Comece com 7 dias grátis e evolua quando precisar.
              </p>
            </Reveal>
            <div className="mt-10">
              <PricingCards />
            </div>
          </div>
        </section>

        {/* faq (full-width) */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <Reveal className="text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Perguntas frequentes</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ainda com dúvida? Toque no WayOn no canto da tela.
              </p>
            </Reveal>
            <Reveal delay={100} className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
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
            </Reveal>
          </div>
        </section>

        {/* cta final (full-width) */}
        <section className="bg-primary text-white">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-20">
            <Reveal>
              <h2 className="text-2xl font-bold sm:text-3xl">Vamos crescer juntos.</h2>
              <p className="mx-auto mt-2 max-w-md text-white/80">
                Crie sua conta em minutos ou leve o Edu On Way para a sua escola.
              </p>
              <AudienceButtons />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-center gap-4 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
            <a href="/" className="flex items-center gap-2">
              <LogoMark size={28} />
              <span className="font-bold tracking-tight text-foreground">Edu On Way</span>
            </a>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="/termos" className="hover:text-foreground">
                Termos de Uso
              </a>
              <a href="/privacidade" className="hover:text-foreground">
                Política de Privacidade
              </a>
              <a href="mailto:contato@onwaytech.com.br" className="hover:text-foreground">
                Contato
              </a>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">© 2026 Edu On Way</p>
        </div>
      </footer>
    </div>
  );
}
