import { listClasses, listStudents } from '@on-education/module-nucleo';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BulkAddRows } from '@/components/bulk-add-rows';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { enrollStudentsBulkAction } from '../actions';

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
          className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary/50 hover:bg-accent"
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

      {/* Matrícula de um aluno = onboarding completo (sem form reduzido). */}
      <div className={`${cardClass} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <h2 className="text-sm font-medium">Matricular um aluno</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastro completo: dados civis, endereço, saúde e responsável. Gera o contrato ao final.
          </p>
        </div>
        <Link
          href="/app/matricula/nova"
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          + Matrícula completa
        </Link>
      </div>

      {/* Vinculação em lote: cria os alunos e associa à turma. Dados completos pela ficha individual. */}
      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Vincular alunos a uma turma em lote</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Crie vários alunos de uma vez e já os coloque na turma certa. Nome e data de nascimento
          são suficientes aqui; dados completos, responsáveis e contrato ficam para a ficha
          individual de cada aluno.
        </p>
        <form action={enrollStudentsBulkAction} className="flex flex-col gap-3">
          <select name="classId" className={fieldClass} defaultValue="">
            <option value="">Sem turma</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <BulkAddRows
            fields={[
              { name: 'fullName', placeholder: 'Nome completo do aluno', className: 'flex-[3]' },
              { name: 'birthDate', placeholder: 'Nascimento', type: 'date' },
            ]}
          />
          <SubmitButton type="submit" size="sm" variant="outline">
            Adicionar à turma
          </SubmitButton>
        </form>
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
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <Link href={`/app/alunos/${a.id}`} className="hover:underline">
                      {a.fullName}
                    </Link>
                    <span className="flex shrink-0 gap-2 text-xs">
                      <Link
                        href={`/app/matricula/${a.id}/ficha`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Ficha
                      </Link>
                      <Link
                        href={`/app/matricula/${a.id}/contrato`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Contrato
                      </Link>
                    </span>
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
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <Link href={`/app/alunos/${a.id}`} className="hover:underline">
                    {a.fullName}
                  </Link>
                  <span className="flex shrink-0 gap-2 text-xs">
                    <Link
                      href={`/app/matricula/${a.id}/ficha`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Ficha
                    </Link>
                    <Link
                      href={`/app/matricula/${a.id}/contrato`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Contrato
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
