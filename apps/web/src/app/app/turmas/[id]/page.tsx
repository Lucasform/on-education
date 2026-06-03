import {
  getClass,
  listClassSubjects,
  listStudents,
  listSubjects,
} from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  linkClassSubjectAction,
  unlinkClassSubjectAction,
  updateClassDetailsAction,
} from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Turma · On Way Education' };

export default async function TurmaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const isSchool = ctx.tenantType === 'organization';

  const [turma, alunos, materias, disciplinas] = await Promise.all([
    getClass(client, ctx, id),
    listStudents(client, ctx),
    listClassSubjects(client, ctx, id),
    isSchool ? listSubjects(client, ctx) : Promise.resolve([]),
  ]);
  if (!turma) redirect('/app/turmas');

  const daTurma = alunos.filter((a) => a.classId === id);
  const jaVinculadas = new Set(materias.map((m) => m.subjectId));
  const disponiveis = disciplinas.filter((s) => !jaVinculadas.has(s.id));

  return (
    <>
      <PageHeader title={turma.name} description="Detalhes da turma, alunos e grade de matérias." />
      <Link href="/app/turmas" className="text-sm text-primary underline-offset-4 hover:underline">
        ← Voltar para turmas
      </Link>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{daTurma.length}</div>
          <div className="text-xs text-muted-foreground">Alunos</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{turma.gradeLevel || '—'}</div>
          <div className="text-xs text-muted-foreground">Série/ano</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{turma.ageRange || '—'}</div>
          <div className="text-xs text-muted-foreground">Faixa etária</div>
        </div>
        {isSchool && (
          <div className={cardClass}>
            <div className="text-2xl font-semibold">{materias.length}</div>
            <div className="text-xs text-muted-foreground">Matérias</div>
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Dados da turma</h2>
          <form action={updateClassDetailsAction} className="flex flex-col gap-2">
            <input type="hidden" name="classId" value={turma.id} />
            <label className="flex flex-col gap-1 text-sm">
              Série/ano
              <input
                name="gradeLevel"
                defaultValue={turma.gradeLevel ?? ''}
                placeholder="ex.: 6º ano"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Faixa etária
              <input
                name="ageRange"
                defaultValue={turma.ageRange ?? ''}
                placeholder="ex.: 11-12 anos"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Descrição
              <input
                name="description"
                defaultValue={turma.description ?? ''}
                placeholder="Descrição (opcional)"
                className={fieldClass}
              />
            </label>
            <Button type="submit" size="sm">
              Salvar dados
            </Button>
          </form>
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Alunos da turma ({daTurma.length})</h2>
          {daTurma.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum aluno nesta turma. Defina a turma ao cadastrar o aluno.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
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
      </div>

      {isSchool && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Matérias da turma ({materias.length})</h2>
          {materias.length === 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">Nenhuma matéria vinculada ainda.</p>
          ) : (
            <ul className="mb-3 flex flex-wrap gap-2">
              {materias.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-3 pr-1 text-sm"
                >
                  <span>{m.subjectName ?? 'Matéria'}</span>
                  <form action={unlinkClassSubjectAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="classId" value={turma.id} />
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      message="Remover esta matéria da turma?"
                      className="h-6 px-2 text-xs"
                    >
                      ✕
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {disponiveis.length > 0 ? (
            <form action={linkClassSubjectAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="classId" value={turma.id} />
              <select name="subjectId" required className={fieldClass} defaultValue="">
                <option value="" disabled>
                  Selecione a matéria
                </option>
                {disponiveis.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">
                Adicionar matéria
              </Button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">
              {disciplinas.length === 0
                ? 'Cadastre disciplinas em Escola › Disciplinas para montar a grade.'
                : 'Todas as disciplinas já estão vinculadas a esta turma.'}
            </p>
          )}
        </div>
      )}
    </>
  );
}
