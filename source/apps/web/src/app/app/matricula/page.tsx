import { listClasses, listStudents } from '@on-education/module-nucleo';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createStudentAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Matrícula · Edu On Way' };

export default async function MatriculaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const client = db();
  const [turmas, alunos] = await Promise.all([
    listClasses(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
  ]);
  const semTurma = alunos.filter((a) => !a.classId);
  const porTurma = turmas
    .map((t) => ({ turma: t, alunos: alunos.filter((a) => a.classId === t.id) }))
    .sort((a, b) => a.turma.name.localeCompare(b.turma.name));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Matrícula"
          description="Secretaria: matrícula de alunos por turma e documentos."
        />
        <Link
          href="/app/documentos"
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary/50 hover:bg-accent"
        >
          Gerar documentos
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{alunos.length}</div>
          <div className="text-xs text-muted-foreground">Matriculados</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{turmas.length}</div>
          <div className="text-xs text-muted-foreground">Turmas</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{semTurma.length}</div>
          <div className="text-xs text-muted-foreground">Sem turma</div>
        </div>
      </section>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Nova matrícula</h2>
        <form action={createStudentAction} className="flex flex-wrap items-end gap-2">
          <input name="fullName" required placeholder="Nome do aluno" className={fieldClass} />
          <select name="classId" className={`${fieldClass} sm:w-56`} defaultValue="">
            <option value="">Turma (opcional)</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input name="birthDate" type="date" aria-label="Nascimento" className={fieldClass} />
          <SubmitButton type="submit" size="sm">
            Matricular
          </SubmitButton>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Vincular responsável e mais detalhes no perfil do aluno.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {porTurma.map(({ turma, alunos: daTurma }) => (
          <div key={turma.id} className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">
              {turma.name} ({daTurma.length})
            </h2>
            {daTurma.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma ainda.</p>
            ) : (
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {daTurma.map((a) => (
                  <li key={a.id}>
                    <Link href={`/app/alunos/${a.id}`} className="hover:underline">
                      {a.fullName}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {semTurma.length > 0 && (
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Sem turma ({semTurma.length})</h2>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {semTurma.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/alunos/${a.id}`} className="hover:underline">
                    {a.fullName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
