import { listClasses, listStudents } from '@on-education/module-nucleo';
import { listGrades } from '@on-education/module-sala-de-aula';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { recordGradeAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notas · On Education' };

export default async function NotasPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [notas, alunos, turmas] = await Promise.all([
    listGrades(client, ctx),
    listStudents(client, ctx),
    listClasses(client, ctx),
  ]);
  const alunoNome = new Map(alunos.map((a) => [a.id, a.fullName]));

  return (
    <>
      <PageHeader title="Notas" description="Lance as notas das avaliações." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Lançamentos ({notas.length})</h2>
          {notas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma nota lançada ainda.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {notas.map((n) => (
                <li key={n.id} className="flex justify-between gap-2">
                  <span>
                    {alunoNome.get(n.studentId) ?? 'Aluno'} · {n.label}
                  </span>
                  <span className="font-medium text-foreground">{n.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Lançar nota</h2>
          <form action={recordGradeAction} className="flex flex-col gap-2">
            <select name="studentId" required className={fieldClass} defaultValue="">
              <option value="" disabled>
                Selecione o aluno
              </option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
            <select name="classId" className={fieldClass} defaultValue="">
              <option value="">Sem turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              name="label"
              required
              placeholder="Avaliação (ex.: Prova 1)"
              className={fieldClass}
            />
            <input
              name="value"
              type="number"
              step="0.1"
              min="0"
              max="100"
              required
              placeholder="Nota"
              className={fieldClass}
            />
            <Button type="submit" size="sm">
              Lançar nota
            </Button>
          </form>
          {alunos.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Cadastre alunos antes de lançar notas.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
