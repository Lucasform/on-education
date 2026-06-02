import { Button } from '@on-education/ui';
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  Sparkles,
  Users,
} from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';

const NAV = [
  { label: 'Recursos', href: '#recursos' },
  { label: 'Planos', href: '#planos' },
  { label: 'Para professores', href: '/signup' },
  { label: 'Para escolas', href: '/signup/escola' },
];

const PLANOS = [
  {
    nome: 'Professor Grátis',
    preco: 'R$ 0',
    periodo: 'para sempre',
    resumo: 'Para começar a planejar e organizar suas turmas.',
    recursos: [
      'Turmas e alunos',
      'IA pedagógica (cota mensal)',
      'Banco de atividades e portfólio',
      'Diário, chamada e boletim',
    ],
    cta: 'Começar grátis',
    href: '/signup',
    destaque: false,
  },
  {
    nome: 'Professor Pro',
    preco: 'R$ 29',
    periodo: 'por mês',
    resumo: 'Para quem quer IA sem limites e mais produtividade.',
    recursos: [
      'Tudo do plano Grátis',
      'IA pedagógica ampliada',
      'Simulados com correção automática',
      'Comunicados e calendário',
      'Sem marca On Education',
    ],
    cta: 'Assinar o Pro',
    href: '/signup',
    destaque: true,
  },
  {
    nome: 'Escola',
    preco: 'Sob consulta',
    periodo: 'plano institucional',
    resumo: 'Para colégios, com gestão e vários perfis de acesso.',
    recursos: [
      'Diretor, coordenação e professores',
      'Unidades, ano letivo e disciplinas',
      'Relatórios de direção',
      'Responsáveis e comunicação',
      'Onboarding e suporte',
    ],
    cta: 'Falar com a gente',
    href: '/signup/escola',
    destaque: false,
  },
];

const DESTAQUES = [
  {
    icon: Sparkles,
    titulo: 'IA pedagógica',
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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* barra de anúncio */}
      <div className="bg-gradient-to-r from-primary to-fuchsia-600 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
        ✨ On Education: ensino com inteligência artificial para professores e escolas.
      </div>

      {/* cabeçalho */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">On Education</span>
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
          <a href="/login">
            <Button size="sm" className="rounded-full px-5">
              Entrar
            </Button>
          </a>
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
                Plataforma educacional com IA
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Sua escola digital,
                <br />
                <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                  do plano de aula ao boletim.
                </span>
              </h1>
              <p className="mt-5 max-w-md text-balance text-muted-foreground">
                Planeje com IA, gerencie turmas e alunos, lance notas e acompanhe o desempenho. Tudo
                num só lugar, para o professor autônomo e para a escola.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="/signup">
                  <Button size="lg" className="rounded-full px-7">
                    Começar grátis
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
                    { rotulo: 'Plano de aula', valor: 'IA ✓' },
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
                Atividade gerada por IA
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
              Comece grátis e evolua quando precisar. Sem fidelidade.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PLANOS.map((p) => (
              <div
                key={p.nome}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  p.destaque
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border bg-card'
                }`}
              >
                {p.destaque && (
                  <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-3 py-0.5 text-xs font-medium text-white">
                    Mais popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{p.nome}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.resumo}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{p.preco}</span>
                  <span className="text-sm text-muted-foreground">/ {p.periodo}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {p.recursos.map((r) => (
                    <li key={r} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <a href={p.href} className="mt-6">
                  <Button
                    className="w-full rounded-full"
                    variant={p.destaque ? 'default' : 'outline'}
                  >
                    {p.cta}
                  </Button>
                </a>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Valores ilustrativos para validação. Ajuste fino dos preços em breve.
          </p>
        </section>

        {/* cta final */}
        <section className="mt-16 overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-fuchsia-600 px-8 py-12 text-center text-white sm:py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Comece hoje, sem complicação.</h2>
          <p className="mx-auto mt-2 max-w-md text-white/80">
            Crie sua conta de professor em minutos ou leve o On Education para a sua escola.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/signup">
              <Button
                size="lg"
                className="rounded-full bg-white px-7 text-primary hover:bg-white/90"
              >
                Criar conta grátis
              </Button>
            </a>
            <a href="/signup/escola">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-transparent px-7 text-white hover:bg-white/10"
              >
                Falar como escola
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-border px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <span>© 2026 On Education</span>
        <div className="flex items-center gap-5">
          <a href="/login" className="hover:text-foreground">
            Entrar
          </a>
          <a href="/admin" className="hover:text-foreground">
            Painel admin
          </a>
        </div>
      </footer>
    </div>
  );
}
