import { SubmitButton } from '@/components/submit-button';
import { listClasses, listStudents, listSubjects } from '@on-education/module-nucleo';
import { listAttendance } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { inicioPeriodo, type Periodo } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { recordAttendanceAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Faltas · Edu On Way' };

export default async function FaltasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: Periodo }>;
}) {
  const { periodo = 'mes' } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [todosRegistros, alunos, turmas, disciplinas] = await Promise.all([
    listAttendance(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
    listClasses(client, ctx).catch(() => []),
    listSubjects(client, ctx).catch(() => []),
  ]);
  const alunoNome = new Map(alunos.map((a) => [a.id, a.fullName]));
  const subjNome = new Map(disciplinas.map((s) => [s.id, s.name]));
  const desde = inicioPeriodo(periodo);
  const registros = desde ? todosRegistros.filter((r) => r.date >= desde) : todosRegistros;

  return (
    <>
      <PageHeader
        title="Faltas"
        description="Registre a presença por dia ou por matéria. Para o documento de faltas (PDF), use Relatório de faltas."
      />

      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col gap-1 text-sm">
          Período
          <select name="periodo" defaultValue={periodo} className={fieldClass}>
            <option value="semana">Última semana</option>
            <option value="mes">Último mês</option>
            <option value="tudo">Tudo</option>
          </select>
        </label>
        <SubmitButton type="submit" size="sm" variant="outline">
          Aplicar
        </SubmitButton>
      </form>
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
                    {r.subjectId && (
                      <span className="text-xs"> · {subjNome.get(r.subjectId) ?? 'matéria'}</span>
                    )}
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
            <select name="subjectId" className={fieldClass} defaultValue="">
              <option value="">Sem matéria (dia)</option>
              {disciplinas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input name="date" type="date" required className={fieldClass} />
            <label className="flex items-center gap-2 text-sm">
              <input name="present" type="checkbox" defaultChecked />
              Presente
            </label>
            <SubmitButton type="submit" size="sm">
              Registrar
            </SubmitButton>
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
