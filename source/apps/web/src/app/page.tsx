import { Button } from '@on-education/ui';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
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
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { Fraunces, JetBrains_Mono } from 'next/font/google';

import { AudienceButtons } from '@/components/audience-buttons';
import { GradedWord } from '@/components/graded-word';
import { LandingMobileMenu } from '@/components/landing-mobile-menu';
import { LandingPhoto } from '@/components/landing-photo';
import { LogoMark } from '@/components/logo-mark';
import { PricingCards } from '@/components/pricing-cards';
import { Reveal } from '@/components/reveal';
import { SplashScreen } from '@/components/splash-screen';
import { WayonChat } from '@/components/wayon-chat';

// Tipografia com personalidade: Fraunces (serifa ótica de display) + JetBrains Mono (voz de
// "anotação/sistema"). Corpo herda a sans da marca. Fuga deliberada dos defaults de IA.
const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-mono',
});

const NAV = [
  { label: 'Plataforma', href: '#modulos' },
  { label: 'Família e escola', href: '#familia' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Planos', href: '#planos' },
  { label: 'Para escolas', href: '/signup/escola' },
];

const NUMEROS = [
  { n: '8', l: 'módulos integrados' },
  { n: 'Grátis', l: 'no lançamento, sem cartão' },
  { n: '3', l: 'passos para começar' },
  { n: '100%', l: 'LGPD, dados seguros' },
];

const AUDIENCIAS = [
  { icon: GraduationCap, titulo: 'Para alunos', texto: 'Atividades, notas e materiais num lugar simples de acessar.' },
  { icon: UserRound, titulo: 'Para professores', texto: 'Planeje e corrija em segundos com o WayOn e ganhe tempo.' },
  { icon: School, titulo: 'Para gestores', texto: 'Visão da escola, relatórios e perfis de acesso por função.' },
  { icon: HeartHandshake, titulo: 'Para famílias', texto: 'Acompanham notas, frequência e recados em tempo real.' },
];

const MODULOS = [
  { icon: Sparkles, titulo: 'WayOn, seu agente', texto: 'Planos de aula, atividades, provas e correções em segundos. Você revisa e aprova.' },
  { icon: Users, titulo: 'Turmas e alunos', texto: 'Cadastro, importação em lote por planilha e ficha completa do aluno.' },
  { icon: ClipboardCheck, titulo: 'Diário e boletim', texto: 'Chamada, notas e frequência sem planilha, com boletim no seu padrão.' },
  { icon: FolderOpen, titulo: 'Banco e simulados', texto: 'Atividades reutilizáveis e provas com correção automática.' },
  { icon: MessageSquare, titulo: 'Comunicação com a família', texto: 'Comunicados, mensagens e mural para os pais acompanharem de perto.' },
  { icon: Wallet, titulo: 'Financeiro', texto: 'Mensalidades e cobranças por aluno, com visão clara do que entra.' },
  { icon: School, titulo: 'Secretaria e matrícula', texto: 'Matrícula, responsáveis e documentos da turma organizados num lugar só.' },
  { icon: BarChart3, titulo: 'Relatórios e direção', texto: 'Painel da escola, alunos em risco e documentos em PDF.' },
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
];
const DEPOIS = [
  'Turmas, diário, chamada, notas e boletim num lugar só',
  'O WayOn cria plano, atividade e correção em segundos',
  'Comunicação organizada e mural para os responsáveis',
  'Relatórios e PDFs prontos, no padrão da sua escola',
  'Mensalidades e cobranças controladas por aluno',
  'Alerta de alunos em risco e de turmas sem aluno',
];

const DIFERENCIAIS = [
  { icon: Sparkles, titulo: 'WayOn ao seu lado', texto: 'IA que gera rascunhos de plano, atividade e correção. Você revisa e aprova, sempre no controle.' },
  { icon: Layers, titulo: 'Tudo integrado', texto: 'Do plano de aula ao boletim, sem ficar pulando entre planilhas e aplicativos.' },
  { icon: Palette, titulo: 'A sua marca', texto: 'Logo, cor e um link próprio (eduonway.com/c/sua-escola) para alunos e responsáveis.' },
  { icon: ShieldCheck, titulo: 'Seguro e LGPD', texto: 'Cada escola isolada das demais, com proteção reforçada para os dados de menores.' },
];

const PASSOS = [
  { n: '01', titulo: 'Crie sua conta', texto: 'Professor em um minuto; escola com onboarding guiado e perfis de acesso.' },
  { n: '02', titulo: 'Cadastre turmas e alunos', texto: 'Crie na hora ou importe em lote por planilha (CSV/Excel).' },
  { n: '03', titulo: 'Deixe o WayOn trabalhar', texto: 'Planeje, corrija e acompanhe tudo num só lugar, no seu padrão.' },
];

const FAQ = [
  {
    q: 'Preciso de cartão para começar?',
    a: 'Não. Estamos em lançamento gratuito: você cria a conta e usa o plano escolhido sem pagar nada. Os valores na página são a referência de preço para quando a cobrança começar.',
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

/** Nome do agente de ensino, com o "On" em destaque (amarra com On Way). */
function WayOn() {
  return (
    <span className="font-semibold">
      Way<span className="text-[#8aa2ff]">On</span>
    </span>
  );
}

/** Índice de seção em mono, no estilo de anotação. O número codifica a ordem real da página. */
function Index({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="ff-mono flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
      <span className="text-[#8aa2ff]">{n}</span>
      <span className="h-px w-8 bg-white/15" />
      {children}
    </div>
  );
}

export default function HomePage() {
  return (
    <div
      className={`eow-landing min-h-screen text-white ${display.variable} ${mono.variable}`}
    >
      <SplashScreen />
      <WayonChat />

      <style>{`
        .eow-landing{
          --blue:#2f5bff; --blue-soft:#8aa2ff; --mark:#ff9a2e; --ink:#0a0c1d;
          background-color: var(--ink);
        }
        .ff-display{ font-family: var(--font-display), Georgia, 'Times New Roman', serif; }
        .ff-mono{ font-family: var(--font-mono), ui-monospace, monospace; }
        .eow-atmos{
          background:
            radial-gradient(58% 48% at 82% -4%, rgba(47,91,255,.22), transparent 60%),
            radial-gradient(42% 42% at -6% 22%, rgba(47,91,255,.12), transparent 60%),
            radial-gradient(36% 30% at 50% 108%, rgba(255,154,46,.07), transparent 60%);
        }
        .eow-paper{
          background-image:
            linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 72px 72px;
          -webkit-mask-image: radial-gradient(circle at 50% 18%, #000, transparent 72%);
          mask-image: radial-gradient(circle at 50% 18%, #000, transparent 72%);
        }
        @keyframes eow-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes eow-float2 { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(10px) rotate(7deg)} }
        .eow-a{animation:eow-float 7s ease-in-out infinite}
        .eow-b{animation:eow-float2 9s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){.eow-a,.eow-b{animation:none}}
      `}</style>

      {/* anúncio */}
      <div className="ff-mono border-b border-white/10 bg-[#2f5bff]/10 px-4 py-2 text-center text-[11px] tracking-wide text-white/75">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--mark)] align-middle" />
        Lançamento gratuito · conheça o WayOn, o agente que planeja e corrige com você
      </div>

      {/* cabeçalho */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0c1d]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="text-lg font-bold tracking-tight">
              Edu <span className="text-[#8aa2ff]">On Way</span>
            </span>
          </a>
          <nav className="ff-mono hidden items-center gap-8 text-[12px] uppercase tracking-[0.12em] text-white/55 md:flex">
            {NAV.map((n) => (
              <a key={n.label} href={n.href} className="transition-colors hover:text-white">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a href="/login" className="hidden sm:block">
              <Button size="sm" className="rounded-full bg-[#2f5bff] px-5 text-white hover:bg-[#2f5bff]/90">
                Entrar
              </Button>
            </a>
            <LandingMobileMenu items={NAV} />
          </div>
        </div>
      </header>

      <main>
        {/* HERO ─ assinatura tipográfica + painel do produto */}
        <section className="eow-atmos relative overflow-hidden">
          <div className="eow-paper pointer-events-none absolute inset-0" />
          <Sparkles className="eow-a pointer-events-none absolute left-[5%] top-28 h-5 w-5 text-[#8aa2ff]/40" />
          <span className="eow-b pointer-events-none absolute right-[8%] top-40 h-2.5 w-2.5 rounded-full bg-[var(--mark)]/60" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
            <Reveal>
              <Index n="01">Plataforma de ensino · 2026</Index>
              <h1 className="ff-display mt-6 text-[2.6rem] font-medium leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-[4.4rem]">
                Ensine com
                <br />
                inteligência, do
                <br />
                plano de aula ao{' '}
                <span className="italic">
                  <GradedWord>boletim</GradedWord>
                </span>
                .
              </h1>
              <p className="mt-7 max-w-md text-[15px] leading-relaxed text-white/65">
                A plataforma completa para professores e escolas. O <WayOn /> planeja, corrige e
                organiza ao seu lado, e a família acompanha tudo de perto, num só lugar.
              </p>
              <div className="mt-8">
                <AudienceButtons variant="surface" />
              </div>
              <div className="ff-mono mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-wider text-white/40">
                <span>Sem cartão</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>LGPD</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>No ar em semanas</span>
              </div>
            </Reveal>

            <Reveal delay={140} className="relative">
              {/* "Documento vivo": o boletim/painel que o WayOn ajuda a montar */}
              <div className="relative rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f5bff] text-white">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold">Painel da turma · 9º A</span>
                  </div>
                  <span className="ff-mono text-[10px] uppercase tracking-widest text-white/40">ao vivo</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { r: 'Plano de aula', v: 'WayOn', mark: true },
                    { r: 'Frequência', v: '94%' },
                    { r: 'Média geral', v: '8,3' },
                    { r: 'Simulados', v: '12' },
                  ].map((c) => (
                    <div key={c.r} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className={`ff-display text-2xl font-semibold ${c.mark ? 'text-[var(--mark)]' : 'text-white'}`}>
                        {c.v}
                      </div>
                      <div className="ff-mono mt-0.5 text-[10px] uppercase tracking-wider text-white/45">{c.r}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#2f5bff]/30 bg-[#2f5bff]/10 p-3 text-xs text-[#bcc8ff]">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  Atividade de frações gerada e corrigida pelo WayOn
                </div>
              </div>
              <div className="absolute -right-3 -top-4 flex items-center gap-2 rounded-xl border border-white/12 bg-[#0a0c1d]/80 px-3 py-2 text-xs shadow-lg backdrop-blur">
                <Bell className="h-3.5 w-3.5 text-[var(--mark)]" />
                Reunião de pais · 19h
              </div>
            </Reveal>
          </div>
        </section>

        {/* prova rápida */}
        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="ff-mono mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 py-4 text-[11px] uppercase tracking-wider text-white/45">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[#8aa2ff]" /> Dados protegidos</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[#8aa2ff]" /> Login 2FA</span>
            <span className="inline-flex items-center gap-2"><HeartHandshake className="h-3.5 w-3.5 text-[#8aa2ff]" /> Conforme a LGPD</span>
            <span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-[var(--mark)]" /> IA que aprende com o professor</span>
          </div>
        </section>

        {/* NÚMEROS ─ banda tipográfica */}
        <section className="border-b border-white/10">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-6 py-16 sm:py-20 md:grid-cols-4">
            {NUMEROS.map((x, i) => (
              <Reveal key={x.l} delay={i * 80} className="px-2 text-center md:text-left">
                <div className="ff-display text-5xl font-semibold leading-none text-white sm:text-6xl">{x.n}</div>
                <div className="ff-mono mt-3 text-[11px] uppercase leading-snug tracking-wider text-white/45">{x.l}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* PARA CADA PÚBLICO ─ lista editorial */}
        <section className="border-b border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <Reveal>
              <Index n="02">Para a escola toda</Index>
              <h2 className="ff-display mt-5 max-w-2xl text-3xl font-medium leading-tight sm:text-[2.6rem]">
                Cada pessoa da escola no seu lugar.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {AUDIENCIAS.map((d, i) => (
                <Reveal key={d.titulo} delay={i * 70}>
                  <div className="group flex gap-5 border-t border-white/10 pt-5">
                    <span className="ff-mono pt-1 text-[12px] text-white/30">0{i + 1}</span>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <d.icon className="h-5 w-5 text-[#8aa2ff]" />
                        <h3 className="text-lg font-semibold">{d.titulo}</h3>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/55">{d.texto}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* MÓDULOS */}
        <section id="modulos" className="border-b border-white/10 bg-white/[0.015]">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <Reveal>
              <Index n="03">A plataforma</Index>
              <h2 className="ff-display mt-5 max-w-2xl text-3xl font-medium leading-tight sm:text-[2.6rem]">
                Uma plataforma, vários módulos, <span className="italic"><GradedWord variant="circle">tudo</GradedWord></span> integrado.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {MODULOS.map((d, i) => (
                <Reveal key={d.titulo} delay={(i % 4) * 70}>
                  <div className="group h-full bg-[#0a0c1d] p-6 transition-colors hover:bg-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2f5bff]/12 text-[#8aa2ff]">
                        <d.icon className="h-5 w-5" />
                      </span>
                      <span className="ff-mono text-[11px] text-white/25">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="mt-4 font-semibold">{d.titulo}</div>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/55">{d.texto}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAMÍLIA */}
        <section id="familia" className="border-b border-white/10">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:py-24 md:grid-cols-2">
            <Reveal className="relative order-2 md:order-1">
              <div className="aspect-[4/3] overflow-hidden rounded-[1.6rem] border border-white/12 shadow-2xl">
                <LandingPhoto src="/landing/familia.jpg" alt="Família acompanhando a vida escolar" className="object-[center_30%]" />
              </div>
              <div className="absolute -bottom-5 -right-4 w-56 rounded-2xl border border-white/12 bg-[#0a0c1d]/85 p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Bell className="h-4 w-4 text-[var(--mark)]" /> Mural da escola
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#2f5bff]/12 p-2 text-xs text-[#bcc8ff]">
                  <MessageSquare className="h-3.5 w-3.5" /> 3 novos comunicados
                </div>
              </div>
            </Reveal>
            <Reveal delay={120} className="order-1 md:order-2">
              <Index n="04">Família por perto</Index>
              <h2 className="ff-display mt-5 text-3xl font-medium leading-tight sm:text-[2.4rem]">
                A escola conectada com a família, em tempo real.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
                Pais e responsáveis acompanham notas, frequência e recados sem grupo de WhatsApp.
                Cada escola com o seu canal, a sua cara.
              </p>
              <ul className="mt-7 space-y-3.5">
                {FAMILIA.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm text-white/75">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2f5bff]/15 text-[#8aa2ff]">
                      <Check className="h-3 w-3" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ANTES / DEPOIS ─ a transformação */}
        <section className="border-b border-white/10 bg-white/[0.015]">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <Reveal>
              <Index n="05">A virada</Index>
              <h2 className="ff-display mt-5 max-w-2xl text-3xl font-medium leading-tight sm:text-[2.6rem]">
                De improviso para <span className="italic"><GradedWord>método</GradedWord></span>.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <Reveal className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
                <div className="ff-mono text-[11px] uppercase tracking-widest text-white/40">Antes</div>
                <ul className="mt-5 space-y-3">
                  {ANTES.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm text-white/50">
                      <span className="mt-2 h-1 w-3 shrink-0 rounded-full bg-white/20" />
                      <span className="line-through decoration-white/20">{t}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={120} className="rounded-2xl border border-[#2f5bff]/25 bg-[#2f5bff]/[0.06] p-7">
                <div className="ff-mono text-[11px] uppercase tracking-widest text-[#8aa2ff]">Com o Edu On Way</div>
                <ul className="mt-5 space-y-3">
                  {DEPOIS.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm text-white/85">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2f5bff]/20 text-[#8aa2ff]">
                        <Check className="h-3 w-3" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="border-b border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <Reveal>
              <Index n="06">Como funciona</Index>
              <h2 className="ff-display mt-5 max-w-2xl text-3xl font-medium leading-tight sm:text-[2.6rem]">
                Três passos para começar.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {PASSOS.map((p, i) => (
                <Reveal key={p.n} delay={i * 90}>
                  <div className="border-t border-white/10 pt-6">
                    <div className="ff-display text-5xl font-semibold text-white/15">{p.n}</div>
                    <h3 className="mt-3 text-lg font-semibold">{p.titulo}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/55">{p.texto}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* DIFERENCIAIS */}
        <section className="border-b border-white/10 bg-white/[0.015]">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <Reveal>
              <Index n="07">Por que o Edu On Way</Index>
            </Reveal>
            <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {DIFERENCIAIS.map((d, i) => (
                <Reveal key={d.titulo} delay={i * 70}>
                  <div className="flex gap-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2f5bff]/12 text-[#8aa2ff]">
                      <d.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">{d.titulo}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/55">{d.texto}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* PARA QUEM */}
        <section className="border-b border-white/10">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-20 sm:py-24 md:grid-cols-2">
            {[
              {
                icon: UserRound,
                titulo: 'Para professores',
                texto: 'Seu espaço pessoal para organizar turmas e ganhar tempo com o WayOn.',
                itens: ['WayOn: planos, atividades, provas e correção', 'Banco de atividades e portfólio', 'Diário, chamada, notas e boletim', 'Comece grátis, evolua quando quiser'],
                cta: 'Testar grátis',
                href: '/signup',
                primary: true,
              },
              {
                icon: School,
                titulo: 'Para escolas',
                texto: 'Gestão completa, com perfis de acesso e visão de direção.',
                itens: ['Diretor, coordenação, secretaria e professores', 'Turmas, disciplinas, diário e boletim', 'Relatórios de direção, ocorrências e responsáveis', 'Onboarding e suporte dedicado'],
                cta: 'Falar com um consultor',
                href: '/signup/escola',
                primary: false,
              },
            ].map((c, i) => (
              <Reveal key={c.titulo} delay={i * 120}>
                <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-8">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2f5bff]/12 text-[#8aa2ff]">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold">{c.titulo}</h3>
                  <p className="mt-1.5 text-sm text-white/55">{c.texto}</p>
                  <ul className="mt-5 flex-1 space-y-2.5 text-sm text-white/75">
                    {c.itens.map((t) => (
                      <li key={t} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8aa2ff]" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <a href={c.href} className="mt-7">
                    <Button
                      className={`w-full rounded-full ${c.primary ? 'bg-[#2f5bff] text-white hover:bg-[#2f5bff]/90' : 'border border-white/20 bg-transparent text-white hover:bg-white/10'}`}
                    >
                      {c.cta}
                      {c.primary ? <ArrowRight className="ml-1.5 h-4 w-4" /> : <ArrowUpRight className="ml-1.5 h-4 w-4" />}
                    </Button>
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* PLANOS */}
        <section id="planos" className="border-b border-white/10 bg-white/[0.015]">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <Reveal>
              <Index n="08">Planos</Index>
              <h2 className="ff-display mt-5 max-w-2xl text-3xl font-medium leading-tight sm:text-[2.6rem]">
                Comece <span className="italic"><GradedWord>grátis</GradedWord></span>, evolua quando precisar.
              </h2>
            </Reveal>
            <div className="mt-10">
              <PricingCards />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-white/10">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 sm:py-24 md:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <Index n="09">Dúvidas</Index>
              <h2 className="ff-display mt-5 text-3xl font-medium leading-tight sm:text-[2.4rem]">
                Perguntas frequentes.
              </h2>
              <p className="mt-3 text-sm text-white/50">Ainda com dúvida? Toque no WayOn no canto da tela.</p>
            </Reveal>
            <Reveal delay={100} className="divide-y divide-white/10 border-t border-white/10">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-5 [&_summary]:cursor-pointer">
                  <summary className="flex select-none items-center justify-between gap-3 font-medium outline-none marker:content-['']">
                    {f.q}
                    <span className="ff-mono text-white/40 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{f.a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* CTA final */}
        <section className="eow-atmos relative overflow-hidden">
          <div className="eow-paper pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-3xl px-6 py-24 text-center sm:py-28">
            <Reveal>
              <h2 className="ff-display text-4xl font-medium leading-[1.05] sm:text-5xl">
                Todo aprendizado tem um{' '}
                <span className="italic"><GradedWord>caminho</GradedWord></span>.
              </h2>
              <p className="mx-auto mt-5 max-w-md text-[15px] text-white/60">
                Crie sua conta em minutos ou leve o Edu On Way para a sua escola.
              </p>
              <div className="mt-8">
                <AudienceButtons variant="surface" />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center text-sm text-white/45 sm:flex-row sm:justify-between sm:text-left">
          <a href="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-bold tracking-tight text-white">Edu On Way</span>
          </a>
          <div className="ff-mono flex flex-wrap items-center justify-center gap-5 text-[12px] uppercase tracking-wider">
            <a href="/termos" className="hover:text-white">Termos</a>
            <a href="/privacidade" className="hover:text-white">Privacidade</a>
            <a href="mailto:contato@onwaytech.com.br" className="hover:text-white">Contato</a>
          </div>
        </div>
        <p className="ff-mono pb-8 text-center text-[11px] uppercase tracking-widest text-white/25">© 2026 Edu On Way</p>
      </footer>
    </div>
  );
}
