import { listTeachers, listTeachingAssignments } from '@on-education/module-nucleo';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Membro · Edu On Way' };

const ROLE_LABEL: Record<string, string> = {
  owner: 'Direção (responsável)',
  director: 'Diretor(a)',
  coordinator: 'Coordenação',
  teacher: 'Professor(a)',
  monitor: 'Monitor(a)',
  staff_secretary: 'Secretaria',
  staff_finance: 'Financeiro',
};

export default async function MembroDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const client = db();

  const [membros, vinculos] = await Promise.all([
    listTeachers(client, ctx).catch(() => []),
    listTeachingAssignments(client, ctx).catch(() => []),
  ]);
  const membro = membros.find((m) => m.membershipId === id);
  if (!membro) redirect('/app/escola/quadro');

  const aulas = vinculos.filter((v) => v.membershipId === id);
  const isTeacher = membro.role === 'teacher';

  return (
    <>
      <Link
        href="/app/escola/quadro"
        className="text-xs text-primary underline-offset-4 hover:underline"
      >
        ← Voltar para o quadro
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{membro.fullName || membro.email}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
            {ROLE_LABEL[membro.role] ?? membro.role}
          </span>
          {membro.email}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{aulas.length}</div>
          <div className="text-xs text-muted-foreground">Vínculos de aula</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{new Set(aulas.map((a) => a.classId)).size}</div>
          <div className="text-xs text-muted-foreground">Turmas</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">
            {new Set(aulas.map((a) => a.subjectId)).size}
          </div>
          <div className="text-xs text-muted-foreground">Matérias</div>
        </div>
      </section>

      <div className={cardClass}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Vínculos de aula</h2>
          {isTeacher && (
            <Link
              href="/app/escola/professores"
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              Gerenciar vínculos
            </Link>
          )}
        </div>
        {aulas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isTeacher
              ? 'Nenhuma turma/matéria vinculada ainda.'
              : 'Este membro não leciona (sem vínculos de aula).'}
          </p>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {aulas.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                <span className="font-medium">{a.className ?? 'Turma'}</span>
                <span className="text-muted-foreground">{a.subjectName ?? 'Matéria'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
