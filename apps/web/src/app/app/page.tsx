import { listDrafts } from '@on-education/module-ia';
import { listClasses, listStudents } from '@on-education/module-nucleo';
import { listActivities } from '@on-education/module-pedagogico';
import {
  BarChart3,
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
import { getAuthContext, isImpersonating } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Início · On Education' };

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
  if (!ctx) redirect('/login');

  const client = db();
  const isSchool = ctx.tenantType === 'organization';
  const [turmas, alunos, atividades, rascunhos] = await Promise.all([
    listClasses(client, ctx),
    listStudents(client, ctx),
    listActivities(client, ctx, {}),
    listDrafts(client, ctx),
  ]);
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

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Users} label="Turmas" value={turmas.length} href="/app/turmas" />
        <StatCard icon={GraduationCap} label="Alunos" value={alunos.length} href="/app/alunos" />
        <StatCard
          icon={FolderOpen}
          label="Atividades"
          value={atividades.length}
          href="/app/atividades"
        />
        <StatCard icon={Sparkles} label="Rascunhos de IA" value={rascunhos.length} href="/app/ia" />
      </section>

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
