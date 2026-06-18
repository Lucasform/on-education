import { listDrafts } from '@on-education/module-ia';
import {
  listAcademicYears,
  listClasses,
  listGuardians,
  listStudents,
  listSubjects,
  listTerms,
  listUpcomingEvents,
  getTenantSettings,
} from '@on-education/module-nucleo';
import { listActivities } from '@on-education/module-pedagogico';
import {
  Cake,
  CalendarDays,
  CheckCircle2,
  Circle,
  FolderOpen,
  GraduationCap,
  Rocket,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { KpiCard as StatCard } from '@/components/kpi-card';
import { MobileLauncher } from '@/components/mobile-launcher';
import { cardClass, PageHeader, tableWrapClass } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext, getSuperAdminEmail } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Início · Edu On Way' };

export default async function OverviewPage() {
  const ctx = await getAuthContext();
  if (!ctx) {
    // Logado mas sem workspace: se for super-admin, vai para o painel; senão, login.
    const admin = await getSuperAdminEmail();
    redirect(admin ? '/admin' : '/login');
  }

  const client = db();
  const isSchool = ctx.tenantType === 'organization';
  const hoje = new Date().toISOString().slice(0, 10);
  const [turmas, alunos, atividades, rascunhos, proximosEventos, disciplinas, responsaveis, anosLetivos, periodos, configuracoes] =
    await Promise.all([
      listClasses(client, ctx).catch(() => []),
      listStudents(client, ctx).catch(() => []),
      listActivities(client, ctx, {}).catch(() => []),
      listDrafts(client, ctx).catch(() => []),
      listUpcomingEvents(client, ctx, hoje).catch(() => []),
      isSchool ? listSubjects(client, ctx).catch(() => []) : Promise.resolve([]),
      isSchool ? listGuardians(client, ctx).catch(() => []) : Promise.resolve([]),
      isSchool ? listAcademicYears(client, ctx).catch(() => []) : Promise.resolve([]),
      isSchool ? listTerms(client, ctx).catch(() => []) : Promise.resolve([]),
      isSchool ? getTenantSettings(client, ctx).catch(() => null) : Promise.resolve(null),
    ]);
  const rascunhosPendentes = rascunhos.filter((d) => d.status === 'draft').length;
  const agenteName = configuracoes?.agentName?.trim() || 'WayOn';

  // Alertas de dados incompletos
  const alertas: { msg: string; href: string }[] = [];
  if (isSchool) {
    const turmasSemAlunos = turmas.filter((t) => !alunos.some((a) => a.classId === t.id));
    if (turmasSemAlunos.length > 0) {
      alertas.push({
        msg: `${turmasSemAlunos.length} turma${turmasSemAlunos.length > 1 ? 's' : ''} sem alunos (${turmasSemAlunos.map((t) => t.name).join(', ')})`,
        href: '/app/turmas',
      });
    }
    const alunosSemTurma = alunos.filter((a) => !a.classId);
    if (alunosSemTurma.length > 0) {
      alertas.push({
        msg: `${alunosSemTurma.length} aluno${alunosSemTurma.length > 1 ? 's' : ''} sem turma definida`,
        href: '/app/alunos',
      });
    }
  }

  // Aniversariantes do mês (inspirado em painéis de gestão escolar, no nosso padrão).
  const mesAtual = hoje.slice(5, 7);
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));
  const aniversariantes = alunos
    .filter((a) => a.birthDate && a.birthDate.slice(5, 7) === mesAtual)
    .map((a) => ({
      id: a.id,
      nome: a.fullName,
      dia: a.birthDate!.slice(8, 10),
      turma: a.classId ? (turmaNome.get(a.classId) ?? '') : '',
    }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
  const diaHoje = hoje.slice(8, 10);
  const aniversariantesHoje = aniversariantes.filter((a) => a.dia === diaHoje);

  // Checklist de onboarding: o usuário vai alimentando o sistema sem ficar travado.
  const passos = [
    { label: 'Criar a primeira turma', href: '/app/turmas', done: turmas.length > 0 },
    { label: 'Cadastrar alunos', href: '/app/alunos', done: alunos.length > 0 },
    ...(isSchool
      ? [
          {
            label: 'Cadastrar disciplinas',
            href: '/app/escola/disciplinas',
            done: disciplinas.length > 0,
          },
          {
            label: 'Cadastrar responsáveis',
            href: '/app/escola/responsaveis',
            done: responsaveis.length > 0,
          },
          {
            label: 'Criar ano letivo',
            href: '/app/escola/ano-letivo',
            done: anosLetivos.length > 0,
          },
          {
            label: 'Definir períodos (bimestres/trimestres)',
            href: '/app/escola/ano-letivo',
            done: periodos.length > 0,
          },
          {
            label: 'Personalizar a escola',
            href: '/app/escola/personalizar',
            done: !!(configuracoes?.logoUrl || configuracoes?.profileName),
          },
          {
            label: 'Convidar professores e equipe',
            href: '/app/escola/convites',
            done: false,
          },
        ]
      : []),
    { label: 'Montar o banco de atividades', href: '/app/atividades', done: atividades.length > 0 },
    { label: `Gerar conteúdo com o ${agenteName}`, href: '/app/ia', done: rascunhos.length > 0 },
  ];
  const feitos = passos.filter((p) => p.done).length;

  return (
    <>
      <PageHeader
        title={isSchool ? 'Painel da escola' : 'Início'}
        description="Tudo o que você precisa para ensinar, em um só lugar."
      />

      {/* Launcher de apps no mobile (sem sidebar): toque no ícone e abra. */}
      <section className="md:hidden">
        <MobileLauncher tenantType={ctx.tenantType} />
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="Turmas" value={turmas.length} href="/app/turmas" />
        <StatCard icon={GraduationCap} label="Alunos" value={alunos.length} href="/app/alunos" />
        <StatCard
          icon={FolderOpen}
          label="Atividades"
          value={atividades.length}
          href="/app/atividades"
        />
        <StatCard
          icon={CalendarDays}
          label="Próximos eventos"
          value={proximosEventos.length}
          href="/app/calendario"
        />
        <StatCard
          icon={Sparkles}
          label="Rascunhos pendentes"
          value={rascunhosPendentes}
          href="/app/ia"
        />
      </section>

      {alertas.length > 0 && (
        <section className="flex flex-col gap-2">
          {alertas.map((a) => (
            <Link
              key={a.href + a.msg}
              href={a.href}
              className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 outline-none transition-colors hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <span>⚠ {a.msg}</span>
              <span className="shrink-0 text-xs opacity-70">Ver →</span>
            </Link>
          ))}
        </section>
      )}

      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Ações rápidas</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '+ Nova turma', href: '/app/turmas' },
            { label: '+ Novo aluno', href: '/app/alunos' },
            { label: 'Fazer chamada', href: '/app/sala/chamada' },
            { label: `Gerar com ${agenteName}`, href: '/app/ia' },
            ...(isSchool
              ? [
                  { label: 'Novo comunicado', href: '/app/comunicados' },
                  { label: 'Relatório de faltas', href: '/app/relatorios/faltas' },
                ]
              : [{ label: 'Banco de atividades', href: '/app/atividades' }]),
          ].map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </section>

      {aniversariantesHoje.length > 0 && (
        <section className={`${cardClass} border-primary/40 bg-primary/5`}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Cake className="h-5 w-5 text-primary" />
            <span className="font-medium">
              🎉 Aniversário hoje:{' '}
              {aniversariantesHoje.map((a, i) => (
                <span key={a.id}>
                  {i > 0 ? ', ' : ''}
                  {a.nome}
                  {a.turma ? ` (${a.turma})` : ''}
                </span>
              ))}
            </span>
          </div>
        </section>
      )}

      {aniversariantes.length > 0 && (
        <section className={cardClass}>
          <div className="mb-3 flex items-center gap-2">
            <Cake className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium">
              Aniversariantes do mês ({aniversariantes.length})
            </h2>
          </div>
          <div className={tableWrapClass}>
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-4 font-medium">Dia</th>
                  <th className="py-1.5 pr-4 font-medium">Aluno</th>
                  <th className="py-1.5 font-medium">Turma</th>
                </tr>
              </thead>
              <tbody>
                {aniversariantes.map((a) => (
                  <tr key={a.id} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 pr-4 font-medium">{a.dia}</td>
                    <td className="py-1.5 pr-4">{a.nome}</td>
                    <td className="py-1.5 text-muted-foreground">{a.turma || 'Sem turma'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {proximosEventos.length > 0 && (
        <section className={cardClass}>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium">Próximos eventos</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {proximosEventos.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3">
                <span className="font-medium">{e.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {e.date.split('-').reverse().join('/')}
                  {e.time ? ` · ${e.time.slice(0, 5)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {feitos < passos.length && (
        <section className={cardClass}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium">Primeiros passos</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {feitos} de {passos.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((feitos / passos.length) * 100)}%` }}
            />
          </div>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {passos.map((p) => (
              <li key={p.label}>
                <Link
                  href={p.href}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                    p.done ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {p.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={p.done ? 'line-through decoration-muted-foreground/40' : ''}>
                    {p.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Preencha no seu ritmo. Você pode deixar itens para depois sem travar o sistema.
          </p>
        </section>
      )}
    </>
  );
}
