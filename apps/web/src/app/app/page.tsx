import { listDrafts } from '@on-education/module-ia';
import {
  listClasses,
  listGuardians,
  listStudents,
  listSubjects,
  listUpcomingEvents,
} from '@on-education/module-nucleo';
import { listActivities } from '@on-education/module-pedagogico';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  FolderOpen,
  GraduationCap,
  Rocket,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext, getSuperAdminEmail, isImpersonating } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Início · On Way Education' };

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className={`${cardClass} transition-colors hover:border-primary/50`}>
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Link>
  );
}

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
  const [turmas, alunos, atividades, rascunhos, proximosEventos, disciplinas, responsaveis] =
    await Promise.all([
      listClasses(client, ctx),
      listStudents(client, ctx),
      listActivities(client, ctx, {}),
      listDrafts(client, ctx),
      listUpcomingEvents(client, ctx, hoje),
      isSchool ? listSubjects(client, ctx) : Promise.resolve([]),
      isSchool ? listGuardians(client, ctx) : Promise.resolve([]),
    ]);
  const rascunhosPendentes = rascunhos.filter((d) => d.status === 'draft').length;
  const impersonating = await isImpersonating();

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
          { label: 'Convidar professores e equipe', href: '/app/escola/convites', done: false },
        ]
      : []),
    { label: 'Montar o banco de atividades', href: '/app/atividades', done: atividades.length > 0 },
    { label: 'Gerar conteúdo com o EduON', href: '/app/ia', done: rascunhos.length > 0 },
  ];
  const feitos = passos.filter((p) => p.done).length;

  return (
    <>
      <PageHeader
        title={isSchool ? 'Painel da escola' : 'Início'}
        description="Tudo o que você precisa para ensinar, em um só lugar."
      />

      {impersonating && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-500">
          Modo admin ativo. Você está vendo este tenant como super-admin.
        </div>
      )}

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
              className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500 transition-all"
              style={{ width: `${Math.round((feitos / passos.length) * 100)}%` }}
            />
          </div>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {passos.map((p) => (
              <li key={p.label}>
                <Link
                  href={p.href}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent ${
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
