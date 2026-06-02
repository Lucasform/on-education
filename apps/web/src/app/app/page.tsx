import { listDrafts } from '@on-education/module-ia';
import { listClasses, listStudents, listUpcomingEvents } from '@on-education/module-nucleo';
import { listActivities } from '@on-education/module-pedagogico';
import {
  BarChart3,
  CalendarDays,
  FolderOpen,
  GraduationCap,
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
  const [turmas, alunos, atividades, rascunhos, proximosEventos] = await Promise.all([
    listClasses(client, ctx),
    listStudents(client, ctx),
    listActivities(client, ctx, {}),
    listDrafts(client, ctx),
    listUpcomingEvents(client, ctx, hoje),
  ]);
  const rascunhosPendentes = rascunhos.filter((d) => d.status === 'draft').length;
  const impersonating = await isImpersonating();

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

      <section className={cardClass}>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">Comece por aqui</h2>
        </div>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <li>
            <Link className="text-primary underline-offset-4 hover:underline" href="/app/ia">
              Gerar um plano de aula com IA
            </Link>
          </li>
          <li>
            <Link className="text-primary underline-offset-4 hover:underline" href="/app/turmas">
              Criar sua primeira turma
            </Link>
          </li>
          <li>
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href="/app/atividades"
            >
              Montar o banco de atividades
            </Link>
          </li>
          {isSchool && (
            <li>
              <Link
                className="text-primary underline-offset-4 hover:underline"
                href="/app/escola/convites"
              >
                Convidar professores e equipe
              </Link>
            </li>
          )}
        </ul>
      </section>
    </>
  );
}
