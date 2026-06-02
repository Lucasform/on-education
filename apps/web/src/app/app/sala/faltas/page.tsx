import { listClasses, listStudents } from '@on-education/module-nucleo';
import { listAttendance } from '@on-education/module-sala-de-aula';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { recordAttendanceAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Faltas · On Way Education' };

export default async function FaltasPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [registros, alunos, turmas] = await Promise.all([
    listAttendance(client, ctx),
    listStudents(client, ctx),
    listClasses(client, ctx),
  ]);
  const alunoNome = new Map(alunos.map((a) => [a.id, a.fullName]));

  return (
    <>
      <PageHeader title="Faltas" description="Registre a presença dos alunos por dia." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Registros ({registros.length})</h2>
          {registros.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {registros.map((r) => (
                <li key={r.id} className="flex justify-between gap-2">
                  <span>
                    {alunoNome.get(r.studentId) ?? 'Aluno'} · {r.date}
                  </span>
                  <span className={r.present ? 'text-emerald-500' : 'text-red-500'}>
                    {r.present ? 'presente' : 'falta'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Registrar presença</h2>
          <form action={recordAttendanceAction} className="flex flex-col gap-2">
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
            <select name="classId" required className={fieldClass} defaultValue="">
              <option value="" disabled>
                Selecione a turma
              </option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input name="date" type="date" required className={fieldClass} />
            <label className="flex items-center gap-2 text-sm">
              <input name="present" type="checkbox" defaultChecked />
              Presente
            </label>
            <Button type="submit" size="sm">
              Registrar
            </Button>
          </form>
          {(alunos.length === 0 || turmas.length === 0) && (
            <p className="mt-2 text-xs text-muted-foreground">
              Cadastre turmas e alunos antes de registrar presença.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
